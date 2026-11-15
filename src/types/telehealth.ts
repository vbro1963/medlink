export type UserRole = 'admin' | 'doctor' | 'patient';

export type AvatarKey =
  | 'cardiology'
  | 'dermatology'
  | 'pediatrics'
  | 'neurology'
  | 'default';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  licenseNumber: string;
  consultationFee: number;
  experienceYears: number;
  languages: string[];
  clinicLocation: string;
  bio: string;
  availableSlots: string[];
  avatarKey: AvatarKey;
  isActive: boolean;
  createdAt: string;
}

export type AppointmentStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'in_call'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface PaymentRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  currency: string;
  method: 'card' | 'upi' | 'wallet';
  last4?: string;
  transactionRef: string;
  paidAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorUserId: string;
  doctorName: string;
  doctorSpecialty: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledIso: string;
  reason: string;
  feeAmount: number;
  paymentStatus: PaymentStatus;
  status: AppointmentStatus;
  payment?: PaymentRecord;
  clinicalNotes?: string;
  prescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CallChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  sentAt: string;
}

export interface AdminOverviewStats {
  totalDoctors: number;
  activeDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  paidRevenue: number;
  liveCalls: number;
}
