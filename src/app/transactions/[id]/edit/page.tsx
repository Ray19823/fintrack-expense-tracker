"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

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

type Direction = "INCOME" | "EXPENSE";

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = String(params.id ?? "");

  const [categories, setCategories] = useState<Category[]>([]);
  const [direction, setDirection] = useState<Direction>("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [txnDate, setTxnDate] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === direction),
    [categories, direction],
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [txRes, catRes] = await Promise.all([
          fetch("/api/transactions?take=100", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
        ]);

        if (txRes.status === 401 || catRes.status === 401) {
          router.push("/login");
          return;
        }

        if (!txRes.ok) {
          const body = await txRes.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to load transaction");
        }

        if (!catRes.ok) {
          const body = await catRes.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to load categories");
        }

        const txJson = await txRes.json();
        const catJson = await catRes.json();

        const found = (txJson.transactions ?? []).find(
          (t: Transaction) => t.id === transactionId,
        );

        if (!found) {
          throw new Error("Transaction not found in loaded list");
        }

        setCategories(catJson.categories ?? []);
        setDirection(found.direction);
        setCategoryId(found.category.id);
        setAmount(String(found.amount));
        setTxnDate(String(found.txnDate).slice(0, 10));
        setDescription(found.description ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load edit form");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [transactionId, router]);

  useEffect(() => {
    if (!filteredCategories.length) return;

    const currentCategoryStillValid = filteredCategories.some(
      (c) => c.id === categoryId,
    );

    if (!currentCategoryStillValid) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [direction, filteredCategories, categoryId]);

  async function saveChanges() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const parsedAmount = Number.parseFloat(amount);

      if (!categoryId) throw new Error("Please select a category");
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Amount must be a positive number");
      }
      if (!txnDate) throw new Error("Please select a date");

      const res = await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          transactionId,
          categoryId,
          direction,
          amount: parsedAmount,
          txnDate,
          description: description.trim(),
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to update transaction");
      }

      setSuccess("Transaction updated ✅");

      setTimeout(() => {
        router.push("/transactions");
      }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <p>Loading transaction…</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
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
          <h1 style={{ marginBottom: 6, fontSize: 28 }}>Edit Transaction</h1>
          <p style={{ marginTop: 0, color: "#666" }}>
            Update an existing income or expense record.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/transactions")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "white",
            color: "#374151",
            fontSize: 13,
          }}
        >
          Back to Transactions
        </button>
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

      {success && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            color: "#065f46",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {success}
        </div>
      )}

      <div className="card">
        <h2 className="cardTitle">Transaction Details</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <label style={label}>Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as Direction)}
              style={input}
              disabled={saving}
            >
              <option value="EXPENSE">EXPENSE</option>
              <option value="INCOME">INCOME</option>
            </select>
          </div>

          <div>
            <label style={label}>Date</label>
            <input
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              style={input}
              disabled={saving}
            />
          </div>

          <div>
            <label style={label}>Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={input}
              disabled={saving || filteredCategories.length === 0}
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Amount</label>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={input}
              disabled={saving}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={label}>Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={input}
            disabled={saving}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: saving ? "#e5e7eb" : "#111827",
              color: saving ? "#6b7280" : "#fff",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/transactions")}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
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
  width: "100%",
};
