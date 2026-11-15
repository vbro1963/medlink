# MedLink Telehealth Firestore Security Specification

## 1. Data Invariants
1. **Default Deny**: All unmatched paths deny read and write (`match /{document=**} { allow read, write: if false; }`).
2. **PII Isolation**: User email and phone are stored strictly in `/users/{userId}/private/info` and readable only by the owner (`request.auth.uid == userId`) or verified admin (`isAdmin()`).
3. **Self-Assigned Role Prevention**: During `/users/{userId}` creation, non-admin users may only create documents with `role == 'patient'`.
4. **Admin-Only Doctor Registry**: Only verified admins (`exists(/databases/.../admins/$(uid))` or verified bootstrapped admin `srinivas.mtec.uk@gmail.com`) can create or update `/doctors/{doctorId}`.
5. **Appointment Ownership & Terminal Lock**: Patients can create `/appointments/{appointmentId}` only with `patientUid == request.auth.uid`, `paymentStatus == 'unpaid'`, and `status == 'pending_payment'`. Once `status == 'completed'`, non-admins cannot mutate the record.
6. **Temporal Integrity & Size Bounds**: Every string field enforces `.size()` limits, every ID validates `^[a-zA-Z0-9_\-]+$`, and `createdAt`/`updatedAt` match `request.time`.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read on `/appointments/{id}`.
2. Unverified email token (`email_verified: false`) attempting to write `/doctors/{id}` even if email matches admin.
3. Non-admin patient attempting to self-assign `role: "admin"` on `/users/{uid}` create.
4. Non-admin user attempting to update their own `role` field on `/users/{uid}`.
5. Non-owner user attempting `get` on `/users/{otherUid}/private/info`.
6. Unscoped `list` query on `/appointments` without matching `patientUid == request.auth.uid` (for non-admin).
7. Shadow field injection (`isVerified: true`) on `/appointments/{id}` create.
8. Oversized string (> 500 chars) in `appointment.reason` (Denial of Wallet guard).
9. Malicious 1.5KB path ID `{appointmentId}` failing `isValidId()`.
10. Patient attempting to create an appointment directly with `paymentStatus: "paid"` and `status: "confirmed"`.
11. Modifying immutable `patientUid` or `createdAt` during an appointment update.
12. Mutating an appointment after `status` reaches terminal `'completed'` (non-admin).
