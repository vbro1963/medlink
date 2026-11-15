CREATE TABLE "appointments" (
	"id" text PRIMARY KEY,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"patient_email" text NOT NULL,
	"doctor_id" text NOT NULL,
	"doctor_user_id" text NOT NULL,
	"doctor_name" text NOT NULL,
	"doctor_specialty" text NOT NULL,
	"scheduled_date" text NOT NULL,
	"scheduled_time" text NOT NULL,
	"scheduled_iso" text NOT NULL,
	"reason" text NOT NULL,
	"fee_amount" integer NOT NULL,
	"payment_status" text NOT NULL,
	"status" text NOT NULL,
	"clinical_notes" text,
	"prescription" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"specialty" text NOT NULL,
	"license_number" text NOT NULL,
	"consultation_fee" integer NOT NULL,
	"experience_years" integer NOT NULL,
	"languages" text[] NOT NULL,
	"clinic_location" text NOT NULL,
	"bio" text NOT NULL,
	"available_slots" text[] NOT NULL,
	"avatar_key" text DEFAULT 'default' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY,
	"appointment_id" text NOT NULL UNIQUE,
	"patient_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"method" text NOT NULL,
	"last4" text,
	"transaction_ref" text NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"role" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "appointments_patient_idx" ON "appointments" ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_doctor_user_idx" ON "appointments" ("doctor_user_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_users_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id");--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");