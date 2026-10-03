const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");

function logDiagnostic(stage, details = {}) {
  console.info("[firebaseAdmin]", { stage, ...details });
}

function getFirebaseAdmin() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  logDiagnostic("environment", {
    hasFirebaseServiceAccount: Boolean(serviceAccountJson),
  });

  if (!serviceAccountJson || !databaseURL) {
    throw new Error("Firebase Admin is not configured");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    logDiagnostic("JSON.parse", { hasValidJson: false });
    throw new Error("Firebase Admin credentials are invalid");
  }

  const isObject =
    serviceAccount !== null &&
    typeof serviceAccount === "object" &&
    !Array.isArray(serviceAccount);
  const hasProjectId =
    isObject &&
    typeof serviceAccount.project_id === "string" &&
    serviceAccount.project_id.trim().length > 0;
  const hasClientEmail =
    isObject &&
    typeof serviceAccount.client_email === "string" &&
    serviceAccount.client_email.trim().length > 0;
  const hasPrivateKey =
    isObject &&
    typeof serviceAccount.private_key === "string" &&
    serviceAccount.private_key.trim().length > 0;

  logDiagnostic("service_account_validation", {
    hasValidJson: true,
    isObject,
    hasProjectId,
    hasClientEmail,
    hasPrivateKey,
  });

  let app;
  logDiagnostic("initializeApp", { status: "started" });
  const existingApp = getApps().find((candidate) => candidate.name === "default");
  if (existingApp) {
    app = existingApp;
    logDiagnostic("initializeApp", { status: "reused" });
  } else {
    let credential;
    logDiagnostic("cert", { status: "started" });
    try {
      credential = cert(serviceAccount);
      logDiagnostic("cert", { status: "succeeded" });
    } catch (error) {
      logDiagnostic("cert", { status: "failed" });
      throw error;
    }

    logDiagnostic("initializeApp", { status: "initializing" });
    try {
      app = initializeApp({ credential, databaseURL });
      logDiagnostic("initializeApp", { status: "succeeded" });
    } catch (error) {
      logDiagnostic("initializeApp", { status: "failed" });
      throw error;
    }
  }

  let auth;
  logDiagnostic("getAuth", { status: "started" });
  try {
    auth = getAuth(app);
    logDiagnostic("getAuth", { status: "succeeded" });
  } catch (error) {
    logDiagnostic("getAuth", { status: "failed" });
    throw error;
  }

  let databaseInstance;
  logDiagnostic("getDatabase", { status: "started" });
  try {
    databaseInstance = getDatabase(app);
    logDiagnostic("getDatabase", { status: "succeeded" });
  } catch (error) {
    logDiagnostic("getDatabase", { status: "failed" });
    throw error;
  }

  return {
    auth,
    database: databaseInstance,
  };
}

module.exports = { getFirebaseAdmin };