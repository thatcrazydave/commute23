// Firebase usage in this app:
//   - PRIMARY: OAuth identity for Google / GitHub sign-in. The Firebase ID token
//     is exchanged for a backend-issued JWT at POST /auth/firebase-login.
//     All sessions are owned by our Express backend.
//   - LEGACY (being phased out): Firestore for posts/connections/events and
//     Cloud Storage for uploads. These will migrate to MongoDB + the backend
//     API in a follow-up phase. Do NOT add new Firestore reads/writes — use
//     the API service in src/services/api.js instead.

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch(() => {});

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// LEGACY — see comment at top of file
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
const storage = getStorage(app);

export { app, auth, googleProvider, githubProvider, db, storage };
