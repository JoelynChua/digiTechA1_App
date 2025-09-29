// backend/service/carbonTransactions.js
const { firestore, FieldValue, Timestamp } = require('../config/firebase');

if (!firestore) {
  // Give a precise, early error instead of "cannot read collection of undefined"
  throw new Error(
    '[carbonTransactions] Firestore is undefined. ' +
    'Check that backend/config/firebase.js exports { firestore } and that ' +
    'FIREBASE_SERVICE_ACCOUNT_KEY is set correctly in the environment.'
  );
}

const COLLECTION = 'carbonTransactions';

// Normalize payload (add created/updated timestamps)
function withCreateMeta(data) {
  return {
    ...data,
    createDatetime: data.createDatetime
      ? new Date(data.createDatetime)
      : Timestamp ? Timestamp.now().toDate() : new Date(),
    updateDatetime: Timestamp ? Timestamp.now().toDate() : new Date(),
  };
}
function withUpdateMeta(data) {
  return {
    ...data,
    updateDatetime: Timestamp ? Timestamp.now().toDate() : new Date(),
  };
}

/** List all transactions (up to a sensible limit) */
async function listTransactions() {
  const snap = await firestore
    .collection(COLLECTION)
    .orderBy('createDatetime', 'desc')
    .limit(500)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get one transaction by id */
async function getTransaction(id) {
  const ref = firestore.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/** Create a new transaction */
async function createTransaction(data) {
  const payload = withCreateMeta(data);
  const ref = await firestore.collection(COLLECTION).add(payload);
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

/** Update an existing transaction */
async function updateTransaction(id, data) {
  const ref = firestore.collection(COLLECTION).doc(id);
  await ref.set(withUpdateMeta(data), { merge: true });
  const doc = await ref.get();
  if (!doc.exists) throw new Error('Not found');
  return { id: doc.id, ...doc.data() };
}

/** Delete a transaction */
async function deleteTransaction(id) {
  const ref = firestore.collection(COLLECTION).doc(id);
  await ref.delete();
  return true;
}

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
