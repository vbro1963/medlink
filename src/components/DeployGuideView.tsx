import { useState } from 'react';
import { Cloud, Smartphone, ShieldCheck, Copy, Check } from 'lucide-react';

interface CommandBlockProps {
  label: string;
  command: string;
}

function CommandBlock({ label, command }: CommandBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mt-2.5 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-400">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] font-medium text-slate-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono text-teal-300 overflow-x-auto">{command}</pre>
    </div>
  );
}

export function DeployGuideView() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <p className="text-xs font-medium text-teal-700">Production Release Architecture</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
          Deploy Backend to Cloud & Mobile App to Google Play Store
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
          Your React Native app communicates with a single cloud backend for authentication, doctor registration, fee checkout, and WebRTC signaling. Follow Track 1 to host the backend with HTTPS/WSS, then Track 2 to build and submit the Android App Bundle (.aab) to Google Play.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Track 1: Cloud Deployment */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Track 1: Cloud Backend (Google Cloud Run)
              </h3>
              <p className="text-xs text-slate-500">
                Hosts Express REST API + WebSocket (/ws) signaling over TLS
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                01. Prepare Persistent Database & Secrets
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                Replace local file storage with managed PostgreSQL (Cloud SQL / Supabase) or Firestore so appointments and doctor records persist across container scales. Store <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">JWT_SECRET</code> and <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">STRIPE_SECRET_KEY</code> in Cloud Secret Manager.
              </p>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                02. Deploy Container with WebSocket Support
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                Use the included <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">react-native-app/Dockerfile</code>. Enable session affinity and extended timeout so WebSocket rooms remain open during calls.
              </p>
              <CommandBlock
                label="Google Cloud CLI"
                command={`gcloud services enable run.googleapis.com cloudbuild.googleapis.com\ngcloud run deploy medlink-api \\\n  --source . \\\n  --region us-central1 \\\n  --allow-unauthenticated \\\n  --port 8080 \\\n  --session-affinity \\\n  --timeout 3600`}
              />
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                03. Add TURN Relay + Live Payment Webhook
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                Add a TURN server (Metered TURN or self-hosted coturn) alongside Google STUN so mobile 4G/5G carrier NATs connect reliably, and wire Stripe PaymentIntents to confirm consultation fees before unlocking video rooms.
              </p>
            </div>
          </div>
        </section>

        {/* Track 2: Google Play Store */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Track 2: Google Play Store (Expo EAS Build)
              </h3>
              <p className="text-xs text-slate-500">
                Generates signed Android App Bundle (.aab) with WebRTC native permissions
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                01. Point Mobile App to Cloud Run URL
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                In <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">react-native-app/eas.json</code>, set <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">EXPO_PUBLIC_API_URL</code> to your <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">https://...run.app</code> domain and <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">EXPO_PUBLIC_WS_URL</code> to <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">wss://...run.app/ws</code>.
              </p>
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                02. Build APK for Device Testing, then Production .AAB
              </h4>
              <p className="text-sm text-slate-600 mt-1">
                Note that <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">react-native-webrtc</code> requires a custom development build or EAS build (it does not run inside stock Expo Go).
              </p>
              <CommandBlock
                label="Expo EAS CLI"
                command={`cd react-native-app\nnpm install && npx eas-cli login\nnpx eas-cli build --platform android --profile preview\nnpx eas-cli build --platform android --profile production`}
              />
            </div>

            <div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                03. Google Play Console Submission & Review
              </h4>
              <div className="mt-1.5 space-y-1.5 text-sm text-slate-600">
                <p className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-700 mt-1 shrink-0" />
                  <span>
                    Upload your <code className="font-mono text-xs bg-slate-100 px-1 rounded">.aab</code> to the <strong>Internal Testing</strong> track in Play Console (or automate via <code className="font-mono text-xs bg-slate-100 px-1 rounded">eas submit --platform android</code>).
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-700 mt-1 shrink-0" />
                  <span>
                    Complete the <strong>Health Apps</strong> declaration, privacy policy URL, and <strong>Data Safety</strong> form disclosing Camera, Microphone, and encrypted payment processing.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
