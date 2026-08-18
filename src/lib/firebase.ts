import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseAppletConfig from "../../firebase-applet-config.json";

const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    return (import.meta as any)?.env?.[key];
  } catch (e) {
    return undefined;
  }
};

export const config = {
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || firebaseAppletConfig.projectId,
  appId: getEnv('VITE_FIREBASE_APP_ID') || firebaseAppletConfig.appId,
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || firebaseAppletConfig.apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || firebaseAppletConfig.authDomain,
  firestoreDatabaseId: getEnv('VITE_FIREBASE_DATABASE_ID') || firebaseAppletConfig.firestoreDatabaseId,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || firebaseAppletConfig.storageBucket,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebaseAppletConfig.messagingSenderId,
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(config) : getApp();

// Get Firestore instance with specified database ID
export const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// Get Auth instance
export const auth = getAuth(app);




