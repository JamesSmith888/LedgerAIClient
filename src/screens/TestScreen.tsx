import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Client } from '@stomp/stompjs';

const textEncoding = require('text-encoding');

// 将 polyfill 添加到全局对象
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = textEncoding.TextEncoder;
}
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = textEncoding.TextDecoder;
}

export const TestScreen: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const client = new Client({
      brokerURL: 'ws://10.0.2.2:8080/ws',
      onConnect: () => {
        setIsConnected(true);
        Alert.alert('STOMP Connected', 'The STOMP client has connected successfully.');
        client.subscribe('/topic/test01', message =>
          console.log(`Received: ${message.body}`),
        );
        client.publish({ destination: '/topic/test01', body: 'First Message' });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
    });

    clientRef.current = client;

    console.log('🚀 Activating STOMP client...');
    client.activate();
    console.log('✅ STOMP client activated');

    return () => {
      console.log('🛑 Deactivating STOMP client...');
      client.deactivate();
      console.log('✅ STOMP client deactivated');
    };
  }, []);

  const sendMessage = () => {
    if (!isConnected) {
      Alert.alert('Error', 'STOMP client is not connected');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      clientRef.current?.publish({
        destination: '/app/chat',
        body: message,
      });
      console.log(`📤 Sent to /app/chat: ${message}`);
      Alert.alert('Success', `Message sent to /app/chat: ${message}`);
      setMessage(''); // Clear input after sending
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>React Native STOMP Demo</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter message to send to /app/chat"
          value={message}
          onChangeText={setMessage}
          editable={isConnected}
        />
        <TouchableOpacity
          style={[styles.button, !isConnected && styles.buttonDisabled]}
          onPress={sendMessage}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusContainer: {
    marginBottom: 30,
  },
  statusText: {
    fontSize: 16,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
