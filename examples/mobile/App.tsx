import './src/global.css';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChatScreen } from './src/components';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ChatScreen />
    </SafeAreaProvider>
  );
}
