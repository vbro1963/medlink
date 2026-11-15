import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type {
  Appointment,
  AvatarKey,
  DoctorProfile,
  PaymentRecord,
  PublicUser,
  UserRole,
} from '../src/types/telehealth.ts';
import { db } from '../db/index.ts';
import { appointments, doctors, payments, users } from '../db/schema.ts';

export interface StoredUser extends PublicUser {
  passwordHash: string;
}

export interface ClinicDatabase {
  users: StoredUser[];
  doctors: DoctorProfile[];
  appointments: Appointment[];
  payments: PaymentRecord[];
}

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

type UserRow = typeof users.$inferSelect;
type DoctorRow = typeof doctors.$inferSelect;
type AppointmentRow = typeof appointments.$inferSelect;
type PaymentRow = typeof payments.$inferSelect;

function iso(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function toStoredUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    phone: row.phone ?? undefined,
    passwordHash: row.passwordHash,
    createdAt: iso(row.createdAt),
  };
}

function toDoctor(row: DoctorRow): DoctorProfile {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    specialty: row.specialty,
    licenseNumber: row.licenseNumber,
    consultationFee: row.consultationFee,
    experienceYears: row.experienceYears,
    languages: row.languages,
    clinicLocation: row.clinicLocation,
    bio: row.bio,
    availableSlots: row.availableSlots,
    avatarKey: row.avatarKey as AvatarKey,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
  };
}

function toPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    patientId: row.patientId,
    amount: row.amount,
    currency: row.currency,
    method: row.method as PaymentRecord['method'],
    last4: row.last4 ?? undefined,
    transactionRef: row.transactionRef,
    paidAt: iso(row.paidAt),
  };
}

function toAppointment(row: AppointmentRow, payment?: PaymentRow | null): Appointment {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patientName,
    patientEmail: row.patientEmail,
    doctorId: row.doctorId,
    doctorUserId: row.doctorUserId,
    doctorName: row.doctorName,
    doctorSpecialty: row.doctorSpecialty,
    scheduledDate: row.scheduledDate,
    scheduledTime: row.scheduledTime,
    scheduledIso: row.scheduledIso,
    reason: row.reason,
    feeAmount: row.feeAmount,
    paymentStatus: row.paymentStatus as Appointment['paymentStatus'],
    status: row.status as Appointment['status'],
    payment: payment ? toPayment(payment) : undefined,
    clinicalNotes: row.clinicalNotes ?? undefined,
    prescription: row.prescription ?? undefined,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

let seedPromise: Promise<void> | null = null;

/** Seeds the demo accounts, doctors and appointments the first time the database is empty. */
async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const [{ value }] = await db.select({ value: count() }).from(users);
      if (value > 0) return;
      const seed = createInitialSeed();
      await db.insert(users).values(seed.users).onConflictDoNothing();
      await db.insert(doctors).values(seed.doctors).onConflictDoNothing();
      await db
        .insert(appointments)
        .values(seed.appointments.map(({ payment: _p, ...rest }) => rest))
        .onConflictDoNothing();
      await db.insert(payments).values(seed.payments).onConflictDoNothing();
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

class ClinicStore {
  public toPublicUser(user: StoredUser): PublicUser {
    const { passwordHash: _ignored, ...rest } = user;
    return rest;
  }

  public async findUserByEmail(email: string): Promise<StoredUser | undefined> {
    await ensureSeeded();
    const normalized = email.trim().toLowerCase();
    const [row] = await db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, normalized))
      .limit(1);
    return row ? toStoredUser(row) : undefined;
  }

  public async findUserById(id: string): Promise<StoredUser | undefined> {
    await ensureSeeded();
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toStoredUser(row) : undefined;
  }

  public async createPatientUser(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<PublicUser> {
    await ensureSeeded();
    const [row] = await db
      .insert(users)
      .values({
        id: `usr_pat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: 'patient',
        phone: input.phone?.trim() || null,
        passwordHash: bcrypt.hashSync(input.password, 8),
        createdAt: new Date().toISOString(),
      })
      .returning();
    return this.toPublicUser(toStoredUser(row));
  }

  public async registerDoctor(input: {
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
  }): Promise<DoctorProfile> {
    await ensureSeeded();
    const nowIso = new Date().toISOString();
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const userId = `usr_doc_${suffix}`;
    const email = input.email.trim().toLowerCase();

    return db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        name: input.name.trim(),
        email,
        role: 'doctor',
        phone: input.phone?.trim() || null,
        passwordHash: bcrypt.hashSync(input.password, 8),
        createdAt: nowIso,
      });
      const [row] = await tx
        .insert(doctors)
        .values({
          id: `doc_${suffix}`,
          userId,
          name: input.name.trim(),
          email,
          specialty: input.specialty.trim(),
          licenseNumber: input.licenseNumber.trim(),
          consultationFee: Math.round(Number(input.consultationFee)),
          experienceYears: Math.round(Number(input.experienceYears)),
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
        })
        .returning();
      return toDoctor(row);
    });
  }

  public async listDoctors(includeInactive = false): Promise<DoctorProfile[]> {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(doctors)
      .where(includeInactive ? undefined : eq(doctors.isActive, true))
      .orderBy(desc(doctors.createdAt), asc(doctors.id));
    return rows.map(toDoctor);
  }

  public async findDoctorById(doctorId: string): Promise<DoctorProfile | undefined> {
    await ensureSeeded();
    const [row] = await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);
    return row ? toDoctor(row) : undefined;
  }

  public async updateDoctor(
    doctorId: string,
    patch: Partial<Pick<DoctorProfile, 'consultationFee' | 'isActive' | 'availableSlots'>>
  ): Promise<DoctorProfile | undefined> {
    await ensureSeeded();
    const changes: Partial<typeof doctors.$inferInsert> = {};
    if (typeof patch.consultationFee === 'number' && patch.consultationFee > 0) {
      changes.consultationFee = Math.round(patch.consultationFee);
    }
    if (typeof patch.isActive === 'boolean') {
      changes.isActive = patch.isActive;
    }
    if (Array.isArray(patch.availableSlots)) {
      changes.availableSlots = patch.availableSlots;
    }
    if (Object.keys(changes).length === 0) {
      return this.findDoctorById(doctorId);
    }
    const [row] = await db.update(doctors).set(changes).where(eq(doctors.id, doctorId)).returning();
    return row ? toDoctor(row) : undefined;
  }

  public async listAppointmentsForUser(user: { id: string; role: UserRole }): Promise<Appointment[]> {
    await ensureSeeded();
    const filter =
      user.role === 'admin'
        ? undefined
        : user.role === 'doctor'
          ? eq(appointments.doctorUserId, user.id)
          : eq(appointments.patientId, user.id);
    const rows = await db
      .select()
      .from(appointments)
      .leftJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(filter)
      .orderBy(desc(appointments.createdAt));
    return rows.map((r) => toAppointment(r.appointments, r.payments));
  }

  public async findAppointmentById(id: string): Promise<Appointment | undefined> {
    await ensureSeeded();
    const [row] = await db
      .select()
      .from(appointments)
      .leftJoin(payments, eq(payments.appointmentId, appointments.id))
      .where(eq(appointments.id, id))
      .limit(1);
    return row ? toAppointment(row.appointments, row.payments) : undefined;
  }

  public async createAppointment(input: {
    patient: StoredUser;
    doctor: DoctorProfile;
    scheduledDate: string;
    scheduledTime: string;
    reason: string;
  }): Promise<Appointment> {
    const nowIso = new Date().toISOString();
    const [row] = await db
      .insert(appointments)
      .values({
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
      })
      .returning();
    return toAppointment(row);
  }

  public async payAppointment(input: {
    appointmentId: string;
    patientId: string;
    method: 'card' | 'upi' | 'wallet';
    last4?: string;
  }): Promise<Appointment | undefined> {
    const nowIso = new Date().toISOString();
    return db.transaction(async (tx) => {
      const [apt] = await tx
        .update(appointments)
        .set({ paymentStatus: 'paid', status: 'confirmed', updatedAt: nowIso })
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.paymentStatus, 'unpaid')))
        .returning();
      if (!apt) return undefined;
      const [payment] = await tx
        .insert(payments)
        .values({
          id: `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
          appointmentId: apt.id,
          patientId: input.patientId,
          amount: apt.feeAmount,
          currency: 'USD',
          method: input.method,
          last4: input.last4 ?? null,
          transactionRef: `TXN-MLK-${Math.floor(100000 + Math.random() * 900000)}`,
          paidAt: nowIso,
        })
        .returning();
      return toAppointment(apt, payment);
    });
  }

  public async updateAppointmentStatus(input: {
    appointmentId: string;
    status?: Appointment['status'];
    clinicalNotes?: string;
    prescription?: string;
  }): Promise<Appointment | undefined> {
    const changes: Partial<typeof appointments.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.status) changes.status = input.status;
    if (typeof input.clinicalNotes === 'string') changes.clinicalNotes = input.clinicalNotes;
    if (typeof input.prescription === 'string') changes.prescription = input.prescription;
    const [row] = await db
      .update(appointments)
      .set(changes)
      .where(eq(appointments.id, input.appointmentId))
      .returning({ id: appointments.id });
    if (!row) return undefined;
    return this.findAppointmentById(row.id);
  }

  public async getAdminStats(liveRoomCount: number) {
    await ensureSeeded();
    const [doctorStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${doctors.isActive})`.mapWith(Number),
      })
      .from(doctors);
    const [patientStats] = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.role, 'patient'));
    const [appointmentStats] = await db.select({ total: count() }).from(appointments);
    const [revenue] = await db
      .select({ sum: sql<number>`coalesce(sum(${payments.amount}), 0)`.mapWith(Number) })
      .from(payments);
    return {
      totalDoctors: doctorStats.total,
      activeDoctors: doctorStats.active,
      totalPatients: patientStats.total,
      totalAppointments: appointmentStats.total,
      paidRevenue: revenue.sum,
      liveCalls: liveRoomCount,
    };
  }
}

export const clinicStore = new ClinicStore();
