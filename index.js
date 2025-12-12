/**
 * @format
 */

// Polyfills for @langchain/openai compatibility in React Native
// The OpenAI SDK checks navigator.userAgent which doesn't exist in RN
if (typeof navigator !== 'undefined' && navigator.userAgent === undefined) {
  navigator.userAgent = 'react-native';
}
// Some environments don't have navigator at all
if (typeof navigator === 'undefined') {
  global.navigator = { userAgent: 'react-native' };
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
