import { useEffect, useState } from 'react';
import {
  Search,
  Calendar,
  CreditCard,
  Video,
  CheckCircle2,
  X,
  Clock,
  Smartphone,
} from 'lucide-react';
import { api } from '../lib/api';
import { syncAppointmentToFirestore } from '../lib/firebase';
import { DoctorAvatar } from './DoctorAvatar';
import { ClinicLocatorMap } from './ClinicLocatorMap';
import { VoiceRecorderButton } from './VoiceRecorderButton';
import type { Appointment, DoctorProfile, PublicUser } from '../types/telehealth';

interface PatientWorkspaceProps {
  user: PublicUser | null;
  onRequireAuth: () => void;
  onJoinVideoCall: (appointment: Appointment) => void;
  defaultTab?: 'doctors' | 'appointments';
}

export function PatientWorkspace({
  user,
  onRequireAuth,
  onJoinVideoCall,
  defaultTab = 'doctors',
}: PatientWorkspaceProps) {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'doctors' | 'appointments'>(defaultTab);
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Booking & payment modal state
  const [bookingDoctor, setBookingDoctor] = useState<DoctorProfile | null>(null);
  const [payingAppointment, setPayingAppointment] = useState<Appointment | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('');
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'wallet'>('card');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('424');
  const [upiId, setUpiId] = useState('marcus@okaxis');
  const [processing, setProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const docRes = await api.listDoctors();
      setDoctors(docRes.doctors);
      if (user && user.role === 'patient') {
        const aptRes = await api.listAppointments();
        setAppointments(aptRes.appointments);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    setViewTab(defaultTab);
  }, [defaultTab]);

  const specialties = ['All', ...Array.from(new Set(doctors.map((d) => d.specialty)))];

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSpecialty = specialtyFilter === 'All' || doc.specialty === specialtyFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      doc.name.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.clinicLocation.toLowerCase().includes(q);
    return matchesSpecialty && matchesQuery;
  });

  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  const openBookModal = (doc: DoctorProfile) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (user.role !== 'patient') {
      setRoleNotice(
        `Signed in as ${user.role}. Sign out and sign in with a Patient account to book and pay for consultations.`
      );
      return;
    }
    setRoleNotice(null);
    setBookingDoctor(doc);
    setScheduledTime(doc.availableSlots[0] || '10:00');
    setReason('');
    setModalError(null);
  };

  const handleCreateAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDoctor) return;
    setModalError(null);
    setProcessing(true);
    try {
      const created = await api.bookAppointment({
        doctorId: bookingDoctor.id,
        scheduledDate,
        scheduledTime,
        reason,
      });
      const paid = await api.payAppointment(created.appointment.id, {
        method: paymentMethod,
        cardNumber: paymentMethod === 'card' ? cardNumber : undefined,
        upiId: paymentMethod === 'upi' ? upiId : undefined,
      });
      setBookingDoctor(null);
      setAppointments((prev) => [paid.appointment, ...prev]);
      setViewTab('appointments');
      syncAppointmentToFirestore({
        id: paid.appointment.id,
        doctorId: paid.appointment.doctorId,
        doctorName: paid.appointment.doctorName,
        scheduledDate: paid.appointment.scheduledDate,
        scheduledTime: paid.appointment.scheduledTime,
        reason: paid.appointment.reason,
        feeAmount: paid.appointment.feeAmount,
        paymentStatus: paid.appointment.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        status: paid.appointment.status,
      }).catch(() => {});
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleBookOnly = async () => {
    if (!bookingDoctor) return;
    if (!reason.trim()) {
      setModalError('Please enter your reason for the consultation');
      return;
    }
    setModalError(null);
    setProcessing(true);
    try {
      const created = await api.bookAppointment({
        doctorId: bookingDoctor.id,
        scheduledDate,
        scheduledTime,
        reason,
      });
      setBookingDoctor(null);
      setAppointments((prev) => [created.appointment, ...prev]);
      setViewTab('appointments');
      syncAppointmentToFirestore({
        id: created.appointment.id,
        doctorId: created.appointment.doctorId,
        doctorName: created.appointment.doctorName,
        scheduledDate: created.appointment.scheduledDate,
        scheduledTime: created.appointment.scheduledTime,
        reason: created.appointment.reason,
        feeAmount: created.appointment.feeAmount,
        paymentStatus: created.appointment.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        status: created.appointment.status,
      }).catch(() => {});
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingAppointment) return;
    setModalError(null);
    setProcessing(true);
    try {
      const paid = await api.payAppointment(payingAppointment.id, {
        method: paymentMethod,
        cardNumber: paymentMethod === 'card' ? cardNumber : undefined,
        upiId: paymentMethod === 'upi' ? upiId : undefined,
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === paid.appointment.id ? paid.appointment : a))
      );
      setPayingAppointment(null);
      syncAppointmentToFirestore({
        id: paid.appointment.id,
        doctorId: paid.appointment.doctorId,
        doctorName: paid.appointment.doctorName,
        scheduledDate: paid.appointment.scheduledDate,
        scheduledTime: paid.appointment.scheduledTime,
        reason: paid.appointment.reason,
        feeAmount: paid.appointment.feeAmount,
        paymentStatus: paid.appointment.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        status: paid.appointment.status,
      }).catch(() => {});
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Payment authorization failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header / Sub-navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">
            {user ? `Patient Portal · ${user.name}` : 'Licensed Telehealth Specialists'}
          </p>
          <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
            {viewTab === 'doctors' ? 'Book a Video Consultation' : 'My Appointments & Receipts'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user && user.role === 'patient' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setViewTab('doctors')}
                className={`min-h-[40px] px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  viewTab === 'doctors'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Find Doctors ({doctors.length})
              </button>
              <button
                type="button"
                onClick={() => setViewTab('appointments')}
                className={`min-h-[40px] px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  viewTab === 'appointments'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Appointments ({appointments.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {viewTab === 'doctors' ? (
        <div className="space-y-5">
          {/* Specialty & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {specialties.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSpecialtyFilter(spec)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    specialtyFilter === spec
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctor or specialty..."
                className="w-full min-h-[42px] pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>
          </div>

          {roleNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-center justify-between gap-3">
              <span>{roleNotice}</span>
              <button
                type="button"
                onClick={() => setRoleNotice(null)}
                className="text-xs font-medium text-amber-800 underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Doctors Grid */}
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
              Loading doctors directory...
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
              No doctors match your selected specialty or search query.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredDoctors.map((doc) => (
                <article
                  key={doc.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-5"
                >
                  <div>
                    <div className="flex items-start gap-4">
                      <DoctorAvatar name={doc.name} avatarKey={doc.avatarKey} sizeClass="w-16 h-16" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-lg font-bold text-slate-900 truncate">
                            {doc.name}
                          </h3>
                          <span className="font-mono text-base font-semibold text-slate-900 tabular-nums shrink-0">
                            ${doc.consultationFee}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-teal-700 mt-0.5">
                          {doc.specialty} · {doc.experienceYears} yrs experience
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {doc.clinicLocation} · {doc.languages.join(', ')}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-slate-600 leading-relaxed">{doc.bio}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 tabular-nums truncate">
                      Next slots: {doc.availableSlots.slice(0, 3).join(', ')}
                    </p>
                    <button
                      type="button"
                      onClick={() => openBookModal(doc)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    >
                      {user ? 'Book & Pay' : 'Sign In to Book'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <ClinicLocatorMap doctors={doctors} />
        </div>
      ) : (
        /* My Appointments View */
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="font-display font-semibold text-slate-900">
                No booked appointments yet
              </p>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                Select a physician from the directory to book your first video consultation.
              </p>
              <button
                type="button"
                onClick={() => setViewTab('doctors')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold cursor-pointer"
              >
                Browse Doctors
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((apt) => {
                const isPaid = apt.paymentStatus === 'paid';
                return (
                  <article
                    key={apt.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-lg font-bold text-slate-900">
                            {apt.doctorName}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                            {apt.doctorSpecialty} · {apt.scheduledDate} at {apt.scheduledTime}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                            ${apt.feeAmount}
                          </p>
                          <p
                            className={`text-xs font-medium ${
                              isPaid ? 'text-teal-700' : 'text-amber-700'
                            }`}
                          >
                            {isPaid ? 'Paid' : 'Unpaid'}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-700">{apt.reason}</p>

                      {apt.clinicalNotes && (
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                          <p>
                            <strong className="text-slate-800">Doctor Notes:</strong>{' '}
                            {apt.clinicalNotes}
                          </p>
                          {apt.prescription && (
                            <p>
                              <strong className="text-slate-800">Prescription:</strong>{' '}
                              {apt.prescription}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Receipt {apt.payment?.transactionRef}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <Clock className="w-4 h-4" />
                          Fee required before call
                        </span>
                      )}

                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingAppointment(apt);
                            setModalError(null);
                          }}
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                          Pay ${apt.feeAmount} Fee
                        </button>
                      ) : apt.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => onJoinVideoCall(apt)}
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          Join Video Call
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">Visit Completed</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Book & Pay Consultation Modal */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Book Consultation · {bookingDoctor.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {bookingDoctor.specialty} · Consultation Fee ${bookingDoctor.consultationFee}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingDoctor(null)}
                aria-label="Close modal"
                className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateAndPay} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Time Slot
                  </label>
                  <select
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white tabular-nums"
                  >
                    {bookingDoctor.availableSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Symptoms / Reason for Visit
                  </label>
                  <VoiceRecorderButton
                    label="Dictate Symptoms"
                    prompt="Transcribe patient consultation symptoms concisely."
                    onTranscript={(t) =>
                      setReason((prev) => (prev ? `${prev} ${t}` : t))
                    }
                    onError={(msg) => setModalError(msg)}
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe symptoms or follow-up questions..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-800 mb-2.5">
                  Consultation Fee Payment (${bookingDoctor.consultationFee}.00 USD)
                </p>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-3">
                  {(['card', 'upi', 'wallet'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg capitalize cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      {method === 'upi' ? 'UPI' : method}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'card' && (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="Card Number"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                      />
                      <input
                        type="text"
                        required
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="CVC"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'upi' && (
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@bank"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                    />
                  </div>
                )}

                {paymentMethod === 'wallet' && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    Authorize ${bookingDoctor.consultationFee}.00 via your linked MedLink Health Wallet.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleBookOnly}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Book & Pay Later
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
                >
                  {processing
                    ? 'Authorizing...'
                    : `Pay $${bookingDoctor.consultationFee} & Confirm`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Existing Pending Appointment Modal */}
      {payingAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Pay Consultation Fee
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {payingAppointment.doctorName} · {payingAppointment.scheduledDate} at{' '}
                  {payingAppointment.scheduledTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingAppointment(null)}
                className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handlePayExisting} className="mt-4 space-y-4">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                {(['card', 'upi', 'wallet'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg capitalize cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    {method === 'upi' ? 'UPI' : method}
                  </button>
                ))}
              </div>

              {paymentMethod === 'card' && (
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="Card Number"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                />
              )}
              {paymentMethod === 'upi' && (
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@bank"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                />
              )}

              <button
                type="submit"
                disabled={processing}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
              >
                {processing
                  ? 'Processing Payment...'
                  : `Authorize $${payingAppointment.feeAmount}.00 Payment`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
