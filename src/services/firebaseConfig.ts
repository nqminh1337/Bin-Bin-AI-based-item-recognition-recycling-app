import AsyncStorage from '@react-native-async-storage/async-storage';
import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { type Auth, getAuth, initializeAuth, type Persistence } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';

// Metro resolves `firebase/auth` to the react-native build, which exports
// getReactNativePersistence at runtime, but firebase's package.json lists its
// web "types" entry ahead of the "react-native" one so TypeScript never sees it.
const { getReactNativePersistence } = firebaseAuth as typeof firebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

/**
 * Firebase project config, sourced from EXPO_PUBLIC_* env vars.
 * Copy .env.example to .env at the repo root and fill in your project's
 * values from the Firebase console (Project settings -> General).
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Fail loudly at startup rather than with an opaque "auth/invalid-api-key" later.
const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length > 0) {
  throw new Error(
    `Firebase config is missing: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill in the EXPO_PUBLIC_FIREBASE_* values, then restart Expo.'
  );
}

// Reuse the existing app on Fast Refresh: initializeApp() throws if called twice.
const isFirstInit = getApps().length === 0;
export const firebaseApp: FirebaseApp = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// initializeAuth() must run exactly once per app, and only it can set the
// persistence layer. Backed by AsyncStorage so sessions survive app restarts.
// On a reload the app already has an Auth instance, so we just fetch it.
// Falls back to in-memory auth outside Metro (e.g. a plain Node script or
// test runner), where `firebase/auth` resolves to the web build and
// getReactNativePersistence isn't a function.
function initAuth(): Auth {
  if (!isFirstInit) return getAuth(firebaseApp);
  try {
    return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(firebaseApp);
  }
}
export const auth: Auth = initAuth();

export const db: Firestore = getFirestore(firebaseApp);
