/**
 * LedgerAI Client App
 * React Native 应用入口
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabNavigator } from './src/navigation/BottomTabNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
        <BottomTabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
