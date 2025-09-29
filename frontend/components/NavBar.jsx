import React from "react";

export default function NavBar({ onClose }) {
  return (
    <aside style={styles.drawer}>
      <div style={{ padding: 16, fontWeight: 700, fontSize: 18, color: "#fff" }}>
        🌱 Carbon Tracker
      </div>
      <nav style={{ display: "grid", gap: 8, padding: "0 12px 12px" }}>
        <a style={styles.navItem} href="/">
          🏠 Home
        </a>
        <a style={styles.navItem} href="/season-recommendation">
          📊 Season Analysis
        </a>
      </nav>
      <button style={styles.closeBtn} onClick={onClose}>
        Close
      </button>
    </aside>
  );
}

const styles = {
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: 260,
    background: "#0f172a",
    borderRight: "1px solid rgba(255,255,255,.08)",
    zIndex: 2,
    paddingTop: "20px",
  },
  navItem: {
    display: "block",
    padding: "12px 14px",
    borderRadius: 10,
    color: "#e5e7eb",
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,.06)",
    background: "rgba(255,255,255,.02)",
    transition: "all 0.2s ease",
    fontSize: 15,
    fontWeight: 500,
  },
  closeBtn: {
    margin: "16px 12px",
    padding: "10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.15)",
    background: "#1f2937",
    color: "#e5e7eb",
    cursor: "pointer",
    width: "calc(100% - 24px)",
    fontSize: 14,
    fontWeight: 600,
  },
};