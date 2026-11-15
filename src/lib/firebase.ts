import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

export async function signInWithGoogleFirebase() {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        displayName: user.displayName || 'MedLink User',
        role: 'patient',
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    await setDoc(
      doc(db, 'users', user.uid, 'private', 'info'),
      {
        uid: user.uid,
        email: user.email || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    // Non-blocking if user record already exists with admin/immutable createdAt
    console.warn('Firebase profile sync notice:', error);
  }
  return user;
}

export async function signOutFirebase() {
  await signOut(auth);
}

export async function syncDoctorToFirestore(input: {
  id: string;
  name: string;
  specialty: string;
  licenseNumber: string;
  consultationFee: number;
  clinicLocation: string;
  isActive: boolean;
}) {
  if (!auth.currentUser) return;
  const path = `doctors/${input.id}`;
  try {
    await setDoc(doc(db, 'doctors', input.id), {
      id: input.id,
      name: input.name.slice(0, 120),
      specialty: input.specialty.slice(0, 80),
      licenseNumber: input.licenseNumber.slice(0, 64),
      consultationFee: Number(input.consultationFee),
      clinicLocation: input.clinicLocation.slice(0, 160),
      isActive: input.isActive,
      createdByUid: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncAppointmentToFirestore(input: {
  id: string;
  doctorId: string;
  doctorName: string;
  scheduledDate: string;
  scheduledTime: string;
  reason: string;
  feeAmount: number;
  paymentStatus: 'unpaid' | 'paid';
  status: 'pending_payment' | 'confirmed' | 'in_call' | 'completed' | 'cancelled';
}) {
  if (!auth.currentUser) return;
  const path = `appointments/${input.id}`;
  try {
    await setDoc(
      doc(db, 'appointments', input.id),
      {
        id: input.id,
        patientUid: auth.currentUser.uid,
        doctorId: input.doctorId,
        doctorName: input.doctorName.slice(0, 120),
        scheduledDate: input.scheduledDate.slice(0, 20),
        scheduledTime: input.scheduledTime.slice(0, 16),
        reason: input.reason.slice(0, 500),
        feeAmount: Number(input.feeAmount),
        paymentStatus: input.paymentStatus,
        status: input.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
