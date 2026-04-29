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

// Initialize Firebase with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase app:", error);
  throw error;
}

// Initialize Firestore with persistent cache (Firebase v10+ API)
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
  console.log("Firestore initialized successfully with persistent cache");
} catch (error) {
  console.error("Error initializing Firestore:", error);
  // Fallback to standard initialization without persistence
  try {
    db = initializeFirestore(app, {});
    console.log("Firestore initialized with fallback method");
  } catch (fallbackError) {
    console.error("Firestore fallback initialization failed:", fallbackError);
    throw fallbackError;
  }
}

// Initialize Authentication
let auth;
try {
  auth = getAuth(app);
  console.log("Firebase Auth initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Auth:", error);
  throw error;
}


const storage = getStorage(app);

// Export the Firebase instances
export { app, auth, db, storage };

// Add a connectivity test function that can be called from anywhere
export const testFirebaseConnection = async () => {
  try {
    console.log("Testing Firebase connectivity...");
    
    // Try to access Firestore
    const dbTest = await fetch('https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?database=projects/YOUR_PROJECT_ID/databases/(default)', {
      method: 'OPTIONS'
    });
    
    console.log("Firestore connectivity test result:", dbTest.status);
    
    return {
      success: true,
      status: dbTest.status,
      message: "Firebase connectivity test passed"
    };
  } catch (error) {
    console.error("Firebase connectivity test failed:", error);
    return {
      success: false,
      error: error.message,
      message: "Firebase connectivity test failed"
    };
  }
};
