// frontend/components/CreateTransactionModal.jsx
import React, { useState } from "react";
import { createTransaction } from "../api";

const CATEGORY_OPTIONS = ["Utility", "Shopping", "Transport", "Travel", "Others"];

export default function CreateTransactionModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", category: "", amount: "" });
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title?.trim() || null,
        category: form.category || null,
        amount: form.amount !== "" ? Number(form.amount) : null,
      };
      const { data } = await createTransaction(payload);
      onCreated?.(data);
      onClose?.();
      setForm({ title: "", category: "", amount: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to create transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.scrim} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>Create transaction</h3>

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
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
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

          <div style={styles.actions}>
            <button
              type="button"
              style={{ ...styles.btn, ...styles.btnGhost }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Inline styles only */
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
  select: {
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
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
};
