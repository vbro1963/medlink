import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { mobileApi } from '../../src/services/api';

export default function AdminRegisterDoctorScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [fee, setFee] = useState('85');
  const [submitting, setSubmitting] = useState(false);

  const handleRegisterDoctor = async () => {
    try {
      setSubmitting(true);
      await mobileApi.registerDoctor({
        name,
        email,
        password,
        specialty,
        licenseNumber,
        consultationFee: Number(fee),
      });
      Alert.alert('Doctor Registered', `${name} can now log in and receive bookings.`);
      setName('');
      setEmail('');
      setPassword('');
      setSpecialty('');
      setLicenseNumber('');
    } catch (err: any) {
      Alert.alert('Registration Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Register Physician</Text>
      <TextInput style={styles.input} placeholder="Full Name (e.g. Dr. Maya Patel)" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Clinic Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Temporary Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Medical Specialty" value={specialty} onChangeText={setSpecialty} />
      <TextInput style={styles.input} placeholder="License Number (e.g. MD-CA-9012)" value={licenseNumber} onChangeText={setLicenseNumber} />
      <TextInput style={styles.input} placeholder="Consultation Fee (USD)" keyboardType="numeric" value={fee} onChangeText={setFee} />

      <TouchableOpacity style={styles.button} onPress={handleRegisterDoctor} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Registering...' : 'Register Doctor'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F8FAFC', flexGrow: 1 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
