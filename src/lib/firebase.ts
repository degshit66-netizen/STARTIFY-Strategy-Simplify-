import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase with better singleton pattern
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use the database ID from config if present, otherwise default
const dbId = firebaseConfig.firestoreDatabaseId || undefined;

// Initialize Firestore with IndexedDB persistence for offline/quota fallback
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ 
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  }),
  ...(dbId ? { databaseId: dbId } : {})
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
