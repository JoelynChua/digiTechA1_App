// backend/config/firebase.js
const admin = require("firebase-admin");

const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: svc.project_id,
      clientEmail: svc.client_email,
      privateKey: svc.private_key.replace(/\\n/g, "\n"),
    }),
  });
}

const firestore = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

module.exports = { firestore, FieldValue, Timestamp };
