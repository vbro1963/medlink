import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const TOKEN_KEY = 'medlink_jwt';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  'http://10.0.2.2:3000';

export const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  (Constants.expoConfig?.extra?.wsUrl as string) ||
  'ws://10.0.2.2:3000/ws';

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data as T;
}

export const mobileApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; role: 'admin' | 'doctor' | 'patient' } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  registerPatient: (payload: { name: string; email: string; password: string; phone?: string }) =>
    request<{ token: string; user: { id: string; name: string; role: 'patient' } }>(
      '/api/auth/register',
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  registerDoctor: (payload: {
    name: string;
    email: string;
    password: string;
    specialty: string;
    licenseNumber: string;
    consultationFee: number;
  }) =>
    request('/api/admin/doctors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listDoctors: () => request<{ doctors: any[] }>('/api/doctors'),
  listAppointments: () => request<{ appointments: any[] }>('/api/appointments'),
  bookAppointment: (payload: {
    doctorId: string;
    scheduledDate: string;
    scheduledTime: string;
    reason: string;
  }) =>
    request<{ appointment: any }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  payConsultationFee: (appointmentId: string, method: 'card' | 'upi', cardNumber?: string) =>
    request<{ appointment: any }>(`/api/appointments/${appointmentId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ method, cardNumber }),
    }),
};
