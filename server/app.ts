import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import JSZip from 'jszip';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { clinicStore } from './store.ts';
import type { CallChatMessage, UserRole } from '../src/types/telehealth.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'medlink-dev-jwt-secret-change-in-prod';
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set; using an insecure development fallback.');
}

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
  name: string;
}

interface AuthedRequest extends Request {
  auth?: JwtPayload;
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.auth = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

function requireRole(role: UserRole) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth || req.auth.role !== role) {
      res.status(403).json({ error: `Access restricted to ${role} accounts` });
      return;
    }
    next();
  };
}

interface RoomParticipant {
  ws: WebSocket;
  userId: string;
  name: string;
  role: UserRole;
}

const activeRooms = new Map<string, Map<string, RoomParticipant>>();
const roomChatHistory = new Map<string, CallChatMessage[]>();

function walkDirectory(dir: string, baseDir: string, out: { relativePath: string; content: string }[]) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'dist') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(fullPath, baseDir, out);
    } else {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath, 'utf-8');
      out.push({ relativePath, content });
    }
  }
}

/** Lets async route handlers reject into Express' error middleware (Express 4 doesn't do this itself). */
function wrapAsyncRoutes(app: express.Express): void {
  for (const method of ['get', 'post', 'patch', 'put', 'delete'] as const) {
    const original = app[method].bind(app) as (...args: unknown[]) => unknown;
    (app as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
      if (method === 'get' && args.length === 1) return original(...args);
      const wrapped = args.map((arg) =>
        typeof arg === 'function' && arg.length < 4
          ? (req: Request, res: Response, next: NextFunction) =>
              Promise.resolve((arg as (...a: unknown[]) => unknown)(req, res, next)).catch(next)
          : arg
      );
      return original(...wrapped);
    };
  }
}

/**
 * Builds the MedLink API (Express) plus the /ws WebSocket signaling server.
 * Used by the local dev entry (server.ts) and the Netlify Server entry (netlify/server/index.ts).
 */
export function createMedlinkServer(): { app: express.Express; server: http.Server } {
  const app = express();
  wrapAsyncRoutes(app);
  app.use(express.json({ limit: '15mb' }));

  // Health check for Cloud Run
  app.get('/api/health', async (_req, res) => {
    res.json({ status: 'ok', service: 'medlink-telehealth' });
  });

  // --- Auth Routes ---
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const user = await clinicStore.findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });
    res.json({
      token,
      user: clinicStore.toPublicUser(user),
    });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, phone } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    if (await clinicStore.findUserByEmail(email)) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    const user = await clinicStore.createPatientUser({ name, email, password, phone });
    const token = signToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });
    res.status(201).json({ token, user });
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthedRequest, res) => {
    const user = await clinicStore.findUserById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: clinicStore.toPublicUser(user) });
  });

  // --- Public / Patient Doctor Directory ---
  app.get('/api/doctors', async (_req, res) => {
    res.json({ doctors: await clinicStore.listDoctors(false) });
  });

  // --- Admin Routes ---
  app.get('/api/admin/overview', requireAuth, requireRole('admin'), async (_req, res) => {
    const liveCallCount = Array.from(activeRooms.values()).filter((r) => r.size > 0).length;
    res.json({
      stats: await clinicStore.getAdminStats(liveCallCount),
      doctors: await clinicStore.listDoctors(true),
      appointments: await clinicStore.listAppointmentsForUser({ id: 'admin', role: 'admin' }),
    });
  });

  app.post('/api/admin/doctors', requireAuth, requireRole('admin'), async (req, res) => {
    const {
      name,
      email,
      password,
      phone,
      specialty,
      licenseNumber,
      consultationFee,
      experienceYears,
      languages,
      clinicLocation,
      bio,
      availableSlots,
    } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      specialty?: string;
      licenseNumber?: string;
      consultationFee?: number;
      experienceYears?: number;
      languages?: string[];
      clinicLocation?: string;
      bio?: string;
      availableSlots?: string[];
    };

    if (!name || !email || !password || !specialty || !licenseNumber) {
      res.status(400).json({
        error: 'Name, email, password, specialty, and license number are required',
      });
      return;
    }
    if (await clinicStore.findUserByEmail(email)) {
      res.status(409).json({ error: 'A user with this email is already registered' });
      return;
    }
    const fee = Number(consultationFee);
    if (!Number.isFinite(fee) || fee <= 0) {
      res.status(400).json({ error: 'Consultation fee must be greater than zero' });
      return;
    }

    const doctor = await clinicStore.registerDoctor({
      name,
      email,
      password,
      phone,
      specialty,
      licenseNumber,
      consultationFee: fee,
      experienceYears: Number(experienceYears) || 5,
      languages: Array.isArray(languages) ? languages : ['English'],
      clinicLocation: clinicLocation || 'MedLink Virtual Clinic',
      bio: bio || `Board-certified specialist in ${specialty}.`,
      availableSlots: Array.isArray(availableSlots)
        ? availableSlots
        : ['09:30', '11:00', '14:30', '16:00'],
    });

    res.status(201).json({ doctor });
  });

  app.patch('/api/admin/doctors/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const id = String(req.params.id);
    const { consultationFee, isActive, availableSlots } = req.body as {
      consultationFee?: number;
      isActive?: boolean;
      availableSlots?: string[];
    };
    const updated = await clinicStore.updateDoctor(id, {
      consultationFee,
      isActive,
      availableSlots,
    });
    if (!updated) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }
    res.json({ doctor: updated });
  });

  // --- Appointments & Consultation Fee Payments ---
  app.get('/api/appointments', requireAuth, async (req: AuthedRequest, res) => {
    const appointments = await clinicStore.listAppointmentsForUser({
      id: req.auth!.userId,
      role: req.auth!.role,
    });
    res.json({ appointments });
  });

  app.post('/api/appointments', requireAuth, requireRole('patient'), async (req: AuthedRequest, res) => {
    const { doctorId, scheduledDate, scheduledTime, reason } = req.body as {
      doctorId?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      reason?: string;
    };

    if (!doctorId || !scheduledDate || !scheduledTime || !reason) {
      res.status(400).json({
        error: 'Doctor, date, time slot, and reason for visit are required',
      });
      return;
    }

    const patient = await clinicStore.findUserById(req.auth!.userId);
    const doctor = await clinicStore.findDoctorById(doctorId);
    if (!patient || !doctor || !doctor.isActive) {
      res.status(404).json({ error: 'Selected doctor is not available' });
      return;
    }

    const appointment = await clinicStore.createAppointment({
      patient,
      doctor,
      scheduledDate,
      scheduledTime,
      reason,
    });
    res.status(201).json({ appointment });
  });

  app.post(
    '/api/appointments/:id/pay',
    requireAuth,
    requireRole('patient'),
    async (req: AuthedRequest, res) => {
      const id = String(req.params.id);
      const apt = await clinicStore.findAppointmentById(id);
      if (!apt) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }
      if (apt.patientId !== req.auth!.userId) {
        res.status(403).json({ error: 'You can only pay for your own appointments' });
        return;
      }
      if (apt.paymentStatus === 'paid') {
        res.status(400).json({ error: 'Consultation fee is already paid' });
        return;
      }

      const { method, cardNumber, upiId } = req.body as {
        method?: 'card' | 'upi' | 'wallet';
        cardNumber?: string;
        upiId?: string;
      };

      const selectedMethod = method || 'card';
      let last4: string | undefined;

      if (selectedMethod === 'card') {
        const digits = (cardNumber || '').replace(/\D/g, '');
        if (digits.length < 12) {
          res.status(400).json({ error: 'Enter a valid 16-digit card number to authorize fee' });
          return;
        }
        last4 = digits.slice(-4);
      } else if (selectedMethod === 'upi') {
        if (!upiId || !upiId.includes('@')) {
          res.status(400).json({ error: 'Enter a valid UPI ID (e.g. name@bank)' });
          return;
        }
      }

      const updated = await clinicStore.payAppointment({
        appointmentId: apt.id,
        patientId: req.auth!.userId,
        method: selectedMethod,
        last4,
      });
      if (!updated) {
        res.status(400).json({ error: 'Consultation fee is already paid' });
        return;
      }

      res.json({ appointment: updated });
    }
  );

  app.patch('/api/appointments/:id/status', requireAuth, async (req: AuthedRequest, res) => {
    const id = String(req.params.id);
    const apt = await clinicStore.findAppointmentById(id);
    if (!apt) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    const isDoctorOwner = req.auth!.role === 'doctor' && apt.doctorUserId === req.auth!.userId;
    const isPatientOwner = req.auth!.role === 'patient' && apt.patientId === req.auth!.userId;
    const isAdmin = req.auth!.role === 'admin';

    if (!isDoctorOwner && !isPatientOwner && !isAdmin) {
      res.status(403).json({ error: 'Not authorized to update this appointment' });
      return;
    }

    const { status, clinicalNotes, prescription } = req.body as {
      status?: 'confirmed' | 'in_call' | 'completed' | 'cancelled';
      clinicalNotes?: string;
      prescription?: string;
    };

    if (isPatientOwner && status && status !== 'cancelled' && status !== 'in_call') {
      res.status(403).json({ error: 'Patients can only join call or cancel appointments' });
      return;
    }

    const updated = await clinicStore.updateAppointmentStatus({
      appointmentId: apt.id,
      status,
      clinicalNotes: isDoctorOwner || isAdmin ? clinicalNotes : undefined,
      prescription: isDoctorOwner || isAdmin ? prescription : undefined,
    });

    res.json({ appointment: updated });
  });

  // --- React Native Source Code Explorer & Zip Export ---
  app.get('/api/react-native-files', async (_req, res) => {
    const rnDir = path.resolve(process.cwd(), 'react-native-app');
    const files: { relativePath: string; content: string }[] = [];
    walkDirectory(rnDir, rnDir, files);
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    res.json({ files });
  });

  app.get('/api/export-react-native', async (_req, res) => {
    try {
      const rnDir = path.resolve(process.cwd(), 'react-native-app');
      const files: { relativePath: string; content: string }[] = [];
      walkDirectory(rnDir, rnDir, files);
      const zip = new JSZip();
      for (const file of files) {
        zip.file(file.relativePath, file.content);
      }
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="medlink-react-native-expo.zip"');
      res.send(buffer);
    } catch (err) {
      console.error('Failed to bundle React Native export:', err);
      res.status(500).json({ error: 'Failed to export React Native project' });
    }
  });

  // --- Google Maps Platform Endpoints (Server-Side Proxy avoids CORS CF1) ---
  app.get('/api/maps/config', async (_req, res) => {
    const apiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({ apiKey });
  });

  app.post('/api/maps/nearby', async (req, res) => {
    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
      res.status(503).json({ error: 'Google Maps API key is not configured on the server.' });
      return;
    }

    const { query, lat, lng } = req.body as {
      query?: string;
      lat?: number;
      lng?: number;
    };

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.rating,places.userRatingCount',
        },
        body: JSON.stringify({
          textQuery: query?.trim() || 'medical clinic hospital pharmacy',
          maxResultCount: 8,
          ...(typeof lat === 'number' && typeof lng === 'number'
            ? {
                locationBias: {
                  circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: 8000,
                  },
                },
              }
            : {}),
        }),
      });

      const payload = (await response.json()) as {
        places?: Array<{
          id: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
          googleMapsUri?: string;
          rating?: number;
          userRatingCount?: number;
        }>;
        error?: { status?: string; message?: string };
      };

      if (response.status === 429 || payload.error?.status === 'RESOURCE_EXHAUSTED') {
        res.status(429).json({
          quotaExceeded: true,
          error: payload.error?.message || 'Google Maps Platform quota exceeded',
        });
        return;
      }

      if (!response.ok) {
        res.status(response.status).json({
          error: payload.error?.message || 'Failed to search nearby clinics',
        });
        return;
      }

      res.json({ places: payload.places ?? [] });
    } catch (err) {
      console.error('Places search error:', err);
      res.status(500).json({ error: 'Unable to reach Google Places API' });
    }
  });

  // --- Gemini AI Endpoints (Chat, Audio Transcription, Video Generation) ---
  app.post('/api/ai/chat', async (req, res) => {
    const { messages, rolePersona, model } = req.body as {
      messages?: Array<{ role: 'user' | 'model'; text: string }>;
      rolePersona?: 'patient_triage' | 'doctor_assistant' | 'admin_ops';
      model?:
        | 'gemini-4-hydrogen'
        | 'gemini-3.1-flash-lite'
        | 'gemini-4-carbon'
        | 'gemini-4-argon';
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const allowedModels = new Set([
      'gemini-4-hydrogen',
      'gemini-3.1-flash-lite',
      'gemini-4-carbon',
      'gemini-4-argon',
    ]);
    const selectedModel = model && allowedModels.has(model) ? model : 'gemini-4-hydrogen';

    const systemInstructionMap: Record<string, string> = {
      patient_triage:
        'You are the MedLink Patient Care Guide. Help patients prepare concise symptom descriptions for their video consultation, choose the right medical specialist specialty, and explain appointment booking and consultation fee steps clearly. Never diagnose; advise urgent emergency care for red-flag symptoms. Keep answers concise.',
      doctor_assistant:
        'You are the MedLink Physician Clinical Assistant. Help doctors structure SOAP notes, summarize patient symptom intakes, and draft clear patient-facing follow-up instructions. Keep responses structured and concise.',
      admin_ops:
        'You are the MedLink Clinic Operations Assistant. Help clinic administrators organize physician onboarding, specialty slot planning, and telehealth workflow policies clearly.',
    };

    try {
      const ai = getGeminiClient();
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));
      const latest = messages[messages.length - 1];

      const chat = ai.chats.create({
        model: selectedModel,
        history,
        config: {
          systemInstruction:
            systemInstructionMap[rolePersona || 'patient_triage'] ||
            systemInstructionMap.patient_triage,
        },
      });

      const response = await chat.sendMessage({ message: latest.text });
      res.json({ reply: response.text || '', model: selectedModel });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Gemini chat error:', msg);
      const isQuotaOrPaid =
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('429') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('403');
      res.status(isQuotaOrPaid ? 403 : 500).json({
        error: isQuotaOrPaid
          ? 'This model requires a billing-enabled Gemini API key in Settings > Secrets, or switch to Gemini 4 Hydrogen / Flash Lite.'
          : msg || 'Failed to generate chat response',
      });
    }
  });

  app.post('/api/ai/transcribe', async (req, res) => {
    const { audioBase64, mimeType, prompt } = req.body as {
      audioBase64?: string;
      mimeType?: string;
      prompt?: string;
    };

    if (!audioBase64) {
      res.status(400).json({ error: 'Recorded audio payload is required' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text:
                prompt ||
                'Transcribe this clinical audio accurately with clear punctuation.',
            },
          ],
        },
      });
      res.json({ transcript: response.text || '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Transcription error:', msg);
      res.status(500).json({
        error: msg || 'Audio transcription failed. Check GEMINI_API_KEY in Settings > Secrets.',
      });
    }
  });

  app.post('/api/ai/generate-video', async (req, res) => {
    const { prompt, aspectRatio } = req.body as {
      prompt?: string;
      aspectRatio?: '16:9' | '9:16';
    };

    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: 'Video prompt is required' });
      return;
    }

    const ratio = aspectRatio === '9:16' ? '9:16' : '16:9';

    try {
      const ai = getGeminiClient();
      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: prompt.trim(),
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: ratio,
            duration: '6s',
            resolution: '720p',
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart || (!videoPart.data && !videoPart.uri)) {
        res.status(502).json({ error: 'No video output was returned by the model.' });
        return;
      }

      res.json({
        mimeType: videoPart.mime_type || 'video/mp4',
        data: videoPart.data || null,
        uri: videoPart.uri || null,
        aspectRatio: ratio,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Video generation error:', msg);
      const needsPaidKey =
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('429') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('403') ||
        msg.includes('billing');
      res.status(needsPaidKey ? 403 : 500).json({
        error: needsPaidKey
          ? 'Video generation with gemini-omni-1.2-flash requires a billing-enabled Gemini API key in Settings > Secrets.'
          : msg || 'Video generation failed',
      });
    }
  });

  // --- HTTP & WebSocket Server ---
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let currentRoomId: string | null = null;
    let currentParticipantId: string | null = null;

    const leaveCurrentRoom = () => {
      if (!currentRoomId || !currentParticipantId) return;
      const room = activeRooms.get(currentRoomId);
      if (room) {
        room.delete(currentParticipantId);
        for (const [, peer] of room.entries()) {
          if (peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(
              JSON.stringify({
                type: 'room:peer-left',
                roomId: currentRoomId,
                userId: currentParticipantId,
              })
            );
          }
        }
        if (room.size === 0) {
          activeRooms.delete(currentRoomId);
        }
      }
      currentRoomId = null;
      currentParticipantId = null;
    };

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          roomId?: string;
          token?: string;
          sdp?: unknown;
          candidate?: unknown;
          text?: string;
        };

        if (msg.type === 'room:join' && msg.roomId && msg.token) {
          let decoded: JwtPayload;
          try {
            decoded = jwt.verify(msg.token, JWT_SECRET) as JwtPayload;
          } catch {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid call authorization' }));
            return;
          }

          const apt = await clinicStore.findAppointmentById(msg.roomId);
          if (!apt) {
            ws.send(JSON.stringify({ type: 'error', message: 'Appointment room not found' }));
            return;
          }

          const allowed =
            decoded.role === 'admin' ||
            apt.patientId === decoded.userId ||
            apt.doctorUserId === decoded.userId;

          if (!allowed) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authorized for this room' }));
            return;
          }

          if (apt.paymentStatus !== 'paid') {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Consultation fee must be paid before joining video room',
              })
            );
            return;
          }

          leaveCurrentRoom();
          currentRoomId = msg.roomId;
          currentParticipantId = decoded.userId;

          if (!activeRooms.has(currentRoomId)) {
            activeRooms.set(currentRoomId, new Map());
          }
          const room = activeRooms.get(currentRoomId)!;
          const existingPeers = Array.from(room.values()).map((p) => ({
            userId: p.userId,
            name: p.name,
            role: p.role,
          }));

          room.set(decoded.userId, {
            ws,
            userId: decoded.userId,
            name: decoded.name,
            role: decoded.role,
          });

          await clinicStore.updateAppointmentStatus({
            appointmentId: apt.id,
            status: 'in_call',
          });

          ws.send(
            JSON.stringify({
              type: 'room:joined',
              roomId: currentRoomId,
              peers: existingPeers,
              chatHistory: roomChatHistory.get(currentRoomId) || [],
            })
          );

          for (const [peerId, peer] of room.entries()) {
            if (peerId !== decoded.userId && peer.ws.readyState === WebSocket.OPEN) {
              peer.ws.send(
                JSON.stringify({
                  type: 'room:peer-joined',
                  roomId: currentRoomId,
                  peer: {
                    userId: decoded.userId,
                    name: decoded.name,
                    role: decoded.role,
                  },
                })
              );
            }
          }
          return;
        }

        if (!currentRoomId || !currentParticipantId) return;
        const room = activeRooms.get(currentRoomId);
        if (!room) return;
        const sender = room.get(currentParticipantId);
        if (!sender) return;

        if (
          msg.type === 'webrtc:offer' ||
          msg.type === 'webrtc:answer' ||
          msg.type === 'webrtc:ice'
        ) {
          for (const [peerId, peer] of room.entries()) {
            if (peerId !== currentParticipantId && peer.ws.readyState === WebSocket.OPEN) {
              peer.ws.send(
                JSON.stringify({
                  type: msg.type,
                  roomId: currentRoomId,
                  fromUserId: currentParticipantId,
                  sdp: msg.sdp,
                  candidate: msg.candidate,
                })
              );
            }
          }
          return;
        }

        if (msg.type === 'chat:message' && msg.text && msg.text.trim()) {
          const entry: CallChatMessage = {
            id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
            roomId: currentRoomId,
            senderId: sender.userId,
            senderName: sender.name,
            senderRole: sender.role,
            text: msg.text.trim().slice(0, 500),
            sentAt: new Date().toISOString(),
          };
          const list = roomChatHistory.get(currentRoomId) || [];
          list.push(entry);
          roomChatHistory.set(currentRoomId, list.slice(-50));

          for (const [, peer] of room.entries()) {
            if (peer.ws.readyState === WebSocket.OPEN) {
              peer.ws.send(JSON.stringify({ type: 'chat:message', message: entry }));
            }
          }
          return;
        }

        if (msg.type === 'room:leave') {
          leaveCurrentRoom();
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom();
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  return { app, server };
}

/** Appends the JSON error handler; call after any extra middleware has been mounted. */
export function addErrorHandler(app: express.Express): void {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled API error:', err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error' });
  });
}
