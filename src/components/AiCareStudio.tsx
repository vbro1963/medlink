import { useEffect, useRef, useState } from 'react';
import {
  Send,
  Trash2,
  Video,
  Sparkles,
  Loader2,
  AlertCircle,
  MessageSquareHeart,
} from 'lucide-react';
import { api, type GeminiChatModel } from '../lib/api';
import { VoiceRecorderButton } from './VoiceRecorderButton';
import type { PublicUser } from '../types/telehealth';

interface AiCareStudioProps {
  user: PublicUser | null;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export function AiCareStudio({ user }: AiCareStudioProps) {
  const defaultPersona =
    user?.role === 'doctor'
      ? 'doctor_assistant'
      : user?.role === 'admin'
        ? 'admin_ops'
        : 'patient_triage';

  const [persona, setPersona] = useState<'patient_triage' | 'doctor_assistant' | 'admin_ops'>(
    defaultPersona
  );
  const [model, setModel] = useState<GeminiChatModel>('gemini-4-hydrogen');
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'welcome_1',
      role: 'model',
      text: 'Hello — I am the MedLink Care Assistant. Describe your symptoms, ask which specialist to book, or dictate notes to prepare for your video consultation.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Patient education text-to-video generator state
  const [videoPrompt, setVideoPrompt] = useState(
    'Calm animated medical explainer showing proper deep-breathing posture recovery exercises in a sunlit clinic room'
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    setPersona(defaultPersona);
  }, [defaultPersona]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;

    const nextHistory: ChatTurn[] = [
      ...messages,
      { id: `u_${Date.now()}`, role: 'user', text: trimmed },
    ];
    setMessages(nextHistory);
    setDraft('');
    setChatError(null);
    setSending(true);

    try {
      const apiMessages = nextHistory
        .filter((m) => m.id !== 'welcome_1')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await api.aiChat({
        messages: apiMessages,
        rolePersona: persona,
        model,
      });

      setMessages((prev) => [
        ...prev,
        { id: `m_${Date.now()}`, role: 'model', text: res.reply },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim() || generatingVideo) return;
    setVideoError(null);
    setGeneratingVideo(true);
    try {
      const res = await api.generateVideo({ prompt: videoPrompt.trim(), aspectRatio });
      if (res.data) {
        setVideoSrc(`data:${res.mimeType};base64,${res.data}`);
      } else if (res.uri) {
        setVideoSrc(res.uri);
      }
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setGeneratingVideo(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Multi-turn Gemini Care Chatbot + Voice Transcription */}
      <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-teal-700">
              <MessageSquareHeart className="w-4 h-4" />
              <span>Multi-Turn Clinical Assistant & Voice Intake</span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
              MedLink Care Chat
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Assistant role"
              value={persona}
              onChange={(e) =>
                setPersona(
                  e.target.value as 'patient_triage' | 'doctor_assistant' | 'admin_ops'
                )
              }
              className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
            >
              <option value="patient_triage">Patient Triage Guide</option>
              <option value="doctor_assistant">Doctor SOAP Assistant</option>
              <option value="admin_ops">Clinic Ops Assistant</option>
            </select>

            <select
              aria-label="Gemini model"
              value={model}
              onChange={(e) => setModel(e.target.value as GeminiChatModel)}
              className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
            >
              <option value="gemini-4-hydrogen">Gemini 4 Hydrogen (Default)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
              <option value="gemini-4-carbon">Gemini 4 Carbon (Paid Key)</option>
              <option value="gemini-4-argon">Gemini 4 Argon (Paid Key)</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setMessages([
                  {
                    id: 'welcome_1',
                    role: 'model',
                    text: 'Conversation cleared. How can I help prepare your consultation or clinical summary?',
                  },
                ]);
                setChatError(null);
              }}
              aria-label="Clear conversation"
              className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs text-slate-600 inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3 h-[380px] overflow-y-auto bg-slate-50/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'ml-auto bg-teal-700 text-white'
                  : 'mr-auto bg-white border border-slate-200 text-slate-800'
              }`}
            >
              {m.text}
            </div>
          ))}
          {sending && (
            <div className="mr-auto bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
              Thinking...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {chatError && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{chatError}</span>
          </div>
        )}

        <form
          onSubmit={sendMessage}
          className="p-4 border-t border-slate-100 bg-white flex flex-wrap items-center gap-2"
        >
          <VoiceRecorderButton
            label="Voice Intake"
            prompt="Transcribe this patient symptom description or doctor clinical query clearly."
            onTranscript={(transcript) =>
              setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript))
            }
            onError={(msg) => setChatError(msg)}
          />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Describe symptoms, ask which specialist to book, or dictate notes..."
            className="flex-1 min-w-[200px] min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </section>

      {/* Text-to-Video Patient Education Clip Generator */}
      <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700">
            <Video className="w-4 h-4" />
            <span>Patient Education Clip Studio</span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">
            Health Explainer Video Generator
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate short 6-second recovery exercise or post-visit care clips using{' '}
            <span className="font-mono">gemini-omni-1.2-flash</span>.
          </p>
        </div>

        <form onSubmit={handleGenerateVideo} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Care Visual Prompt
            </label>
            <textarea
              rows={3}
              required
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(['16:9', '9:16'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    aspectRatio === ratio
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  {ratio} {ratio === '16:9' ? 'Landscape' : 'Mobile'}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={generatingVideo}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              {generatingVideo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Video
                </>
              )}
            </button>
          </div>
        </form>

        {videoError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{videoError}</span>
          </div>
        )}

        {videoSrc ? (
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
            <video src={videoSrc} controls playsInline className="w-full max-h-[280px]" />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
            Generated patient care videos appear here for review or sharing after consultation.
          </div>
        )}
      </section>
    </div>
  );
}
