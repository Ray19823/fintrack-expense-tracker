"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Insight = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  monthStart: string;
  budget: string;
  actual: string;
  remaining: string;
  usagePct: string;
  status: "OK" | "NEAR" | "OVER";
};

export default function BudgetInsightsPage() {
  const router = useRouter();

  const [monthStart, setMonthStart] = useState("2026-06-01");
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadInsights() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/budget-insights?monthStart=${monthStart}`, {
        cache: "no-store",
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(body.error ?? "Failed to load budget insights");
      }

      setInsights(body.insights ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load budget insights",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6, fontSize: 28 }}>Budget Insights</h1>
          <p style={{ marginTop: 0, color: "#666" }}>
            Compare monthly budgets against actual expenses.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <a href="/dashboard" style={navButton}>
            Dashboard
          </a>
          <a href="/budgets" style={navButton}>
            Budgets
          </a>
          <a href="/transactions" style={navButton}>
            Transactions
          </a>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#fff5f5",
            border: "1px solid #ffd6d6",
            color: "#b00020",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="cardTitle">Filter</h2>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <label style={label}>Month Start</label>
            <input
              type="date"
              value={monthStart}
              onChange={(e) => setMonthStart(e.target.value)}
              style={input}
            />
          </div>

          <button
            type="button"
            onClick={loadInsights}
            disabled={loading}
            style={primaryButton}
          >
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="cardTitle">Budget vs Actual</h2>

        {loading ? (
          <p>Loading insights…</p>
        ) : insights.length === 0 ? (
          <p>No budgets found for this month.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={th}>Category</th>
                  <th style={th}>Budget</th>
                  <th style={th}>Actual</th>
                  <th style={th}>Remaining</th>
                  <th style={th}>Usage</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {insights.map((x) => {
                  const usage = Number(x.usagePct);
                  return (
                    <tr
                      key={x.budgetId}
                      style={{ borderBottom: "1px solid #f3f4f6" }}
                    >
                      <td style={td}>{x.categoryName}</td>
                      <td style={td}>{Number(x.budget).toFixed(2)}</td>
                      <td style={td}>{Number(x.actual).toFixed(2)}</td>
                      <td
                        style={{
                          ...td,
                          fontWeight: 700,
                          color:
                            Number(x.remaining) < 0 ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {Number(x.remaining).toFixed(2)}
                      </td>
                      <td style={td}>
                        <div style={{ minWidth: 160 }}>
                          <div style={{ marginBottom: 4 }}>
                            {usage.toFixed(1)}%
                          </div>
                          <div
                            style={{
                              height: 8,
                              borderRadius: 999,
                              background: "#e5e7eb",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(usage, 100)}%`,
                                height: "100%",
                                background:
                                  x.status === "OVER"
                                    ? "#dc2626"
                                    : x.status === "NEAR"
                                      ? "#f59e0b"
                                      : "#16a34a",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background:
                              x.status === "OVER"
                                ? "#fee2e2"
                                : x.status === "NEAR"
                                  ? "#fef3c7"
                                  : "#dcfce7",
                            color:
                              x.status === "OVER"
                                ? "#991b1b"
                                : x.status === "NEAR"
                                  ? "#92400e"
                                  : "#166534",
                          }}
                        >
                          {x.status === "OVER"
                            ? "Over budget"
                            : x.status === "NEAR"
                              ? "Near limit"
                              : "On track"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#666",
  marginBottom: 4,
};

const input: React.CSSProperties = {
  padding: 10,
  minWidth: 180,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  fontSize: 12,
  color: "#6b7280",
};

const td: React.CSSProperties = {
  padding: "10px 8px",
  fontSize: 14,
};

const navButton: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "white",
  color: "#374151",
  fontSize: 13,
  textDecoration: "none",
};

const primaryButton: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
};
