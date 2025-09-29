import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listTransactions } from "../api";
import NavBar from "../components/NavBar";
import CreateTransactionModal from "../components/CreateTransactionModal";
import UpdateTransactionModal from "../components/UpdateTransactionModal";

export default function HomePage() {
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // month filter
  const [selectedMonth, setSelectedMonth] = useState(""); // 'YYYY-MM'

  // loading & error
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  async function load() {
    setLoading(true);
    setErrMsg("");
    try {
      const { data } = await listTransactions();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading transactions", e);
      setErrMsg("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // ---------- helpers ----------
  const toDate = (ts) => {
    if (!ts) return null;
    if (typeof ts === "object" && "_seconds" in ts)
      return new Date(ts._seconds * 1000);
    return new Date(ts);
  };
  const ymKey = (d) => {
    if (!d || isNaN(d.getTime())) return "Unknown";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };
  const ymLabel = (key) => {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
  };
  const fmtAmt = (n) => `$${Number(n ?? 0).toFixed(2)}`;
  const fmtKg = (n) => `${Number(n ?? 0).toFixed(2)} kgCO₂e`;

  // months available from data
  const months = useMemo(() => {
    const set = new Set(items.map((i) => ymKey(toDate(i.createDatetime))));
    const list = Array.from(set).filter((k) => k !== "Unknown").sort().reverse();
    if (!selectedMonth && list.length) setSelectedMonth(list[0]);
    return list;
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // filter and group (by day) for display
  const filtered = useMemo(() => {
    if (!selectedMonth) return items;
    return items.filter(
      (i) => ymKey(toDate(i.createDatetime)) === selectedMonth
    );
  }, [items, selectedMonth]);

  const groupedByDay = useMemo(() => {
    const map = new Map(); // day => items[]
    for (const tx of filtered) {
      const d = toDate(tx.createDatetime);
      const dayKey =
        d && !isNaN(d) ? d.toISOString().slice(0, 10) : "Unknown Date";
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey).push(tx);
    }
    const entries = Array.from(map.entries()).sort((a, b) =>
      a[0] < b[0] ? 1 : -1
    );
    for (const [, arr] of entries) {
      arr.sort((a, b) => {
        const da = toDate(a.createDatetime)?.getTime() ?? 0;
        const db = toDate(b.createDatetime)?.getTime() ?? 0;
        return db - da;
      });
    }
    return entries;
  }, [filtered]);

  // after create/update/delete
  async function refreshAll() {
    await load();
  }

  return (
    <div style={styles.shell}>
      {/* 🔧 Inject keyframes for inline animations */}
      <style>
        {`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes loadingSlide {
            0% { transform: translateX(-30%); }
            100% { transform: translateX(130%); }
          }
        `}
      </style>

      {/* Header */}
      <header style={styles.header}>
        <button style={styles.iconBtn} onClick={() => setMenuOpen(true)}>
          ☰
        </button>
        <h1 style={styles.title}>Carbon Transactions</h1>
        <div style={{ width: 36 }} />
      </header>

      <main style={styles.content}>
        {/* Top loader bar */}
        {loading && <div style={styles.topLoader} />}

        {/* Error banner */}
        {errMsg && <div style={styles.error}>{errMsg}</div>}

        {/* Controls row (Month filter only) */}
        <div style={styles.controlsRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ color: "#9ca3af" }}>Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={styles.monthSelect}
              disabled={loading}
            >
              {months.length === 0 ? (
                <option value="">No data</option>
              ) : (
                months.map((m) => (
                  <option key={m} value={m}>
                    {ymLabel(m)}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Content area */}
        {loading ? (
          <div style={styles.loadingPane}>
            <div style={styles.spinner} />
            <div style={{ marginTop: 8, color: "#9ca3af" }}>Loading…</div>
          </div>
        ) : (
          <section>
            {groupedByDay.length === 0 ? (
              <p style={{ color: "#9ca3af" }}>No transactions yet. Tap +</p>
            ) : (
              groupedByDay.map(([day, arr]) => (
                <div key={day} style={{ marginBottom: 14 }}>
                  <div style={styles.sectionHeader}>
                    {new Date(day).toLocaleDateString(undefined, {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {arr.map((tx) => (
                      <div
                        key={tx.id}
                        style={styles.row}
                        onClick={() => {
                          setSelectedTx(tx);
                          setShowUpdate(true);
                        }}
                        title="Click to edit"
                      >
                        <div style={{ display: "grid" }}>
                          <div>{tx.title || "(untitled)"}</div>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>
                            {tx.category || "uncategorized"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div>{fmtAmt(tx.amount)}</div>
                          {tx.emissionsKg != null && (
                            <div style={styles.kgPill}>
                              {fmtKg(tx.emissionsKg)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </main>

      {/* FAB → create modal */}
      <button
        style={styles.fab}
        onClick={() => setShowCreate(true)}
        disabled={loading}
      >
        ＋
      </button>

      {/* Side Nav */}
      {menuOpen && (
        <div style={styles.overlayWrap}>
          <div style={styles.scrim} onClick={() => setMenuOpen(false)} />
          <NavBar onClose={() => setMenuOpen(false)} />
        </div>
      )}

      {/* Create modal */}
      <CreateTransactionModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refreshAll}
      />

      {/* Update modal */}
      <UpdateTransactionModal
        open={showUpdate}
        tx={selectedTx}
        onClose={() => {
          setShowUpdate(false);
          setSelectedTx(null);
        }}
        onUpdated={refreshAll}
      />
    </div>
  );
}

const styles = {
  shell: {
    width: 390,
    height: 780,
    margin: "24px auto",
    border: "12px solid #111827",
    borderRadius: 36,
    background: "#0b1020",
    color: "#e5e7eb",
    position: "relative",
    overflow: "hidden",
    display: "grid",
    gridTemplateRows: "56px 1fr",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.03)",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.1)",
    background: "#1f2937",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  title: { fontSize: 16, fontWeight: 700, margin: "0 auto" },
  content: { padding: 16, overflowY: "auto", position: "relative" },

  // loader bar
  topLoader: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 56,
    height: 3,
    background:
      "linear-gradient(90deg, rgba(59,130,246,.0), rgba(59,130,246,.8), rgba(59,130,246,.0))",
    borderRadius: 999,
    animation: "loadingSlide 1s linear infinite",
  },

  // error pill
  error: {
    background: "rgba(239,68,68,.12)",
    border: "1px solid rgba(239,68,68,.35)",
    color: "#fecaca",
    padding: "8px 10px",
    borderRadius: 10,
    fontSize: 12,
    margin: "8px 0",
  },

  controlsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  monthSelect: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.12)",
    background: "#1f2937",
    color: "#e5e7eb",
    cursor: "pointer",
  },

  sectionHeader: { fontSize: 12, color: "#9ca3af", margin: "4px 2px 6px" },

  row: {
    background: "rgba(255,255,255,.03)",
    padding: "10px 12px",
    borderRadius: 10,
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,.06)",
  },

  kgPill: {
    display: "inline-block",
    marginTop: 4,
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(16,185,129,.15)",
    border: "1px solid rgba(16,185,129,.35)",
    color: "#a7f3d0",
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#2563eb",
    color: "#fff",
    fontSize: 24,
    border: "none",
    cursor: "pointer",
  },

  overlayWrap: { position: "absolute", inset: 0 },
  scrim: { position: "absolute", inset: 0, background: "rgba(0,0,0,.35)" },

  // centered loading pane
  loadingPane: {
    display: "grid",
    placeItems: "center",
    padding: "40px 0",
  },
  spinner: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    border: "3px solid rgba(255,255,255,.2)",
    borderTopColor: "#60a5fa",
    animation: "spin 0.8s linear infinite",
  },
};
