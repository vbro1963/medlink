import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApi, saveToken } from '../../src/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('patient@medlink.health');
  const [password, setPassword] = useState('Patient@123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const { token, user } = await mobileApi.login(email, password);
      await saveToken(token);
      if (user.role === 'admin') {
        router.replace('/(admin)/register-doctor');
      } else if (user.role === 'doctor') {
        router.replace('/(doctor)/appointments');
      } else {
        router.replace('/(patient)/book');
      }
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>MedLink</Text>
      <Text style={styles.title}>Clinical Telehealth Sign In</Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  brand: { fontSize: 16, fontWeight: '700', color: '#0D9488', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#0F172A', marginBottom: 24 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
