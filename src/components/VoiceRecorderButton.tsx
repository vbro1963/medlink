import { useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface VoiceRecorderButtonProps {
  onTranscript: (text: string) => void;
  prompt?: string;
  label?: string;
  dark?: boolean;
  onError?: (message: string) => void;
}

export function VoiceRecorderButton({
  onTranscript,
  prompt,
  label = 'Dictate',
  dark = false,
  onError,
}: VoiceRecorderButtonProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: preferredMime });
        if (blob.size < 256) {
          setTranscribing(false);
          return;
        }
        setTranscribing(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = typeof reader.result === 'string' ? reader.result : '';
              const comma = res.indexOf(',');
              resolve(comma >= 0 ? res.slice(comma + 1) : res);
            };
            reader.onerror = () => reject(new Error('Failed to encode audio'));
            reader.readAsDataURL(blob);
          });

          const res = await api.transcribeAudio({
            audioBase64: base64,
            mimeType: preferredMime,
            prompt,
          });
          if (res.transcript.trim()) {
            onTranscript(res.transcript.trim());
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Transcription failed';
          onError?.(msg);
        } finally {
          setTranscribing(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      onError?.('Microphone permission unavailable in this browser context.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const baseClass = dark
    ? recording
      ? 'bg-red-600/20 border border-red-500/50 text-red-200 hover:bg-red-600/30'
      : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
    : recording
      ? 'bg-red-50 border border-red-300 text-red-700 hover:bg-red-100'
      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100';

  return (
    <button
      type="button"
      disabled={transcribing}
      onClick={recording ? stopRecording : startRecording}
      className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 ${baseClass}`}
    >
      {transcribing ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Transcribing...</span>
        </>
      ) : recording ? (
        <>
          <Square className="w-3 h-3 fill-current" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Mic className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
