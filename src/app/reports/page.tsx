"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

type Totals = {
  totalIncome: string;
  totalExpense: string;
  netCashflow: string;
  txCount: number;
};

type MonthRow = {
  month: string;
  income: string;
  expense: string;
  net: string;
};

type BalanceSheetResponse = {
  range: { from: string | null; to: string | null };
  totals: Totals;
  monthly: MonthRow[];
};

type TrendRow = {
  month: string;
  income: string;
  expense: string;
  net: string;
  txCount: number;
};

type TrendsResponse = {
  months: number;
  startDate: string;
  data: TrendRow[];
};

export default function ReportsPage() {
  const router = useRouter();

  const [balance, setBalance] = useState<BalanceSheetResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [months, setMonths] = useState(6);

  async function loadReports(m?: number) {
    setLoading(true);
    setError("");
    try {
      const [bRes, tRes] = await Promise.all([
        fetch("/api/reports/balance-sheet", { cache: "no-store" }),
        fetch(`/api/reports/trends?months=${m ?? months}`, {
          cache: "no-store",
        }),
      ]);

      if (bRes.status === 401 || tRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!bRes.ok) {
        const b = await bRes.json().catch(() => ({}));
        throw new Error(b?.error ?? `Balance sheet failed (${bRes.status})`);
      }
      if (!tRes.ok) {
        const b = await tRes.json().catch(() => ({}));
        throw new Error(b?.error ?? `Trends failed (${tRes.status})`);
      }

      setBalance(await bRes.json());
      setTrends(await tRes.json());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load reports";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trendData = trends
    ? {
        labels: trends.data.map((r) => r.month),
        datasets: [
          {
            label: "Income",
            data: trends.data.map((r) => Number(r.income)),
            backgroundColor: "#22c55e",
            borderRadius: 4,
          },
          {
            label: "Expense",
            data: trends.data.map((r) => Number(r.expense)),
            backgroundColor: "#ef4444",
            borderRadius: 4,
          },
          {
            label: "Net",
            data: trends.data.map((r) => Number(r.net)),
            backgroundColor: "#6366f1",
            borderRadius: 4,
          },
        ],
      }
    : null;

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 12, boxHeight: 12, padding: 16, color: "#374151" },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: "#6b7280" },
        grid: { color: "#f3f4f6" },
      },
      x: {
        ticks: { color: "#6b7280" },
        grid: { display: false },
      },
    },
  };

  const net = balance ? Number(balance.totals.netCashflow) : 0;

  return (
    <main className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <h1 style={{ marginBottom: 0, fontSize: 28 }}>Reports</h1>
        <a
          href="/dashboard"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "white",
            color: "#374151",
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          &larr; Dashboard
        </a>
      </div>
      <p style={{ marginTop: 0, color: "#666" }}>
        Balance sheet &amp; monthly trends
      </p>

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

      {loading ? (
        <p>Loading reports…</p>
      ) : (
        <div className="stack16">
          {/* Balance Sheet Card */}
          <div className="card">
            <h2 className="cardTitle">Balance Sheet</h2>

            {/* KPI row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div style={{ fontSize: 11, color: "#16a34a" }}>
                  Total Income
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#15803d" }}
                >
                  {balance
                    ? Number(balance.totals.totalIncome).toFixed(2)
                    : "-"}
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                }}
              >
                <div style={{ fontSize: 11, color: "#dc2626" }}>
                  Total Expense
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#b91c1c" }}
                >
                  {balance
                    ? Number(balance.totals.totalExpense).toFixed(2)
                    : "-"}
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: net >= 0 ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${net >= 0 ? "#bbf7d0" : "#fecaca"}`,
                }}
              >
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  Net Cashflow
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: net >= 0 ? "#15803d" : "#b91c1c",
                  }}
                >
                  {balance
                    ? Number(balance.totals.netCashflow).toFixed(2)
                    : "-"}
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#eef2ff",
                  border: "1px solid #c7d2fe",
                }}
              >
                <div style={{ fontSize: 11, color: "#4338ca" }}>
                  Transactions
                </div>
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#3730a3" }}
                >
                  {balance ? balance.totals.txCount : "-"}
                </div>
              </div>
            </div>

            {/* Monthly breakdown table */}
            {balance && balance.monthly.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "2px solid #e5e7eb",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "8px 12px", color: "#6b7280" }}>
                        Month
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          color: "#6b7280",
                          textAlign: "right",
                        }}
                      >
                        Income
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          color: "#6b7280",
                          textAlign: "right",
                        }}
                      >
                        Expense
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          color: "#6b7280",
                          textAlign: "right",
                        }}
                      >
                        Net
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {balance.monthly.map((row) => {
                      const rowNet = Number(row.net);
                      return (
                        <tr
                          key={row.month}
                          style={{ borderBottom: "1px solid #f3f4f6" }}
                        >
                          <td style={{ padding: "8px 12px", fontWeight: 500 }}>
                            {row.month}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "right",
                              color: "#16a34a",
                            }}
                          >
                            {Number(row.income).toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "right",
                              color: "#dc2626",
                            }}
                          >
                            {Number(row.expense).toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "right",
                              fontWeight: 600,
                              color: rowNet >= 0 ? "#16a34a" : "#dc2626",
                            }}
                          >
                            {rowNet.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trends Card */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 className="cardTitle" style={{ marginBottom: 0 }}>
                Monthly Trends
              </h2>
              <div style={{ display: "flex", gap: 6 }}>
                {[3, 6, 12].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setMonths(n);
                      loadReports(n);
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "1px solid #d1d5db",
                      background: months === n ? "#111827" : "white",
                      color: months === n ? "#fff" : "#374151",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {n}mo
                  </button>
                ))}
              </div>
            </div>

            {trendData ? (
              <div style={{ maxWidth: 900 }}>
                <Bar data={trendData} options={barOptions} />
              </div>
            ) : (
              <p>No trend data.</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
