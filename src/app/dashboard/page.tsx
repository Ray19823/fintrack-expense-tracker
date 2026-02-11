"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

type Direction = "EXPENSE" | "INCOME";

type SummaryItem = {
  categoryId: string;
  categoryName: string;
  categoryType: "INCOME" | "EXPENSE";
  total: string; // API returns string
};

type SummaryResponse = {
  direction: "INCOME" | "EXPENSE";
  range: { from: string | null; to: string | null };
  items: SummaryItem[];
  grandTotal: string;
};

type MetricsResponse = {
  range: { from: string | null; to: string | null };
  metrics: {
    totalIncome: string;
    totalExpense: string;
    netCashflow: string;
    txCount: number;
  };
};

function getTodayLocalIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const [direction, setDirection] = useState<Direction>("EXPENSE");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [dateResetKey, setDateResetKey] = useState(0);

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function loadDashboard(overrides?: { from?: string; to?: string }) {
    setLoading(true);
    setError("");

    try {
      const fromVal = overrides?.from ?? from;
      const toVal = overrides?.to ?? to;

      // shared date range params
      const rangeParams = new URLSearchParams();
      if (fromVal) rangeParams.set("from", fromVal);
      if (toVal) rangeParams.set("to", toVal);

      // 1) Summary (pie) = direction + range
      const summaryParams = new URLSearchParams(rangeParams);
      summaryParams.set("direction", direction);

      const res = await fetch(
        `/api/transactions/summary?${summaryParams.toString()}`,
        { cache: "no-store" },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Summary failed (${res.status})`);
      }

      const summaryJson = (await res.json()) as SummaryResponse;
      setData(summaryJson);

      // 2) Metrics (KPI row) = range only
      const res2 = await fetch(
        `/api/dashboard/metrics?${rangeParams.toString()}`,
        { cache: "no-store" },
      );

      if (!res2.ok) {
        const body = await res2.json().catch(() => ({}));
        throw new Error(body?.error ?? `Metrics failed (${res2.status})`);
      }

      const metricsJson = (await res2.json()) as MetricsResponse;
      setMetrics(metricsJson);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to load dashboard";
      setError(message);
      setData(null);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, from, to]);

  const hasItems = (data?.items?.length ?? 0) > 0;

  const chartData = useMemo(() => {
    const labels = (data?.items ?? []).map((x) => x.categoryName);
    const values = (data?.items ?? []).map((x) => Number(x.total) || 0);

    return {
      labels,
      datasets: [
        {
          label: `${direction} by category`,
          data: values,
          backgroundColor: [
            "#6366f1", // indigo
            "#22c55e", // green
            "#f97316", // orange
            "#ef4444", // red
            "#06b6d4", // cyan
            "#a855f7", // purple
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [data, direction]);

  const options: ChartOptions<"pie"> = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          position: "right",
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            padding: 16,
            color: "#374151",
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label ?? "Category";
              const value = Number(ctx.raw ?? 0);
              const total = Number(data?.grandTotal ?? 0) || 0;
              const pct =
                total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
              return `${label}: ${value.toFixed(2)} (${pct}%)`;
            },
          },
        },
      },
    }),
    [data],
  );

  return (
    <main className="container">
      <h1 style={{ marginBottom: 4, fontSize: 28 }}>FinTrack Dashboard</h1>
      <p style={{ marginTop: 0, color: "#666" }}>
        Category breakdown (pie chart) powered by my aggregation API.
      </p>

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginTop: 16,
          marginBottom: 16,
        }}
      >
        <div className="card">
          <div style={{ fontSize: 12, color: "#6b7280" }}>Total Income</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {metrics ? Number(metrics.metrics.totalIncome).toFixed(2) : "-"}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: "#6b7280" }}>Total Expense</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {metrics ? Number(metrics.metrics.totalExpense).toFixed(2) : "-"}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: "#6b7280" }}>Net Cashflow</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color:
                metrics && Number(metrics.metrics.netCashflow) < 0
                  ? "#dc2626"
                  : "#16a34a",
            }}
          >
            {metrics ? Number(metrics.metrics.netCashflow).toFixed(2) : "-"}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: "#6b7280" }}>Transactions</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {metrics ? metrics.metrics.txCount : "-"}
          </div>
        </div>
      </div>

      <div className="stack16">
        {/* Filters */}
        <div className="card">
          <h2 className="cardTitle">Filters</h2>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "end",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                Direction
              </label>
              <select
                value={direction}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "EXPENSE" || v === "INCOME") setDirection(v);
                }}
                style={{ padding: 8 }}
              >
                <option value="EXPENSE">EXPENSE</option>
                <option value="INCOME">INCOME</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                From (optional)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ position: "relative" }}>
                  {!from && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#9ca3af",
                        fontSize: 12,
                        pointerEvents: "none",
                      }}
                    >
                      dd/mm/yyyy
                    </span>
                  )}
                  <input
                    type="date"
                    key={`from-${dateResetKey}-${from || "empty"}`}
                    ref={fromRef}
                    value={from || ""}
                    onChange={(e) => setFrom(e.target.value)}
                    style={{
                      padding: 8,
                      color: from ? "inherit" : "transparent",
                      WebkitTextFillColor: from ? "inherit" : "transparent",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFrom("");
                    setDateResetKey((k) => k + 1);
                    if (fromRef.current) fromRef.current.value = "";
                  }}
                  disabled={loading || !from}
                  aria-label="Clear from date"
                  title="Clear"
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid #ddd",
                    background: "white",
                    cursor: loading || !from ? "not-allowed" : "pointer",
                    lineHeight: 1,
                  }}
                >
                  x
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                To (optional)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ position: "relative" }}>
                  {!to && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#9ca3af",
                        fontSize: 12,
                        pointerEvents: "none",
                      }}
                    >
                      dd/mm/yyyy
                    </span>
                  )}
                  <input
                    type="date"
                    key={`to-${dateResetKey}-${to || "empty"}`}
                    ref={toRef}
                    value={to || ""}
                    onChange={(e) => setTo(e.target.value)}
                    style={{
                      padding: 8,
                      color: to ? "inherit" : "transparent",
                      WebkitTextFillColor: to ? "inherit" : "transparent",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTo("");
                    setDateResetKey((k) => k + 1);
                    if (toRef.current) toRef.current.value = "";
                  }}
                  disabled={loading || !to}
                  aria-label="Clear to date"
                  title="Clear"
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid #ddd",
                    background: "white",
                    cursor: loading || !to ? "not-allowed" : "pointer",
                    lineHeight: 1,
                  }}
                >
                  x
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard()}
              disabled={loading}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: loading ? "#f5f5f5" : "white",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Loading..." : "Apply range"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
                setDateResetKey((k) => k + 1);
                if (fromRef.current) fromRef.current.value = "";
                if (toRef.current) toRef.current.value = "";
                loadDashboard({ from: "", to: "" });
              }}
              disabled={loading}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "white",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const today = getTodayLocalIsoDate();
                setFrom(today);
                setTo(today);
                setDateResetKey((k) => k + 1);
                if (fromRef.current) fromRef.current.value = today;
                if (toRef.current) toRef.current.value = today;
                loadDashboard({ from: today, to: today });
              }}
              disabled={loading}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "1px solid #111827",
                background: loading ? "#e5e7eb" : "#111827",
                color: loading ? "#6b7280" : "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Today
            </button>
          </div>
        </div>

        {/* Status */}
        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#fff5f5",
              border: "1px solid #ffd6d6",
              color: "#b00020",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Chart */}
        <div className="card">
          <h2 className="cardTitle">Category Breakdown</h2>

          {loading ? (
            <p>Loading summary…</p>
          ) : !data ? (
            <p>No data yet.</p>
          ) : (
            <>
              <p style={{ marginTop: 0, marginBottom: 12 }}>
                <strong>Grand total:</strong>{" "}
                {Number(data.grandTotal).toFixed(2)}
              </p>

              {!hasItems ? (
                <p>No data for this filter yet.</p>
              ) : (
                <div style={{ maxWidth: 820 }}>
                  <Pie data={chartData} options={options} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
