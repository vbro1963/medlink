import type { AdminOverviewStats, Appointment, DoctorProfile, PublicUser } from '../types/telehealth';

const TOKEN_STORAGE_KEY = 'medlink_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export interface NearbyPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
}

export type GeminiChatModel =
  | 'gemini-4-hydrogen'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-carbon'
  | 'gemini-4-argon';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    quotaExceeded?: boolean;
  };
  if (res.status === 429 || data.quotaExceeded) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  registerPatient: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) =>
    apiFetch<{ token: string; user: PublicUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => apiFetch<{ user: PublicUser }>('/api/auth/me'),

  listDoctors: () => apiFetch<{ doctors: DoctorProfile[] }>('/api/doctors'),

  getAdminOverview: () =>
    apiFetch<{
      stats: AdminOverviewStats;
      doctors: DoctorProfile[];
      appointments: Appointment[];
    }>('/api/admin/overview'),

  registerDoctor: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    specialty: string;
    licenseNumber: string;
    consultationFee: number;
    experienceYears: number;
    languages: string[];
    clinicLocation: string;
    bio: string;
    availableSlots: string[];
  }) =>
    apiFetch<{ doctor: DoctorProfile }>('/api/admin/doctors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDoctor: (
    doctorId: string,
    patch: { consultationFee?: number; isActive?: boolean; availableSlots?: string[] }
  ) =>
    apiFetch<{ doctor: DoctorProfile }>(`/api/admin/doctors/${doctorId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  listAppointments: () => apiFetch<{ appointments: Appointment[] }>('/api/appointments'),

  bookAppointment: (payload: {
    doctorId: string;
    scheduledDate: string;
    scheduledTime: string;
    reason: string;
  }) =>
    apiFetch<{ appointment: Appointment }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  payAppointment: (
    appointmentId: string,
    payload: { method: 'card' | 'upi' | 'wallet'; cardNumber?: string; upiId?: string }
  ) =>
    apiFetch<{ appointment: Appointment }>(`/api/appointments/${appointmentId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAppointmentStatus: (
    appointmentId: string,
    payload: {
      status?: 'confirmed' | 'in_call' | 'completed' | 'cancelled';
      clinicalNotes?: string;
      prescription?: string;
    }
  ) =>
    apiFetch<{ appointment: Appointment }>(`/api/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getReactNativeFiles: () =>
    apiFetch<{ files: { relativePath: string; content: string }[] }>('/api/react-native-files'),

  getMapsConfig: () => apiFetch<{ apiKey: string }>('/api/maps/config'),

  searchNearbyClinics: (payload: { query?: string; lat?: number; lng?: number }) =>
    apiFetch<{ places: NearbyPlace[] }>('/api/maps/nearby', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  aiChat: (payload: {
    messages: Array<{ role: 'user' | 'model'; text: string }>;
    rolePersona?: 'patient_triage' | 'doctor_assistant' | 'admin_ops';
    model?: GeminiChatModel;
  }) =>
    apiFetch<{ reply: string; model: GeminiChatModel }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  transcribeAudio: (payload: { audioBase64: string; mimeType: string; prompt?: string }) =>
    apiFetch<{ transcript: string }>('/api/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateVideo: (payload: { prompt: string; aspectRatio: '16:9' | '9:16' }) =>
    apiFetch<{
      mimeType: string;
      data: string | null;
      uri: string | null;
      aspectRatio: '16:9' | '9:16';
    }>('/api/ai/generate-video', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
