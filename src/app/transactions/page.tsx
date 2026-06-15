"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Transaction = {
  id: string;
  direction: "INCOME" | "EXPENSE";
  amount: string;
  txnDate: string;
  description: string | null;
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
  };
};

export default function TransactionsPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadTransactions(cursor?: string) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("take", "20");
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/transactions?${params.toString()}`, {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to load transactions");
      }

      const json = await res.json();

      setTransactions((prev) =>
        cursor ? [...prev, ...json.transactions] : json.transactions,
      );
      setNextCursor(json.pageInfo.nextCursor);
      setHasNextPage(json.pageInfo.hasNextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTransaction(id: string) {
    const ok = confirm("Delete this transaction?");
    if (!ok) return;

    setDeletingId(id);
    setError("");

    try {
      const res = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: id }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to delete transaction");
      }

      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadTransactions();
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
          <h1 style={{ marginBottom: 6, fontSize: 28 }}>Transactions</h1>
          <p style={{ marginTop: 0, color: "#666" }}>
            View and manage your income and expenses.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <a
            href="/transactions/new"
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
            Add Transaction
          </a>

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
            Dashboard
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

      <div className="card">
        <h2 className="cardTitle">Transaction History</h2>

        {loading && transactions.length === 0 ? (
          <p>Loading transactions…</p>
        ) : transactions.length === 0 ? (
          <p>No transactions yet. Add your first transaction.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={th}>Date</th>
                  <th style={th}>Category</th>
                  <th style={th}>Type</th>
                  <th style={th}>Description</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={td}>{t.txnDate.slice(0, 10)}</td>
                    <td style={td}>{t.category.name}</td>
                    <td style={td}>{t.direction}</td>
                    <td style={td}>{t.description ?? "-"}</td>
                    <td
                      style={{
                        ...td,
                        fontWeight: 700,
                        color:
                          t.direction === "EXPENSE" ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {Number(t.amount).toFixed(2)}
                    </td>
                    <td style={td}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/transactions/${t.id}/edit`)
                        }
                        style={smallButton}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTransaction(t.id)}
                        disabled={deletingId === t.id}
                        style={{
                          ...smallButton,
                          marginLeft: 8,
                          color: "#b91c1c",
                        }}
                      >
                        {deletingId === t.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasNextPage && (
              <button
                type="button"
                onClick={() => nextCursor && loadTransactions(nextCursor)}
                disabled={loading}
                style={{
                  marginTop: 16,
                  padding: "9px 14px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

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

const smallButton: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "white",
  color: "#374151",
  fontSize: 13,
  cursor: "pointer",
};
