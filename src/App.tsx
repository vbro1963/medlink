import { useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken } from './lib/api';
import { testFirestoreConnection } from './lib/firebase';
import { AuthGate } from './components/AuthGate';
import { AdminWorkspace } from './components/AdminWorkspace';
import { DoctorWorkspace } from './components/DoctorWorkspace';
import { PatientWorkspace } from './components/PatientWorkspace';
import { VideoCallRoom } from './components/VideoCallRoom';
import { ReactNativeExplorer } from './components/ReactNativeExplorer';
import { DeployGuideView } from './components/DeployGuideView';
import { AiCareStudio } from './components/AiCareStudio';
import type { Appointment, PublicUser } from './types/telehealth';

type NavSection = 'workspace' | 'doctors' | 'care-ai' | 'react-native' | 'deploy';

export default function App() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [section, setSection] = useState<NavSection>('workspace');
  const [activeCallAppointment, setActiveCallAppointment] = useState<Appointment | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    testFirestoreConnection().catch(() => {});
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }
    api
      .getMe()
      .then((res) => setUser(res.user))
      .catch(() => setStoredToken(null))
      .finally(() => setAuthChecked(true));
  }, []);

  const handleSignOut = () => {
    setStoredToken(null);
    setUser(null);
    setActiveCallAppointment(null);
    setSection('workspace');
  };

  const handleHeaderAction = () => {
    if (user) {
      handleSignOut();
    } else {
      setActiveCallAppointment(null);
      setSection('workspace');
    }
  };

  const handleJoinVideoCall = (appointment: Appointment) => {
    setActiveCallAppointment(appointment);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {quotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <strong>Google Maps quota limit reached.</strong> The shared demo API key has exhausted its daily quota.{' '}
          <a
            href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold"
          >
            Set up a Maps API key from your own Google Cloud project
          </a>{' '}
          in your app&apos;s Secrets / environment variables to restore full quota.
        </div>
      )}

      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveCallAppointment(null);
              setSection('workspace');
            }}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            MedLink
          </button>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="flex items-center gap-5 sm:gap-7 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveCallAppointment(null);
                setSection('workspace');
              }}
              className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                section === 'workspace' && !activeCallAppointment
                  ? 'text-teal-700 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCallAppointment(null);
                setSection('doctors');
              }}
              className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                section === 'doctors' && !activeCallAppointment
                  ? 'text-teal-700 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doctors
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCallAppointment(null);
                setSection('care-ai');
              }}
              className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                section === 'care-ai' && !activeCallAppointment
                  ? 'text-teal-700 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Care AI
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCallAppointment(null);
                setSection('react-native');
              }}
              className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                section === 'react-native' && !activeCallAppointment
                  ? 'text-teal-700 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              React Native
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCallAppointment(null);
                setSection('deploy');
              }}
              className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                section === 'deploy' && !activeCallAppointment
                  ? 'text-teal-700 underline underline-offset-8 decoration-2'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Deploy Guide
            </button>
          </nav>

          {/* Zone 3: 1 primary action button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleHeaderAction}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {user ? 'Sign Out' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {!authChecked ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-sm text-slate-500">
            Restoring clinical session...
          </div>
        ) : activeCallAppointment && user ? (
          <VideoCallRoom
            appointment={activeCallAppointment}
            user={user}
            onExit={() => setActiveCallAppointment(null)}
          />
        ) : section === 'care-ai' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <AiCareStudio user={user} />
          </div>
        ) : section === 'react-native' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <ReactNativeExplorer />
          </div>
        ) : section === 'deploy' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <DeployGuideView />
          </div>
        ) : section === 'doctors' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <PatientWorkspace
              user={user}
              defaultTab="doctors"
              onRequireAuth={() => setSection('workspace')}
              onJoinVideoCall={handleJoinVideoCall}
            />
          </div>
        ) : !user ? (
          <AuthGate
            onAuthenticated={(authedUser) => {
              setUser(authedUser);
              setSection('workspace');
            }}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {user.role === 'admin' && <AdminWorkspace />}
            {user.role === 'doctor' && (
              <DoctorWorkspace user={user} onJoinVideoCall={handleJoinVideoCall} />
            )}
            {user.role === 'patient' && (
              <PatientWorkspace
                user={user}
                defaultTab="appointments"
                onRequireAuth={() => setSection('workspace')}
                onJoinVideoCall={handleJoinVideoCall}
              />
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>MedLink Telehealth Platform · Role-Based Clinical Care & React Native Expo</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveCallAppointment(null);
                setSection('react-native');
              }}
              className="hover:text-slate-900 cursor-pointer"
            >
              React Native Source
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCallAppointment(null);
                setSection('deploy');
              }}
              className="hover:text-slate-900 cursor-pointer"
            >
              Play Store & Cloud Guide
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
