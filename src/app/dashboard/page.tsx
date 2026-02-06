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

    // Convert totals (strings) to numbers for chart
    const values = (data?.items ?? []).map((x) => Number(x.total) || 0);

    return {
      labels,
      datasets: [
        {
          label: `${direction} by category`,
          data: values,
        },
      ],
    };
  }, [data, direction]);

  const options: ChartOptions<"pie"> = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { position: "right" },
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
      {/* direction / from / to / button */}
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

  {loading && <p>Loading summary…</p>}

  {/* Chart */}
  {!loading && data && (
    <div className="card">
      <h2 className="cardTitle">Category Breakdown</h2>

      <p style={{ marginTop: 0 }}>
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
    </div>
  )}
</div>
    {/* END stack */}
    </main>
  );
}