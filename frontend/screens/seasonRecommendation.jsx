// frontend/screens/SeasonRecommendation.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    ResponsiveContainer,
    LineChart, Line,
    CartesianGrid, XAxis, YAxis, Tooltip, Legend,
    BarChart, Bar
} from "recharts";
import NavBar from "../components/NavBar";

// const API_BASE_URL = "http://localhost:4000/api";
const API_BASE_URL = "https://digi-tech-a1-app.vercel.app/api";

export default function SeasonRecommendation() {
    const [selectedMonth, setSelectedMonth] = useState("");
    const [loading, setLoading] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [errMsg, setErrMsg] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [trendData, setTrendData] = useState([]);

    useEffect(() => {
        const now = new Date();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        setSelectedMonth(`${now.getFullYear()}-${m}`);
        // load last 6 months for trend
        loadMultipleMonths(6).catch(() => { });
    }, []);

    useEffect(() => {
        if (selectedMonth) fetchAnalysis(selectedMonth);
    }, [selectedMonth]);

    async function loadMultipleMonths(count) {
        const months = [];
        const now = new Date();
        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = String(d.getMonth() + 1).padStart(2, "0");
            months.push(`${d.getFullYear()}-${m}`);
        }
        try {
            const { data } = await axios.post(`${API_BASE_URL}/ai/compare-months`, { months });
            const list = (data?.data?.comparisons || [])
                .filter(r => !r?.error)
                .map(r => ({
                    month: new Date(`${r.month}-01`).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
                    emissions: Number(r.totalEmissions || 0),
                    spending: Number(r.totalSpending || 0),
                    season: r.season
                }));
            setTrendData(list);
        } catch (e) {
            console.error("compare-months error", e);
            setTrendData([]);
        }
    }

    async function fetchAnalysis(month) {
        setLoading(true);
        setErrMsg("");
        try {
            const { data } = await axios.get(`${API_BASE_URL}/ai/comprehensive-analysis`, { params: { month } });
            if (data?.success) {
                setAnalysis(data.data);
            } else {
                setErrMsg(data?.error || "Failed to fetch analysis");
            }
        } catch (e) {
            console.error("analysis error", e);
            setErrMsg(e?.response?.data?.message || e.message || "Failed to fetch analysis");
        } finally {
            setLoading(false);
        }
    }

    const fmtKg = (n) => `${Number(n ?? 0).toFixed(2)} kgCO₂e`;
    const fmtAmt = (n) => `$${Number(n ?? 0).toFixed(2)}`;

    return (
        <div style={styles.shell}>
            {/* Animations for loaders */}
            <style>
                {`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes loadingSlide { 0% { transform: translateX(-30%);} 100% { transform: translateX(130%);} }
        `}
            </style>

            {/* Header */}
            <header style={styles.header}>
                <div style={{ width: 36 }} />
                <h1 style={styles.title}>Season Insights</h1>
                <div style={{ width: 36 }} />
            </header>

            {/* ✅ Side Nav */}
            {menuOpen && (
                <div style={styles.overlayWrap}>
                    <div style={styles.scrim} onClick={() => setMenuOpen(false)} />
                    <NavBar onClose={() => setMenuOpen(false)} />
                </div>
            )}

            <main style={styles.content}>
                {loading && <div style={styles.topLoader} />}

                {/* Controls */}
                <div style={styles.controlsRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ color: "#9ca3af" }}>Month</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={styles.monthSelect}
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Error */}
                {errMsg && <div style={styles.error}>{errMsg}</div>}

                {/* Loading pane */}
                {loading && !analysis ? (
                    <div style={styles.loadingPane}>
                        <div style={styles.spinner} />
                        <div style={{ marginTop: 8, color: "#9ca3af" }}>Loading…</div>
                    </div>
                ) : null}

                {/* Content */}
                {analysis && (
                    <div style={{ display: "grid", gap: 12 }}>
                        {/* Key metrics */}
                        <div style={styles.cardRow}>
                            <div style={styles.metricCard}>
                                <div style={styles.metricLabel}>Season</div>
                                <div style={styles.metricValue}>{analysis?.prediction?.season || "-"}</div>
                            </div>

                            <div style={styles.metricCard}>
                                <div style={styles.metricLabel}>Total Emissions</div>
                                <div style={{ ...styles.metricValue, color: "#ef9a9a" }}>
                                    {fmtKg(analysis?.emissions?.totals?.totalEmissionsKg)}
                                </div>
                                <div style={styles.miniNote}>CO₂e</div>
                            </div>

                            <div style={styles.metricCard}>
                                <div style={styles.metricLabel}>Actual Spending</div>
                                <div style={styles.metricValue}>{fmtAmt(analysis?.actualSpending)}</div>
                                <div style={styles.miniNote}>
                                    vs {fmtAmt(analysis?.prediction?.predictedSpending || 0)} predicted
                                </div>
                            </div>

                            <div style={styles.metricCard}>
                                <div style={styles.metricLabel}>Variance</div>
                                <div
                                    style={{
                                        ...styles.metricValue,
                                        color:
                                            parseFloat(analysis?.comparison?.percentageDifference || 0) > 0
                                                ? "#fb923c"
                                                : "#34d399",
                                    }}
                                >
                                    {analysis?.comparison?.percentageDifference ?? "0"}%
                                </div>
                                <div style={styles.miniNote}>
                                    {parseFloat(analysis?.comparison?.percentageDifference || 0) > 0 ? "Over" : "Under"} budget
                                </div>
                            </div>
                        </div>

                        {/* Trend chart */}
                        <div style={styles.card}>
                            <div style={styles.cardTitle}>Carbon Emissions Trend (last 6 months)</div>
                            {trendData.length > 0 ? (
                                <div style={{ width: "100%", height: 260 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.1)" />
                                            <XAxis dataKey="month" stroke="#9ca3af" />
                                            <YAxis yAxisId="left" stroke="#ef9a9a" />
                                            <YAxis yAxisId="right" orientation="right" stroke="#93c5fd" />
                                            <Tooltip />
                                            <Legend />
                                            <Line yAxisId="left" type="monotone" dataKey="emissions" stroke="#ef4444" name="Emissions (kg)" />
                                            <Line yAxisId="right" type="monotone" dataKey="spending" stroke="#3b82f6" name="Spending ($)" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={styles.empty}>No trend data</div>
                            )}
                        </div>

                        {/* Emissions by category */}
                        <div style={styles.card}>
                            <div style={styles.cardTitle}>Emissions by Category</div>
                            {analysis?.emissions?.totals?.byCategory &&
                                Object.keys(analysis.emissions.totals.byCategory).length > 0 ? (
                                <div style={{ width: "100%", height: 260 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={Object.entries(analysis.emissions.totals.byCategory).map(([category, value]) => ({
                                                category,
                                                emissions: Number(value || 0).toFixed ? Number(value) : value,
                                            }))}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.1)" />
                                            <XAxis dataKey="category" stroke="#9ca3af" />
                                            <YAxis stroke="#9ca3af" />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="emissions" fill="#10b981" name="Emissions (kg CO₂e)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={styles.empty}>No emission data</div>
                            )}
                        </div>

                        {/* AI summary & tips */}
                        {analysis?.recommendations?.summary && (
                            <div style={{ ...styles.card, background: "linear-gradient(90deg,#16a34a33,#2563eb33)" }}>
                                <div style={styles.cardTitle}>AI Analysis Summary</div>
                                <div style={{ color: "#e5e7eb" }}>{analysis.recommendations.summary}</div>
                            </div>
                        )}

                        {/* Alternatives */}
                        {Array.isArray(analysis?.recommendations?.alternatives) &&
                            analysis.recommendations.alternatives.length > 0 && (
                                <div style={styles.card}>
                                    <div style={styles.cardTitle}>Greener Alternatives</div>
                                    <div style={{ display: "grid", gap: 10 }}>
                                        {analysis.recommendations.alternatives.map((alt, i) => (
                                            <div key={i} style={styles.altRow}>
                                                <div style={{ fontSize: 12, color: "#93c5fd" }}>{alt.category}</div>
                                                <div style={{ fontWeight: 600 }}>{alt.greenerOption}</div>
                                                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                                                    Current: {alt.current} • Potential: {alt.potentialSavings}
                                                </div>
                                                <div style={{ fontSize: 12 }}>{alt.implementation}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Handprint actions */}
                        {Array.isArray(analysis?.recommendations?.handprintActions) &&
                            analysis.recommendations.handprintActions.length > 0 && (
                                <div style={styles.card}>
                                    <div style={styles.cardTitle}>Carbon Handprint Actions</div>
                                    <div style={{ display: "grid", gap: 10 }}>
                                        {analysis.recommendations.handprintActions.map((h, i) => (
                                            <div key={i} style={styles.handprintRow}>
                                                <div style={{ fontWeight: 600 }}>{h.action}</div>
                                                <div style={{ fontSize: 12, color: "#34d399" }}>Impact: {h.impact}</div>
                                                <div style={{ fontSize: 12, color: "#9ca3af" }}>Effort: {h.effort}</div>
                                                {h.category && (
                                                    <div style={styles.badge}>{h.category}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Seasonal tips */}
                        {Array.isArray(analysis?.recommendations?.seasonalTips) &&
                            analysis.recommendations.seasonalTips.length > 0 && (
                                <div style={styles.card}>
                                    <div style={styles.cardTitle}>Seasonal Tips ({analysis?.prediction?.season})</div>
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                        {analysis.recommendations.seasonalTips.map((t, i) => (
                                            <li key={i} style={{ marginBottom: 6 }}>{t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        {/* Spending insight */}
                        {analysis?.recommendations?.spendingInsight && (
                            <div style={styles.card}>
                                <div style={styles.cardTitle}>Spending Insight</div>
                                <div>{analysis.recommendations.spendingInsight}</div>
                            </div>
                        )}
                    </div>
                )}
            </main>
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
    title: { fontSize: 16, fontWeight: 700, margin: "0 auto" },
    content: { padding: 14, overflowY: "auto", position: "relative" },

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

    // loader
    topLoader: {
        position: "absolute",
        left: 14,
        right: 14,
        top: 56,
        height: 3,
        background:
            "linear-gradient(90deg, rgba(59,130,246,.0), rgba(59,130,246,.8), rgba(59,130,246,.0))",
        borderRadius: 999,
        animation: "loadingSlide 1s linear infinite",
    },
    loadingPane: { display: "grid", placeItems: "center", padding: "40px 0" },
    spinner: {
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: "3px solid rgba(255,255,255,.2)",
        borderTopColor: "#60a5fa",
        animation: "spin .8s linear infinite",
    },
    error: {
        background: "rgba(239,68,68,.12)",
        border: "1px solid rgba(239,68,68,.35)",
        color: "#fecaca",
        padding: "8px 10px",
        borderRadius: 10,
        fontSize: 12,
        marginBottom: 10,
    },

    // cards & metrics
    card: {
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: 12,
        padding: 12,
    },
    cardTitle: { fontSize: 14, color: "#9ca3af", marginBottom: 8 },
    empty: { color: "#9ca3af", textAlign: "center", padding: 20 },

    cardRow: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10,
    },
    metricCard: {
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.06)",
        borderRadius: 12,
        padding: 12,
    },
    metricLabel: { fontSize: 12, color: "#9ca3af" },
    metricValue: { fontSize: 18, fontWeight: 700, marginTop: 2 },
    miniNote: { fontSize: 11, color: "#9ca3af" },

    altRow: {
        background: "rgba(16,185,129,.08)",
        border: "1px solid rgba(16,185,129,.25)",
        borderRadius: 10,
        padding: 10,
    },
    handprintRow: {
        background: "rgba(59,130,246,.08)",
        border: "1px solid rgba(59,130,246,.25)",
        borderRadius: 10,
        padding: 10,
    },
    badge: {
        display: "inline-block",
        marginTop: 6,
        padding: "2px 8px",
        fontSize: 11,
        borderRadius: 999,
        background: "rgba(59,130,246,.25)",
        border: "1px solid rgba(59,130,246,.35)",
        color: "#c7d2fe",
    },
};
