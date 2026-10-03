const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");

function getFirebaseAdmin() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!serviceAccountJson || !databaseURL) {
    throw new Error("Firebase Admin is not configured");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("Firebase Admin credentials are invalid");
  }

  const app =
    getApps().find((candidate) => candidate.name === "default") ||
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL,
    });

  return {
    auth: getAuth(app),
    database: getDatabase(app),
  };
}

module.exports = { getFirebaseAdmin };