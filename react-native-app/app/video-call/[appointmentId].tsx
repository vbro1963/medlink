import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  RTCView,
  MediaStream,
} from 'react-native-webrtc';
import { getToken, WS_BASE_URL } from '../../src/services/api';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function VideoCallScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let active = true;

    const startCall = async () => {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
      if (!active) return;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      (pc as any).ontrack = (event: any) => {
        if (event.streams?.[0]) setRemoteStream(event.streams[0]);
      };

      const ws = new WebSocket(WS_BASE_URL);
      wsRef.current = ws;

      (pc as any).onicecandidate = (event: any) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'webrtc:ice', candidate: event.candidate }));
        }
      };

      const token = await getToken();
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'room:join', roomId: appointmentId, token }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room:peer-joined') {
          const offer = await pc.createOffer({});
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: 'webrtc:offer', sdp: offer }));
        } else if (msg.type === 'webrtc:offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'webrtc:answer', sdp: answer }));
        } else if (msg.type === 'webrtc:answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } else if (msg.type === 'webrtc:ice' && msg.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      };
    };

    startCall();

    return () => {
      active = false;
      wsRef.current?.close();
      pcRef.current?.close();
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [appointmentId]);

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = muted;
    });
    setMuted(!muted);
  };

  return (
    <View style={styles.container}>
      {remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
      ) : (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingText}>Waiting for participant to join room...</Text>
        </View>
      )}

      {localStream && (
        <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
          <Text style={styles.controlText}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, styles.endBtn]} onPress={() => router.back()}>
          <Text style={styles.controlText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  remoteVideo: { flex: 1 },
  waitingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waitingText: { color: '#CBD5E1', fontSize: 15 },
  localVideo: {
    position: 'absolute',
    right: 16,
    top: 48,
    width: 110,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
  },
  controls: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  controlBtn: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
  },
  endBtn: { backgroundColor: '#DC2626' },
  controlText: { color: '#FFFFFF', fontWeight: '600' },
});
