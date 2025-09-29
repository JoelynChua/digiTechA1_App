const { firestore, FieldValue } = require("../config/firebase");
const { estimateEmissions } = require("./geminiEmissions");

const COLLECTION = "carbonTransactions";

/**
 * Create a transaction with Firestore auto-ID.
 */
async function createTransaction({ category, title, amount }) {
  // Generate a new doc with an auto ID
  const docRef = firestore.collection(COLLECTION).doc();
  const transactionID = docRef.id;

  const data = {
    transactionID, // store auto ID in the document too
    category: category ?? null,
    title: title ?? null,
    amount: typeof amount === "number" ? amount : Number(amount),
    createDatetime: FieldValue.serverTimestamp(),
  };

  await docRef.set(data);
  const snap = await docRef.get();
  return { id: snap.id, ...snap.data() };
}

/**
 * Read a single transaction by ID.
 */
async function getTransaction(transactionID) {
  const snap = await firestore.collection(COLLECTION).doc(transactionID).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * List transactions (optionally by category).
 */
// async function listTransactions({ category, limit = 50 } = {}) {
//   let q = firestore.collection(COLLECTION).orderBy("createDatetime", "desc");
//   if (category) q = q.where("category", "==", category);
//   const snaps = await q.limit(limit).get();
//   return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
// }
async function listTransactions({ category, limit = 50 } = {}) {
  let q = firestore.collection(COLLECTION).orderBy("createDatetime", "desc");
  if (category) q = q.where("category", "==", category);
  const snaps = await q.limit(limit).get();
  const txns = snaps.docs.map(d => ({ id: d.id, ...d.data() }));

  // 👇 call emissions service directly
  const { items: enriched } = await estimateEmissions({ month: null });
  // build a map of id -> emissions
  const emMap = {};
  for (const i of enriched) {
    if (i.id) emMap[i.id] = i.emissionsKg;
  }

  // attach emissions
  return txns.map(t => ({ ...t, emissionsKg: emMap[t.id] ?? null }));
}

/**
 * Update selected fields (does not change createDatetime).
 */
async function updateTransaction(transactionID, partial) {
  const docRef = firestore.collection(COLLECTION).doc(transactionID);
  await docRef.set(
    {
      ...(partial.category !== undefined ? { category: partial.category } : {}),
      ...(partial.title !== undefined ? { title: partial.title } : {}),
      ...(partial.amount !== undefined ? { amount: Number(partial.amount) } : {}),
    },
    { merge: true }
  );
  const snap = await docRef.get();
  return { id: snap.id, ...snap.data() };
}

/**
 * Delete a transaction.
 */
async function deleteTransaction(transactionID) {
  await firestore.collection(COLLECTION).doc(transactionID).delete();
  return { ok: true };
}

module.exports = {
  createTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
};
