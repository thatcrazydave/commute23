import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, db, storage };

export const testFirebaseConnection = async () => {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?database=projects/${firebaseConfig.projectId}/databases/(default)`,
      { method: "OPTIONS" }
    );
    return { success: true, status: res.status, message: "Firebase connectivity test passed" };
  } catch (error) {
    return { success: false, error: error.message, message: "Firebase connectivity test failed" };
  }
};
