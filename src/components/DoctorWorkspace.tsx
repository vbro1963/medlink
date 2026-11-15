import { useEffect, useState } from 'react';
import { Video, CalendarClock, FileText, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { VoiceRecorderButton } from './VoiceRecorderButton';
import type { Appointment, PublicUser } from '../types/telehealth';

interface DoctorWorkspaceProps {
  user: PublicUser;
  onJoinVideoCall: (appointment: Appointment) => void;
}

export function DoctorWorkspace({ user, onJoinVideoCall }: DoctorWorkspaceProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'completed'>('upcoming');
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);

  const loadAppointments = async () => {
    try {
      const res = await api.listAppointments();
      setAppointments(res.appointments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const upcomingList = appointments.filter(
    (a) => a.status !== 'completed' && a.status !== 'cancelled'
  );
  const completedList = appointments.filter((a) => a.status === 'completed');
  const visibleList = filter === 'upcoming' ? upcomingList : completedList;

  const openNotesModal = (apt: Appointment) => {
    setEditingApt(apt);
    setNotes(apt.clinicalNotes || '');
    setPrescription(apt.prescription || '');
    setDictationError(null);
  };

  const saveClinicalNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApt) return;
    setSavingNotes(true);
    try {
      await api.updateAppointmentStatus(editingApt.id, {
        status: 'completed',
        clinicalNotes: notes,
        prescription,
      });
      setEditingApt(null);
      await loadAppointments();
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">Physician Consultation Queue</p>
          <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">
            {user.name}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {upcomingList.length} upcoming consultations · {completedList.length} completed
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setFilter('upcoming')}
            className={`min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'upcoming'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming ({upcomingList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`min-h-[40px] px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'completed'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedList.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          Loading physician appointments...
        </div>
      ) : visibleList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <CalendarClock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="font-display font-semibold text-slate-900">
            No {filter} appointments
          </p>
          <p className="text-sm text-slate-500 mt-1">
            When patients book and pay their consultation fee, appointments appear here immediately.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleList.map((apt) => {
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
                        {apt.patientName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        {apt.scheduledDate} at {apt.scheduledTime} · {apt.patientEmail}
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
                        {isPaid ? 'Fee Paid' : 'Pending Fee'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-700 leading-relaxed">{apt.reason}</p>

                  {apt.clinicalNotes && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <p>
                        <strong className="text-slate-800">Notes:</strong> {apt.clinicalNotes}
                      </p>
                      {apt.prescription && (
                        <p>
                          <strong className="text-slate-800">Rx:</strong> {apt.prescription}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified · {apt.payment?.transactionRef || 'Confirmed'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <Clock className="w-4 h-4" />
                      Waiting for patient fee payment
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openNotesModal(apt)}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      Clinical Notes
                    </button>

                    {apt.status !== 'completed' && (
                      <button
                        type="button"
                        disabled={!isPaid}
                        onClick={() => onJoinVideoCall(apt)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Video className="w-4 h-4" />
                        Join Video Call
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editingApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Clinical Summary · {editingApt.patientName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {editingApt.scheduledDate} at {editingApt.scheduledTime}
            </p>

            {dictationError && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {dictationError}
              </div>
            )}

            <form onSubmit={saveClinicalNotes} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Consultation Findings & Assessment
                  </label>
                  <VoiceRecorderButton
                    label="Dictate Notes"
                    prompt="Transcribe physician clinical notes accurately."
                    onTranscript={(t) => {
                      setDictationError(null);
                      setNotes((prev) => (prev ? `${prev} ${t}` : t));
                    }}
                    onError={(msg) => setDictationError(msg)}
                  />
                </div>
                <textarea
                  rows={3}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter clinical assessment and follow-up plan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Prescription / Care Instructions
                </label>
                <textarea
                  rows={2}
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="Medication dosage or care plan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingApt(null)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
                >
                  {savingNotes ? 'Saving...' : 'Save & Complete Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
