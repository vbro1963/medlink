import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Send,
  MonitorUp,
  UserRound,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api, getStoredToken } from '../lib/api';
import { VoiceRecorderButton } from './VoiceRecorderButton';
import type { Appointment, CallChatMessage, PublicUser } from '../types/telehealth';

interface VideoCallRoomProps {
  appointment: Appointment;
  user: PublicUser;
  onExit: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function VideoCallRoom({ appointment, user, onExit }: VideoCallRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [wsConnected, setWsConnected] = useState(false);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [chatMessages, setChatMessages] = useState<CallChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [doctorNotes, setDoctorNotes] = useState(appointment.clinicalNotes || '');
  const [doctorRx, setDoctorRx] = useState(appointment.prescription || '');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const createPeerConnection = (ws: WebSocket, stream: MediaStream | null) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.ontrack = (event) => {
        if (!mounted) return;
        const [remoteStream] = event.streams;
        if (remoteStream && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setHasRemoteStream(true);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'webrtc:ice', candidate: event.candidate }));
        }
      };

      return pc;
    };

    const initializeRoom = async () => {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        setMediaError(
          'Camera/microphone permission unavailable in this browser context. Signaling and chat remain active.'
        );
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      const pc = createPeerConnection(ws, stream);

      ws.onopen = () => {
        if (!mounted) return;
        setWsConnected(true);
        ws.send(
          JSON.stringify({
            type: 'room:join',
            roomId: appointment.id,
            token: getStoredToken(),
          })
        );
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room:joined') {
          if (Array.isArray(msg.chatHistory)) {
            setChatMessages(msg.chatHistory);
          }
          if (Array.isArray(msg.peers) && msg.peers.length > 0) {
            setPeerName(msg.peers[0].name);
          }
        } else if (msg.type === 'room:peer-joined') {
          setPeerName(msg.peer?.name || 'Participant');
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'webrtc:offer', sdp: offer }));
          } catch (err) {
            console.error('Offer error:', err);
          }
        } else if (msg.type === 'room:peer-left') {
          setPeerName(null);
          setHasRemoteStream(false);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        } else if (msg.type === 'webrtc:offer' && msg.sdp) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'webrtc:answer', sdp: answer }));
          } catch (err) {
            console.error('Answer error:', err);
          }
        } else if (msg.type === 'webrtc:answer' && msg.sdp) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          } catch (err) {
            console.error('Remote answer error:', err);
          }
        } else if (msg.type === 'webrtc:ice' && msg.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch (err) {
            console.error('ICE candidate error:', err);
          }
        } else if (msg.type === 'chat:message' && msg.message) {
          setChatMessages((prev) => [...prev, msg.message]);
        }
      };

      ws.onclose = () => {
        if (mounted) setWsConnected(false);
      };
    };

    initializeRoom();

    return () => {
      mounted = false;
      wsRef.current?.send(JSON.stringify({ type: 'room:leave' }));
      wsRef.current?.close();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [appointment.id]);

  const toggleMic = () => {
    const nextMuted = !micMuted;
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    setMicMuted(nextMuted);
  };

  const toggleCam = () => {
    const nextOff = !camOff;
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !nextOff;
    });
    setCamOff(nextOff);
  };

  const handleScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && screenTrack) {
        await sender.replaceTrack(screenTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
    } catch {
      // User dismissed screen picker
    }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDraft.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'chat:message', text: chatDraft.trim() }));
    setChatDraft('');
  };

  const handleSaveDoctorNotes = async () => {
    await api.updateAppointmentStatus(appointment.id, {
      clinicalNotes: doctorNotes,
      prescription: doctorRx,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleEndCall = async () => {
    if (user.role === 'doctor') {
      await api.updateAppointmentStatus(appointment.id, {
        status: 'completed',
        clinicalNotes: doctorNotes,
        prescription: doctorRx,
      });
    }
    onExit();
  };

  const formatDuration = (sec: number) => {
    const mins = String(Math.floor(sec / 60)).padStart(2, '0');
    const rem = String(sec % 60).padStart(2, '0');
    return `${mins}:${rem}`;
  };

  const counterpartName =
    user.role === 'doctor' ? appointment.patientName : appointment.doctorName;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800">
        {/* Call Top Strip */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-teal-400 font-medium">
              Consultation Room · {appointment.doctorSpecialty}
            </p>
            <h2 className="font-display text-base font-semibold text-white">
              {appointment.doctorName} with {appointment.patientName}
            </h2>
          </div>

          <div className="flex items-center gap-5 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-teal-400' : 'bg-amber-400'
                }`}
              />
              {wsConnected ? 'Signaling Connected' : 'Connecting...'}
            </span>
            <span className="font-mono tabular-nums text-white font-semibold">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Video Stage */}
          <div className="lg:col-span-8 p-4 sm:p-5 flex flex-col justify-between bg-slate-950 min-h-[440px]">
            {mediaError && (
              <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-amber-950/70 border border-amber-700/50 text-xs text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{mediaError}</span>
              </div>
            )}

            <div className="relative flex-1 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden min-h-[340px] flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${hasRemoteStream ? 'block' : 'hidden'}`}
              />

              {!hasRemoteStream && (
                <div className="text-center px-6 max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center mx-auto mb-3">
                    <UserRound className="w-8 h-8" />
                  </div>
                  <p className="font-display font-semibold text-white">
                    {peerName
                      ? `${peerName} joined the room`
                      : `Waiting for ${counterpartName} to join`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    WebRTC signaling is live on room <span className="font-mono">{appointment.id}</span>. Open this app in a second browser window signed in as the {user.role === 'doctor' ? 'Patient' : 'Doctor'} to establish two-way video.
                  </p>
                </div>
              )}

              {/* Local PiP video */}
              <div className="absolute bottom-3 right-3 w-36 sm:w-44 aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${camOff ? 'hidden' : 'block'}`}
                />
                {camOff && (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    Camera Off
                  </div>
                )}
                <span className="absolute bottom-1.5 left-2 text-[11px] font-medium text-white bg-black/60 px-1.5 py-0.5 rounded">
                  You ({user.role})
                </span>
              </div>
            </div>

            {/* Call Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleMic}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  micMuted
                    ? 'bg-red-600/20 text-red-300 border border-red-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {micMuted ? 'Unmute' : 'Mute'}
              </button>

              <button
                type="button"
                onClick={toggleCam}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  camOff
                    ? 'bg-red-600/20 text-red-300 border border-red-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {camOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                {camOff ? 'Start Camera' : 'Stop Camera'}
              </button>

              <button
                type="button"
                onClick={handleScreenShare}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <MonitorUp className="w-4 h-4" />
                Share Screen
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                {user.role === 'doctor' ? 'End & Complete Visit' : 'Leave Call'}
              </button>
            </div>
          </div>

          {/* Right Sidebar: Live Chat & Doctor Notes */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 flex flex-col justify-between">
            <div className="p-4 border-b border-slate-800">
              <p className="text-xs font-semibold text-slate-300">Visit Reason</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{appointment.reason}</p>
            </div>

            {user.role === 'doctor' && (
              <div className="p-4 border-b border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-200">Doctor Clinical Notes</p>
                  <div className="flex items-center gap-2">
                    {savedNotice && (
                      <span className="text-[11px] text-teal-400 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                    <VoiceRecorderButton
                      dark
                      label="Dictate"
                      prompt="Transcribe physician clinical consultation notes."
                      onTranscript={(t) =>
                        setDoctorNotes((prev) => (prev ? `${prev} ${t}` : t))
                      }
                      onError={(msg) => setMediaError(msg)}
                    />
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Observations & diagnosis..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500"
                />
                <input
                  type="text"
                  value={doctorRx}
                  onChange={(e) => setDoctorRx(e.target.value)}
                  placeholder="Prescription summary..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleSaveDoctorNotes}
                  className="w-full min-h-[36px] px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-medium cursor-pointer"
                >
                  Save Clinical Notes
                </button>
              </div>
            )}

            {/* Real-time Consultation Chat */}
            <div className="flex-1 flex flex-col p-4 min-h-[240px]">
              <p className="text-xs font-semibold text-slate-300 mb-2">In-Call Chat</p>
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-60 pr-1">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No messages yet. Send lab values or instructions here.
                  </p>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl text-xs ${
                        msg.senderId === user.id
                          ? 'bg-teal-900/50 border border-teal-700/50 ml-6'
                          : 'bg-slate-800 mr-6'
                      }`}
                    >
                      <p className="text-[11px] font-medium text-slate-400">
                        {msg.senderName} · {msg.senderRole}
                      </p>
                      <p className="text-slate-100 mt-0.5">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={sendChat} className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  aria-label="Send chat message"
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-teal-700 hover:bg-teal-600 text-white flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
