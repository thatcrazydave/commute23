// Firebase is used ONLY for OAuth identity (Google / GitHub).
// All user data and sessions live in our own backend (Express + MongoDB + JWT).
// The Firestore / Storage imports that existed here have been removed — all data
// now flows through the /api/* REST endpoints.

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Tab-scoped Firebase auth state — cloned tabs do not inherit our JWT session.
setPersistence(auth, browserSessionPersistence).catch(() => {});

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { app, auth, googleProvider, githubProvider };
