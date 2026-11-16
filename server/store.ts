import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type {
  Appointment,
  AvatarKey,
  DoctorProfile,
  PaymentRecord,
  PublicUser,
  UserRole,
} from '../src/types/telehealth.ts';

export interface StoredUser extends PublicUser {
  passwordHash: string;
}

export interface ClinicDatabase {
  users: StoredUser[];
  doctors: DoctorProfile[];
  appointments: Appointment[];
  payments: PaymentRecord[];
}

function resolveDataDir(): string {
  const configuredDir = process.env.MEDLINK_DATA_DIR;
  const projectDir = configuredDir
    ? path.resolve(configuredDir)
    : path.resolve(process.cwd(), 'data');

  try {
    fs.mkdirSync(projectDir, { recursive: true });
    const probeFile = path.join(projectDir, `.write-test-${process.pid}`);
    fs.writeFileSync(probeFile, '');
    fs.unlinkSync(probeFile);
    return projectDir;
  } catch {
    const temporaryDir = path.join(os.tmpdir(), 'medlink-data');
    fs.mkdirSync(temporaryDir, { recursive: true });
    return temporaryDir;
  }
}

const DATA_DIR = resolveDataDir();
const DB_FILE = path.join(DATA_DIR, 'clinic-db.json');

function formatTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatCurrentSlotLabel(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const min = now.getMinutes() < 30 ? '00' : '30';
  return `${h}:${min}`;
}

function createInitialSeed(): ClinicDatabase {
  const nowIso = new Date().toISOString();
  const today = formatTodayDate();
  const currentSlot = formatCurrentSlotLabel();

  const adminPass = bcrypt.hashSync('Admin@123', 8);
  const doctorPass = bcrypt.hashSync('Doctor@123', 8);
  const patientPass = bcrypt.hashSync('Patient@123', 8);

  const users: StoredUser[] = [
    {
      id: 'usr_admin_1',
      name: 'Elena Vance',
      email: 'admin@medlink.health',
      role: 'admin',
      phone: '+1 (415) 555-0101',
      passwordHash: adminPass,
      createdAt: nowIso,
    },
    {
      id: 'usr_doc_1',
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@medlink.health',
      role: 'doctor',
      phone: '+1 (415) 555-0142',
      passwordHash: doctorPass,
      createdAt: nowIso,
    },
    {
      id: 'usr_doc_2',
      name: 'Dr. Kenneth Liu',
      email: 'kenneth.liu@medlink.health',
      role: 'doctor',
      phone: '+1 (415) 555-0143',
      passwordHash: doctorPass,
      createdAt: nowIso,
    },
    {
      id: 'usr_doc_3',
      name: 'Dr. Alyah Davies',
      email: 'alyah.davies@medlink.health',
      role: 'doctor',
      phone: '+1 (415) 555-0144',
      passwordHash: doctorPass,
      createdAt: nowIso,
    },
    {
      id: 'usr_doc_4',
      name: 'Dr. Omar Al-Fayed',
      email: 'omar.alfayed@medlink.health',
      role: 'doctor',
      phone: '+1 (415) 555-0145',
      passwordHash: doctorPass,
      createdAt: nowIso,
    },
    {
      id: 'usr_pat_1',
      name: 'Marcus Bennett',
      email: 'patient@medlink.health',
      role: 'patient',
      phone: '+1 (415) 555-0199',
      passwordHash: patientPass,
      createdAt: nowIso,
    },
  ];

  const doctors: DoctorProfile[] = [
    {
      id: 'doc_1',
      userId: 'usr_doc_1',
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@medlink.health',
      specialty: 'Cardiology',
      licenseNumber: 'MD-CA-88412',
      consultationFee: 85,
      experienceYears: 12,
      languages: ['English', 'Hindi'],
      clinicLocation: 'San Francisco Heart & Vascular',
      bio: 'Board-certified clinical cardiologist specializing in preventive cardiology, hypertension management, and ECG follow-up consultations.',
      availableSlots: [currentSlot, '09:30', '11:00', '14:30', '16:00', '17:30'],
      avatarKey: 'cardiology',
      isActive: true,
      createdAt: nowIso,
    },
    {
      id: 'doc_2',
      userId: 'usr_doc_2',
      name: 'Dr. Kenneth Liu',
      email: 'kenneth.liu@medlink.health',
      specialty: 'Dermatology',
      licenseNumber: 'MD-CA-79204',
      consultationFee: 75,
      experienceYears: 9,
      languages: ['English', 'Mandarin'],
      clinicLocation: 'Pacific Clinical Dermatology',
      bio: 'Medical dermatologist focused on teledermatology triage, eczema, acne regimens, and lesion screenings.',
      availableSlots: ['10:00', '11:30', '13:30', '15:00', '16:30'],
      avatarKey: 'dermatology',
      isActive: true,
      createdAt: nowIso,
    },
    {
      id: 'doc_3',
      userId: 'usr_doc_3',
      name: 'Dr. Alyah Davies',
      email: 'alyah.davies@medlink.health',
      specialty: 'Pediatrics',
      licenseNumber: 'MD-NY-65119',
      consultationFee: 65,
      experienceYears: 11,
      languages: ['English', 'French'],
      clinicLocation: 'Harbor Children & Family Care',
      bio: 'Pediatrician offering same-day virtual sick visits, childhood immunization guidance, and developmental check-ins.',
      availableSlots: ['09:00', '10:30', '14:00', '15:30', '17:00'],
      avatarKey: 'pediatrics',
      isActive: true,
      createdAt: nowIso,
    },
    {
      id: 'doc_4',
      userId: 'usr_doc_4',
      name: 'Dr. Omar Al-Fayed',
      email: 'omar.alfayed@medlink.health',
      specialty: 'Neurology',
      licenseNumber: 'MD-MA-91034',
      consultationFee: 110,
      experienceYears: 15,
      languages: ['English', 'Arabic'],
      clinicLocation: 'Beacon Neurosciences Center',
      bio: 'Clinical neurologist specializing in migraine therapy, sleep neurology, and post-concussion follow-up.',
      availableSlots: ['10:00', '12:00', '15:00', '16:30'],
      avatarKey: 'neurology',
      isActive: true,
      createdAt: nowIso,
    },
  ];

  const payment1: PaymentRecord = {
    id: 'pay_seed_1',
    appointmentId: 'apt_live_demo',
    patientId: 'usr_pat_1',
    amount: 85,
    currency: 'USD',
    method: 'card',
    last4: '4242',
    transactionRef: 'TXN-MLK-904812',
    paidAt: nowIso,
  };

  const payment2: PaymentRecord = {
    id: 'pay_seed_2',
    appointmentId: 'apt_past_demo',
    patientId: 'usr_pat_1',
    amount: 75,
    currency: 'USD',
    method: 'upi',
    transactionRef: 'TXN-MLK-882104',
    paidAt: nowIso,
  };

  const appointments: Appointment[] = [
    {
      id: 'apt_live_demo',
      patientId: 'usr_pat_1',
      patientName: 'Marcus Bennett',
      patientEmail: 'patient@medlink.health',
      doctorId: 'doc_1',
      doctorUserId: 'usr_doc_1',
      doctorName: 'Dr. Priya Sharma',
      doctorSpecialty: 'Cardiology',
      scheduledDate: today,
      scheduledTime: currentSlot,
      scheduledIso: nowIso,
      reason: 'Blood pressure medication review and resting heart rate follow-up.',
      feeAmount: 85,
      paymentStatus: 'paid',
      status: 'confirmed',
      payment: payment1,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'apt_unpaid_demo',
      patientId: 'usr_pat_1',
      patientName: 'Marcus Bennett',
      patientEmail: 'patient@medlink.health',
      doctorId: 'doc_4',
      doctorUserId: 'usr_doc_4',
      doctorName: 'Dr. Omar Al-Fayed',
      doctorSpecialty: 'Neurology',
      scheduledDate: today,
      scheduledTime: '16:30',
      scheduledIso: `${today}T16:30:00`,
      reason: 'Recurring tension headaches over the past two weeks.',
      feeAmount: 110,
      paymentStatus: 'unpaid',
      status: 'pending_payment',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'apt_past_demo',
      patientId: 'usr_pat_1',
      patientName: 'Marcus Bennett',
      patientEmail: 'patient@medlink.health',
      doctorId: 'doc_2',
      doctorUserId: 'usr_doc_2',
      doctorName: 'Dr. Kenneth Liu',
      doctorSpecialty: 'Dermatology',
      scheduledDate: today,
      scheduledTime: '09:00',
      scheduledIso: `${today}T09:00:00`,
      reason: 'Seasonal eczema flare-up on forearms.',
      feeAmount: 75,
      paymentStatus: 'paid',
      status: 'completed',
      payment: payment2,
      clinicalNotes: 'Mild atopic dermatitis. Advised daily fragrance-free ceramide emollient and short course topical hydrocortisone 1%.',
      prescription: 'Hydrocortisone 1% cream BID x 7 days; Cetaphil Restoraderm daily.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return {
    users,
    doctors,
    appointments,
    payments: [payment1, payment2],
  };
}

class ClinicStore {
  private db: ClinicDatabase;

  constructor() {
    this.db = this.load();
  }

  private load(): ClinicDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as ClinicDatabase;
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.doctors)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Initializing fresh clinic database:', err);
    }
    const seed = createInitialSeed();
    this.persist(seed);
    return seed;
  }

  private persist(nextDb: ClinicDatabase = this.db): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(nextDb, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  }

  public toPublicUser(user: StoredUser): PublicUser {
    const { passwordHash: _ignored, ...rest } = user;
    return rest;
  }

  public findUserByEmail(email: string): StoredUser | undefined {
    const normalized = email.trim().toLowerCase();
    return this.db.users.find((u) => u.email.toLowerCase() === normalized);
  }

  public findUserById(id: string): StoredUser | undefined {
    return this.db.users.find((u) => u.id === id);
  }

  public createPatientUser(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): PublicUser {
    const id = `usr_pat_${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const user: StoredUser = {
      id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: 'patient',
      phone: input.phone?.trim(),
      passwordHash: bcrypt.hashSync(input.password, 8),
      createdAt: nowIso,
    };
    this.db.users.push(user);
    this.persist();
    return this.toPublicUser(user);
  }

  public registerDoctor(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    specialty: string;
    licenseNumber: string;
    consultationFee: number;
    experienceYears: number;
    languages: string[];
    clinicLocation: string;
    bio: string;
    availableSlots: string[];
    avatarKey?: AvatarKey;
  }): DoctorProfile {
    const nowIso = new Date().toISOString();
    const userId = `usr_doc_${Date.now().toString(36)}`;
    const doctorId = `doc_${Date.now().toString(36)}`;

    const user: StoredUser = {
      id: userId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: 'doctor',
      phone: input.phone?.trim(),
      passwordHash: bcrypt.hashSync(input.password, 8),
      createdAt: nowIso,
    };

    const doctor: DoctorProfile = {
      id: doctorId,
      userId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      specialty: input.specialty.trim(),
      licenseNumber: input.licenseNumber.trim(),
      consultationFee: Number(input.consultationFee),
      experienceYears: Number(input.experienceYears),
      languages: input.languages.length > 0 ? input.languages : ['English'],
      clinicLocation: input.clinicLocation.trim() || 'MedLink Virtual Clinic',
      bio: input.bio.trim(),
      availableSlots:
        input.availableSlots.length > 0
          ? input.availableSlots
          : ['09:30', '11:00', '14:00', '16:00'],
      avatarKey: input.avatarKey ?? 'default',
      isActive: true,
      createdAt: nowIso,
    };

    this.db.users.push(user);
    this.db.doctors.unshift(doctor);
    this.persist();
    return doctor;
  }

  public listDoctors(includeInactive = false): DoctorProfile[] {
    if (includeInactive) return [...this.db.doctors];
    return this.db.doctors.filter((d) => d.isActive);
  }

  public findDoctorById(doctorId: string): DoctorProfile | undefined {
    return this.db.doctors.find((d) => d.id === doctorId);
  }

  public updateDoctor(
    doctorId: string,
    patch: Partial<Pick<DoctorProfile, 'consultationFee' | 'isActive' | 'availableSlots'>>
  ): DoctorProfile | undefined {
    const doc = this.db.doctors.find((d) => d.id === doctorId);
    if (!doc) return undefined;
    if (typeof patch.consultationFee === 'number' && patch.consultationFee > 0) {
      doc.consultationFee = patch.consultationFee;
    }
    if (typeof patch.isActive === 'boolean') {
      doc.isActive = patch.isActive;
    }
    if (Array.isArray(patch.availableSlots)) {
      doc.availableSlots = patch.availableSlots;
    }
    this.persist();
    return doc;
  }

  public listAppointmentsForUser(user: { id: string; role: UserRole }): Appointment[] {
    let items: Appointment[];
    if (user.role === 'admin') {
      items = [...this.db.appointments];
    } else if (user.role === 'doctor') {
      items = this.db.appointments.filter((a) => a.doctorUserId === user.id);
    } else {
      items = this.db.appointments.filter((a) => a.patientId === user.id);
    }
    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public findAppointmentById(id: string): Appointment | undefined {
    return this.db.appointments.find((a) => a.id === id);
  }

  public createAppointment(input: {
    patient: StoredUser;
    doctor: DoctorProfile;
    scheduledDate: string;
    scheduledTime: string;
    reason: string;
  }): Appointment {
    const nowIso = new Date().toISOString();
    const appointment: Appointment = {
      id: `apt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      patientId: input.patient.id,
      patientName: input.patient.name,
      patientEmail: input.patient.email,
      doctorId: input.doctor.id,
      doctorUserId: input.doctor.userId,
      doctorName: input.doctor.name,
      doctorSpecialty: input.doctor.specialty,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      scheduledIso: `${input.scheduledDate}T${input.scheduledTime}:00`,
      reason: input.reason.trim(),
      feeAmount: input.doctor.consultationFee,
      paymentStatus: 'unpaid',
      status: 'pending_payment',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.db.appointments.unshift(appointment);
    this.persist();
    return appointment;
  }

  public payAppointment(input: {
    appointmentId: string;
    patientId: string;
    method: 'card' | 'upi' | 'wallet';
    last4?: string;
  }): Appointment | undefined {
    const apt = this.db.appointments.find((a) => a.id === input.appointmentId);
    if (!apt) return undefined;

    const nowIso = new Date().toISOString();
    const payment: PaymentRecord = {
      id: `pay_${Date.now().toString(36)}`,
      appointmentId: apt.id,
      patientId: input.patientId,
      amount: apt.feeAmount,
      currency: 'USD',
      method: input.method,
      last4: input.last4,
      transactionRef: `TXN-MLK-${Math.floor(100000 + Math.random() * 900000)}`,
      paidAt: nowIso,
    };

    apt.paymentStatus = 'paid';
    apt.status = 'confirmed';
    apt.payment = payment;
    apt.updatedAt = nowIso;
    this.db.payments.unshift(payment);
    this.persist();
    return apt;
  }

  public updateAppointmentStatus(input: {
    appointmentId: string;
    status?: Appointment['status'];
    clinicalNotes?: string;
    prescription?: string;
  }): Appointment | undefined {
    const apt = this.db.appointments.find((a) => a.id === input.appointmentId);
    if (!apt) return undefined;
    if (input.status) {
      apt.status = input.status;
    }
    if (typeof input.clinicalNotes === 'string') {
      apt.clinicalNotes = input.clinicalNotes;
    }
    if (typeof input.prescription === 'string') {
      apt.prescription = input.prescription;
    }
    apt.updatedAt = new Date().toISOString();
    this.persist();
    return apt;
  }

  public getAdminStats(liveRoomCount: number) {
    const paidRevenue = this.db.payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      totalDoctors: this.db.doctors.length,
      activeDoctors: this.db.doctors.filter((d) => d.isActive).length,
      totalPatients: this.db.users.filter((u) => u.role === 'patient').length,
      totalAppointments: this.db.appointments.length,
      paidRevenue,
      liveCalls: liveRoomCount,
    };
  }
}

export const clinicStore = new ClinicStore();
