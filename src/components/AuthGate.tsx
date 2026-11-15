import { useState } from 'react';
import { ShieldCheck, Stethoscope, UserRound, ArrowRight, Video, CreditCard, Cloud } from 'lucide-react';
import { api, setStoredToken } from '../lib/api';
import { auth, signInWithGoogleFirebase } from '../lib/firebase';
import type { PublicUser } from '../types/telehealth';

interface AuthGateProps {
  onAuthenticated: (user: PublicUser) => void;
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('patient@medlink.health');
  const [password, setPassword] = useState('Patient@123');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.registerPatient({ name, email, password, phone });
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string, demoPassword: string) => {
    setError(null);
    setLoading(true);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setMode('login');
    try {
      const res = await api.login(demoEmail, demoPassword);
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <section className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          <div>
            <p className="text-xs font-medium text-teal-700 tracking-wide mb-3">
              Telehealth Clinical Operations & React Native Mobile Suite
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight text-balance">
              End-to-end virtual care for admins, doctors, and patients
            </h1>
            <p className="mt-4 text-slate-600 text-base leading-relaxed max-w-2xl">
              Test the complete clinical workflow live in your browser, explore the matching React Native Expo mobile codebase, and follow the step-by-step Google Cloud Run and Play Store release guide.
            </p>

            <div className="mt-8 divide-y divide-slate-100 border-t border-b border-slate-100">
              <div className="py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-slate-900 text-sm">
                    01. Clinic Admin Portal
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Register licensed physicians with specialties, consultation fees, and daily availability slots.
                  </p>
                </div>
              </div>

              <div className="py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-slate-900 text-sm">
                    02. Patient Booking & Consultation Fee Checkout
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Patients choose a specialist, book an available slot, and settle the consultation fee before entering the video room.
                  </p>
                </div>
              </div>

              <div className="py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-slate-900 text-sm">
                    03. Doctor Schedule & Live WebRTC Video Call
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Physicians sign in to view paid appointments, launch live peer-to-peer WebRTC consultations, and save clinical notes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4">
            <p className="text-xs font-medium text-slate-500 mb-3">
              Instant role switching for live testing
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin('admin@medlink.health', 'Admin@123')}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                    Admin Console
                  </span>
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">admin@medlink.health</p>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin('priya.sharma@medlink.health', 'Doctor@123')}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                    Doctor Portal
                  </span>
                  <Stethoscope className="w-4 h-4 text-teal-700 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">Dr. Priya Sharma</p>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => quickLogin('patient@medlink.health', 'Patient@123')}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                    Patient Portal
                  </span>
                  <UserRound className="w-4 h-4 text-teal-700 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">Marcus Bennett</p>
              </button>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 min-h-[40px] px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setEmail('');
                setPassword('');
                setError(null);
              }}
              className={`flex-1 min-h-[40px] px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Patient Sign Up
            </button>
          </div>

          <h2 className="font-display text-xl font-bold text-slate-900">
            {mode === 'login' ? 'Access your account' : 'Create patient account'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            {mode === 'login'
              ? 'Sign in as an Admin, Doctor, or Patient.'
              : 'Register to book appointments and pay consultation fees.'}
          </p>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Rivera"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@clinic.health"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (415) 555-0180"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Patient Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={async () => {
                setError(null);
                try {
                  await signInWithGoogleFirebase();
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'Google Firebase sign-in failed'
                  );
                }
              }}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-teal-700" />
              <span>
                {auth.currentUser
                  ? `Firebase Connected (${auth.currentUser.email})`
                  : 'Connect Google Account for Firestore Sync'}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
