/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register the app first so a FCM setup failure cannot block launch.
AppRegistry.registerComponent(appName, () => App);

try {
  // eslint-disable-next-line global-require
  const { registerBackgroundHandler } = require('./src/services/pushNotifications');
  registerBackgroundHandler();
} catch (error) {
  console.warn('[FCM] skip background handler:', error?.message || error);
}

try {
  // eslint-disable-next-line global-require
  const { registerNotifeeBackgroundEvents } = require('./src/services/notifeeNotifications');
  registerNotifeeBackgroundEvents();
} catch (error) {
  console.warn('[Notifee] skip background events:', error?.message || error);
}
