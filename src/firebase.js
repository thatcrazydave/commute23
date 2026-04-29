import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC1ho8RFvHACSg2YH15oWVuUVLDjzrsP4s",
  authDomain: "commute-8296c.firebaseapp.com",
  projectId: "commute-8296c",
  storageBucket: "commute-8296c.firebasestorage.app",
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
