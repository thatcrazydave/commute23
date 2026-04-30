const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/logger');

let initialized = false;

const initFirebaseAdmin = () => {
  if (initialized) return admin;

  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  try {
    if (saPath && fs.existsSync(path.resolve(saPath))) {
      const serviceAccount = require(path.resolve(saPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      Logger.info('Firebase Admin initialized via service account');
    } else if (projectId) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });
      Logger.info('Firebase Admin initialized via application default credentials', { projectId });
    } else {
      Logger.warn('Firebase Admin not configured — Google/GitHub OAuth login will be disabled. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID.');
      return null;
    }

    initialized = true;
    return admin;
  } catch (err) {
    Logger.error('Firebase Admin init failed', { error: err.message });
    return null;
  }
};

const getFirebaseAdmin = () => (initialized ? admin : initFirebaseAdmin());

module.exports = { initFirebaseAdmin, getFirebaseAdmin };
