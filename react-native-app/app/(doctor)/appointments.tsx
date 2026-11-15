import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApi } from '../../src/services/api';

export default function DoctorAppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    mobileApi.listAppointments().then((res) => setAppointments(res.appointments));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Physician Schedule</Text>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.meta}>
              {item.scheduledDate} · {item.scheduledTime} · ${item.feeAmount} ({item.paymentStatus})
            </Text>
            <Text style={styles.reason}>{item.reason}</Text>

            {item.paymentStatus === 'paid' && item.status !== 'completed' && (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => router.push(`/video-call/${item.id}`)}
              >
                <Text style={styles.joinText}>Join Video Call</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8FAFC' },
  heading: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  patientName: { fontSize: 17, fontWeight: '600', color: '#0F172A' },
  meta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  reason: { fontSize: 14, color: '#334155', marginTop: 8 },
  joinBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  joinText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
