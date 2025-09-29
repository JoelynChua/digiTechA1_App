// frontend/components/UpdateTransactionModal.jsx
import React, { useEffect, useState } from "react";
import { updateTransaction, deleteTransaction } from "../api";

const CATEGORY_OPTIONS = ["Utility", "Shopping", "Transport", "Travel", "Others"];

export default function UpdateTransactionModal({ open, tx, onClose, onUpdated }) {
  // Guard BEFORE hooks to keep hook order stable
  if (!open) return null;

  const [form, setForm] = useState({ title: "", category: "", amount: "" });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false); // in-app confirm popup

  useEffect(() => {
    if (tx) {
      setForm({
        title: tx.title ?? "",
        category: tx.category ?? "",
        amount: tx.amount ?? "",
      });
    } else {
      setForm({ title: "", category: "", amount: "" });
    }
  }, [tx]);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (!tx?.id) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title?.trim() || null,
        category: form.category || null,
        amount: form.amount !== "" ? Number(form.amount) : null,
      };
      const { data } = await updateTransaction(tx.id, payload);
      onUpdated?.(data);
      onClose?.();
    } catch (err) {
      console.error(err);
      alert("Failed to update transaction");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!tx?.id) return;
    setRemoving(true);
    try {
      await deleteTransaction(tx.id);
      onUpdated?.(null);
      onClose?.();
    } catch (err) {
      console.error(err);
      alert("Failed to delete transaction");
    } finally {
      setRemoving(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div style={styles.scrim} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>Update transaction</h3>

        <form style={styles.form} onSubmit={onSubmit}>
          <div>
            <label style={styles.label}>Title</label>
            <input
              style={styles.input}
              name="title"
              value={form.title}
              onChange={onChange}
              placeholder="Water Bill"
              required
              autoFocus
            />
          </div>

          <div>
            <label style={styles.label}>Category</label>
            <select
              style={{ ...styles.input, ...styles.select }}
              name="category"
              value={form.category}
              onChange={onChange}
              required
            >
              <option value="" disabled>Select a category</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Amount</label>
            <input
              style={styles.input}
              name="amount"
              inputMode="decimal"
              step="0.01"
              value={form.amount}
              onChange={onChange}
              placeholder="0.00"
              required
            />
          </div>

          <div style={{ ...styles.actions, justifyContent: "space-between" }}>
            <button
              type="button"
              style={{ ...styles.btn, ...styles.btnDanger }}
              onClick={() => setConfirmOpen(true)} // open in-app confirm
              disabled={!tx?.id}
            >
              Delete
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={{ ...styles.btn, ...styles.btnGhost }} onClick={onClose}>
                Cancel
              </button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} disabled={saving || !tx?.id}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>

        {/* In-app confirm popup (inside the screen) */}
        {confirmOpen && (
          <div style={styles.confirmScrim} onClick={() => setConfirmOpen(false)}>
            <div style={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
              <div style={styles.confirmTitle}>Delete this transaction?</div>
              <div style={styles.confirmText}>
                This action cannot be undone.
              </div>
              <div style={styles.confirmActions}>
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnGhost }}
                  onClick={() => setConfirmOpen(false)}
                  disabled={removing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnDanger }}
                  onClick={confirmDelete}
                  disabled={removing}
                >
                  {removing ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Inline styles */
const styles = {
  scrim: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    display: "grid",
    placeItems: "center",
    padding: 12,
    zIndex: 50,
  },
  modal: {
    width: "100%",
    maxWidth: 320,
    background: "#0f172a",
    color: "#e5e7eb",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 20px 50px rgba(0,0,0,.5)",
    position: "relative",
  },
  title: { margin: "0 0 12px", fontSize: 16, fontWeight: 700 },
  form: { display: "grid", gap: 14 },
  label: { fontSize: 13, color: "#d1d5db", marginBottom: 4 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#1f2937",
    color: "#e5e7eb",
    fontSize: 14,
  },
  select: { appearance: "none", WebkitAppearance: "none", MozAppearance: "none" },
  actions: { display: "flex", gap: 10, marginTop: 12, alignItems: "center" },
  btn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#1f2937",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  btnGhost: { background: "transparent" },
  btnPrimary: { background: "#2563eb", borderColor: "rgba(37,99,235,.6)" },
  btnDanger: { background: "#7f1d1d", borderColor: "rgba(239,68,68,.35)" },

  /* confirm popup styles */
  confirmScrim: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,.55)",
    display: "grid",
    placeItems: "center",
    padding: 12,
    zIndex: 60,
    borderRadius: 14,
  },
  confirmBox: {
    width: "100%",
    maxWidth: 300,
    background: "#101a2e",
    color: "#e5e7eb",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 14px 34px rgba(0,0,0,.45)",
  },
  confirmTitle: { fontWeight: 700, marginBottom: 6 },
  confirmText: { color: "#cbd5e1", fontSize: 13, marginBottom: 12 },
  confirmActions: { display: "flex", justifyContent: "flex-end", gap: 8 },
};
