// config/firebase.js
const admin = require('firebase-admin');

function loadServiceAccount() {
  // Prefer base64 env (safer)
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  }

  // Fallback: raw JSON env
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_B64 or FIREBASE_SERVICE_ACCOUNT');
  }
  raw = raw.trim();

  // Strip wrapping quotes if mistakenly added
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }

  try {
    return JSON.parse(raw);
  } catch {
    // Handle double-escaped quotes and \n
    const unescaped = raw.replace(/\\"/g, '"').replace(/\\n/g, '\n');
    return JSON.parse(unescaped);
  }
}

if (!admin.apps.length) {
  const sa = loadServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert(sa),
    // If you use Realtime Database, set this:
    databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
  });
}

const db = (() => {
  const useRTDB = String(process.env.USE_RTDB || '').toLowerCase() === 'true';
  if (useRTDB) return admin.database();
  return admin.firestore();
})();

module.exports = { admin, db };
