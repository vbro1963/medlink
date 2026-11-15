import { useEffect, useState } from 'react';
import { UserPlus, Search, CheckCircle2, AlertCircle, Cloud } from 'lucide-react';
import { api } from '../lib/api';
import { auth, signInWithGoogleFirebase, syncDoctorToFirestore } from '../lib/firebase';
import { DoctorAvatar } from './DoctorAvatar';
import type { AdminOverviewStats, Appointment, DoctorProfile } from '../types/telehealth';

export function AdminWorkspace() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'doctors' | 'appointments'>('doctors');

  // Register doctor form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Doctor@123');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState('80');
  const [experienceYears, setExperienceYears] = useState('6');
  const [clinicLocation, setClinicLocation] = useState('MedLink Virtual Clinic');
  const [bio, setBio] = useState('');
  const [slotsText, setSlotsText] = useState('09:30, 11:00, 14:00, 16:30');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOverview = async () => {
    try {
      const data = await api.getAdminOverview();
      setStats(data.stats);
      setDoctors(data.doctors);
      setAppointments(data.appointments);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load clinic overview',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRegisterDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const availableSlots = slotsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api.registerDoctor({
        name,
        email,
        password,
        specialty,
        licenseNumber,
        consultationFee: Number(consultationFee),
        experienceYears: Number(experienceYears),
        languages: ['English'],
        clinicLocation,
        bio: bio || `Board-certified specialist in ${specialty}.`,
        availableSlots,
      });

      try {
        await syncDoctorToFirestore({
          id: res.doctor.id,
          name: res.doctor.name,
          specialty: res.doctor.specialty,
          licenseNumber: res.doctor.licenseNumber,
          consultationFee: res.doctor.consultationFee,
          clinicLocation: res.doctor.clinicLocation,
          isActive: res.doctor.isActive,
        });
      } catch (fsErr) {
        console.warn('Firestore doctor sync skipped or unauthorized:', fsErr);
      }

      setFeedback({
        type: 'success',
        text: `${res.doctor.name} registered. They can now sign in with ${res.doctor.email}.`,
      });
      setName('');
      setEmail('');
      setLicenseNumber('');
      setBio('');
      await fetchOverview();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to register doctor',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (doc: DoctorProfile) => {
    try {
      await api.updateDoctor(doc.id, { isActive: !doc.isActive });
      await fetchOverview();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update doctor status',
      });
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.email.toLowerCase().includes(q)
    );
  });

  const filteredAppointments = appointments.filter((apt) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      apt.patientName.toLowerCase().includes(q) ||
      apt.doctorName.toLowerCase().includes(q) ||
      apt.doctorSpecialty.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Registered Doctors</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {loading ? '—' : stats?.totalDoctors ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {stats?.activeDoctors ?? 0} active for booking
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Registered Patients</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {loading ? '—' : stats?.totalPatients ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">Verified accounts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Appointments</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {loading ? '—' : stats?.totalAppointments ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {stats?.liveCalls ?? 0} live video rooms
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Consultation Revenue</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            ${loading ? '—' : (stats?.paidRevenue ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-teal-700 font-medium">Settled consultation fees</p>
        </div>
      </div>

      {/* Main Split: Register Doctor Form + Roster/Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-5 h-5 text-teal-700" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Register New Doctor
              </h2>
            </div>
            <button
              type="button"
              onClick={() => signInWithGoogleFirebase().catch(() => {})}
              className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-teal-700" />
              {auth.currentUser ? 'Firestore Linked' : 'Link Firestore'}
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-5">
            Create login credentials and clinical fee schedule for a physician.
          </p>

          {feedback && (
            <div
              className={`mb-4 p-3 rounded-xl border text-sm flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-teal-50 border-teal-200 text-teal-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-teal-700" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleRegisterDoctor} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Doctor Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Arjun Mehta"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Specialty
                </label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Orthopedics"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Login Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arjun.mehta@medlink.health"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Temporary Password
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  License ID
                </label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="MD-44821"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fee (USD)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Years Exp.
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Clinic / Hospital Affiliation
              </label>
              <input
                type="text"
                value={clinicLocation}
                onChange={(e) => setClinicLocation(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Available Time Slots (comma-separated 24h)
              </label>
              <input
                type="text"
                value={slotsText}
                onChange={(e) => setSlotsText(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Clinical Bio
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Areas of focus and consultation scope..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Registering Doctor...' : 'Register Doctor'}
            </button>
          </form>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('doctors')}
                className={`min-h-[38px] px-3.5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'doctors'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Doctor Roster ({doctors.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('appointments')}
                className={`min-h-[38px] px-3.5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'appointments'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Appointments ({appointments.length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'doctors' ? 'Filter doctors...' : 'Filter bookings...'}
                className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>
          </div>

          {activeTab === 'doctors' ? (
            <div className="divide-y divide-slate-100">
              {filteredDoctors.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No doctors match your search filter.
                </p>
              ) : (
                filteredDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <DoctorAvatar name={doc.name} avatarKey={doc.avatarKey} sizeClass="w-12 h-12" />
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-slate-900 text-sm truncate">
                          {doc.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {doc.specialty} · {doc.licenseNumber} · {doc.experienceYears} yrs
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {doc.email} · Slots: {doc.availableSlots.join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                          ${doc.consultationFee}
                        </p>
                        <p
                          className={`text-xs font-medium ${
                            doc.isActive ? 'text-teal-700' : 'text-slate-400'
                          }`}
                        >
                          {doc.isActive ? 'Active' : 'Paused'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(doc)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap cursor-pointer"
                      >
                        {doc.isActive ? 'Pause' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAppointments.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No appointments match your filter.
                </p>
              ) : (
                filteredAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-sm text-slate-900">
                        {apt.patientName} → {apt.doctorName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        {apt.scheduledDate} · {apt.scheduledTime} · {apt.doctorSpecialty}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{apt.reason}</p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                        ${apt.feeAmount}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          apt.paymentStatus === 'paid' ? 'text-teal-700' : 'text-amber-700'
                        }`}
                      >
                        {apt.paymentStatus === 'paid' ? 'Paid' : 'Awaiting Payment'} ·{' '}
                        {apt.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
