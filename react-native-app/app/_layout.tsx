import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="(auth)/login" options={{ title: 'MedLink Sign In', headerShown: false }} />
      <Stack.Screen name="(admin)/register-doctor" options={{ title: 'Admin · Register Doctor' }} />
      <Stack.Screen name="(doctor)/appointments" options={{ title: 'Doctor Schedule' }} />
      <Stack.Screen name="(patient)/book" options={{ title: 'Book & Pay Consultation' }} />
      <Stack.Screen name="video-call/[appointmentId]" options={{ title: 'Video Consultation', headerShown: false }} />
    </Stack>
  );
}
