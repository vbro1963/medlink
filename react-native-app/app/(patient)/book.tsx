import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApi } from '../../src/services/api';

export default function PatientBookingScreen() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [reason, setReason] = useState('');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');

  useEffect(() => {
    mobileApi.listDoctors().then((res) => setDoctors(res.doctors));
  }, []);

  const handleBookAndPay = async () => {
    if (!selectedDoctor || !selectedSlot || !reason.trim()) {
      Alert.alert('Missing Details', 'Select a doctor, time slot, and enter your reason.');
      return;
    }
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { appointment } = await mobileApi.bookAppointment({
        doctorId: selectedDoctor.id,
        scheduledDate: today,
        scheduledTime: selectedSlot,
        reason,
      });
      await mobileApi.payConsultationFee(appointment.id, 'card', cardNumber);
      Alert.alert('Booking Confirmed', 'Consultation fee paid. You can join at appointment time.', [
        { text: 'Join Video Room', onPress: () => router.push(`/video-call/${appointment.id}`) },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Payment Failed', err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Book Consultation</Text>
      {doctors.map((doc) => (
        <TouchableOpacity
          key={doc.id}
          style={[styles.card, selectedDoctor?.id === doc.id && styles.selectedCard]}
          onPress={() => {
            setSelectedDoctor(doc);
            setSelectedSlot(doc.availableSlots?.[0] || '10:00');
          }}
        >
          <Text style={styles.docName}>{doc.name}</Text>
          <Text style={styles.meta}>
            {doc.specialty} · Fee ${doc.consultationFee}
          </Text>
        </TouchableOpacity>
      ))}

      {selectedDoctor && (
        <View style={styles.checkoutBox}>
          <Text style={styles.subHeading}>Slot & Fee Checkout (${selectedDoctor.consultationFee})</Text>
          <TextInput
            style={styles.input}
            placeholder="Reason for visit"
            value={reason}
            onChangeText={setReason}
          />
          <TextInput
            style={styles.input}
            placeholder="Card number"
            value={cardNumber}
            onChangeText={setCardNumber}
          />
          <TouchableOpacity style={styles.payBtn} onPress={handleBookAndPay}>
            <Text style={styles.payBtnText}>Pay ${selectedDoctor.consultationFee} & Confirm</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F8FAFC', flexGrow: 1 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 14 },
  subHeading: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  selectedCard: { borderColor: '#0D9488', borderWidth: 2 },
  docName: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  meta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  checkoutBox: { marginTop: 16, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  payBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payBtnText: { color: '#FFFFFF', fontWeight: '600' },
});
