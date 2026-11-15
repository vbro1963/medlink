import { pgTable, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  role: text().notNull(),
  phone: text(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const doctors = pgTable('doctors', {
  id: text().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text().notNull(),
  email: text().notNull(),
  specialty: text().notNull(),
  licenseNumber: text('license_number').notNull(),
  consultationFee: integer('consultation_fee').notNull(),
  experienceYears: integer('experience_years').notNull(),
  languages: text().array().notNull(),
  clinicLocation: text('clinic_location').notNull(),
  bio: text().notNull(),
  availableSlots: text('available_slots').array().notNull(),
  avatarKey: text('avatar_key').notNull().default('default'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const appointments = pgTable(
  'appointments',
  {
    id: text().primaryKey(),
    patientId: text('patient_id')
      .notNull()
      .references(() => users.id),
    patientName: text('patient_name').notNull(),
    patientEmail: text('patient_email').notNull(),
    doctorId: text('doctor_id')
      .notNull()
      .references(() => doctors.id),
    doctorUserId: text('doctor_user_id').notNull(),
    doctorName: text('doctor_name').notNull(),
    doctorSpecialty: text('doctor_specialty').notNull(),
    scheduledDate: text('scheduled_date').notNull(),
    scheduledTime: text('scheduled_time').notNull(),
    scheduledIso: text('scheduled_iso').notNull(),
    reason: text().notNull(),
    feeAmount: integer('fee_amount').notNull(),
    paymentStatus: text('payment_status').notNull(),
    status: text().notNull(),
    clinicalNotes: text('clinical_notes'),
    prescription: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [index('appointments_patient_idx').on(t.patientId), index('appointments_doctor_user_idx').on(t.doctorUserId)]
);

export const payments = pgTable('payments', {
  id: text().primaryKey(),
  appointmentId: text('appointment_id')
    .notNull()
    .unique()
    .references(() => appointments.id),
  patientId: text('patient_id').notNull(),
  amount: integer().notNull(),
  currency: text().notNull().default('USD'),
  method: text().notNull(),
  last4: text(),
  transactionRef: text('transaction_ref').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
