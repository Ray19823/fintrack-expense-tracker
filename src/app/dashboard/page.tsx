"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function DashboardPage() {
  const [direction, setDirection] = useState<Direction>("EXPENSE");
  const [from, setFrom] = useState<string>(""); // "YYYY-MM-DD"
  const [to, setTo] = useState<string>("");

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function loadSummary() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("direction", direction);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/transactions/summary?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const json = (await res.json()) as SummaryResponse;
      setData(json);
    } catch (e: unknown) {
      const message =
       e instanceof Error ? e.message : "Failed to load summary";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, from, to]);

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
    color: "374151", // slate-700
  },
},

        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label ?? "Category";
              const value = Number(ctx.raw ?? 0);
              const total = Number(data?.grandTotal ?? 0) || 0;
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
              return `${label}: ${value.toFixed(2)} (${pct}%)`;
            },
          },
        },
      },
    }),
    [data]
  );

  const hasItems = (data?.items?.length ?? 0) > 0;

  return (
  <main className="container">
    <h1 style={{ marginBottom: 8 }}>FinTrack Dashboard</h1>
    <p style={{ marginTop: 0, color: "#666" }}>
      Category breakdown (pie chart) powered by my aggregation API.
    </p>

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
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ padding: 8 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>
              To (optional)
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ padding: 8 }}
            />
          </div>

          <button
            onClick={loadSummary}
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
          }}
        >
          {error}
        </div>
      )}

      {/* Chart (always show the card; content changes inside) */}
      <div className="card">
        <h2 className="cardTitle">Category Breakdown</h2>

        {loading ? (
          <p>Loading summary…</p>
        ) : !data ? (
          <p>No data yet.</p>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              <strong>Grand total:</strong> {Number(data.grandTotal).toFixed(2)}
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
        {/* END chart card */}
</div>
    {/* END stack */}
    </main>
  );
}