const admin = require("firebase-admin");

// Load service account from env
let svcRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!svcRaw) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY env var");
}

// Handle common formatting issues (extra quotes, escaped newlines)
svcRaw = svcRaw.trim();
if (
  (svcRaw.startsWith('"') && svcRaw.endsWith('"')) ||
  (svcRaw.startsWith("'") && svcRaw.endsWith("'"))
) {
  svcRaw = svcRaw.slice(1, -1);
}
const svc = JSON.parse(svcRaw.replace(/\\n/g, "\n"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: svc.project_id,
      clientEmail: svc.client_email,
      privateKey: svc.private_key.replace(/\\n/g, "\n"),
    }),
    // Only needed if you use RTDB:
    databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
  });
}

// Explicit Firestore export
const firestore = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

module.exports = { firestore, FieldValue, Timestamp, admin };
