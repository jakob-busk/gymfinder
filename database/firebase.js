import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isFirebaseConfigured } from './firebaseConfig';

// Al Firebase-opsætning samlet ét sted. Værdierne kommer fra .env, så de aldrig ligger i git.
// Expo indsætter kun EXPO_PUBLIC_*-variabler, der læses direkte som process.env.NAVN.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DB_URL,
};

// Uden udfyldt .env starter appen alligevel: rtdb og auth er null, og appen viser eksempeldata.
export const firebaseConfigured = isFirebaseConfigured(firebaseConfig);

// Initialisér kun én gang (Expo kan genindlæse filen ved fast refresh).
function createApp() {
  if (!firebaseConfigured) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const firebaseApp = createApp();

export const rtdb = firebaseApp ? getDatabase(firebaseApp, firebaseConfig.databaseURL) : null;

// AsyncStorage-persistence gør, at den anonyme bruger beholder sin uid efter genstart.
// initializeAuth må kun kaldes én gang; ved fast refresh hentes den eksisterende instans.
function createAuth(app) {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    return getAuth(app);
  }
}

export const auth = firebaseApp ? createAuth(firebaseApp) : null;
