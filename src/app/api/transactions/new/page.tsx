"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

type Direction = "INCOME" | "EXPENSE";

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewTransactionPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [direction, setDirection] = useState<Direction>("EXPENSE");
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [txnDate, setTxnDate] = useState<string>(todayIso());
  const [description, setDescription] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Load categories (requires auth cookie)
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoadingCats(true);
      setError("");
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error ?? `Failed to load categories (${res.status})`,
          );
        }
        const json = await res.json();
        const cats = (json?.categories ?? []) as Category[];
        if (!alive) return;
        setCategories(cats);
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load categories");
      } finally {
        if (!alive) return;
        setLoadingCats(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [router]);

  // Categories filtered by direction
  const filtered = useMemo(
    () => categories.filter((c) => c.type === direction),
    [categories, direction],
  );

  // Auto-pick first category when direction changes / categories arrive
  useEffect(() => {
    if (!filtered.length) {
      setCategoryId("");
      return;
    }
    // If current categoryId isn't in the filtered list, pick the first
    const ok = filtered.some((c) => c.id === categoryId);
    if (!ok) setCategoryId(filtered[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, filtered.length]);

  async function submit() {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Basic client validation (server will re-check anyway)
      if (!categoryId) throw new Error("Please pick a category");
      const parsed = Number.parseFloat(amount);
      if (!Number.isFinite(parsed) || parsed <= 0)
        throw new Error("Amount must be a positive number");
      if (!txnDate) throw new Error("Please pick a date");

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          direction,
          categoryId,
          amount: parsed, // your API accepts number or string
          txnDate, // "YYYY-MM-DD"
          description: description.trim() ? description.trim() : undefined,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Create failed (${res.status})`);
      }

      setSuccess("Transaction added ✅");
      // Optional: reset amount/description for fast entry
      setAmount("");
      setDescription("");

      // Go back to dashboard so they instantly see updated metrics
      setTimeout(() => router.push("/dashboard"), 400);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create transaction");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 720 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6, fontSize: 28 }}>Add Transaction</h1>
          <p style={{ marginTop: 0, color: "#666" }}>
            Log income/expenses and your dashboard updates automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "white",
            color: "#374151",
            fontSize: 13,
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
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

      {success && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            color: "#065f46",
            fontSize: 14,
          }}
        >
          {success}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="cardTitle">Details</h2>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>
              Direction
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as Direction)}
              style={{ padding: 10, width: "100%" }}
              disabled={loadingCats || submitting}
            >
              <option value="EXPENSE">EXPENSE</option>
              <option value="INCOME">INCOME</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>
              Date
            </label>
            <input
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              style={{ padding: 10, width: "100%" }}
              disabled={submitting}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{ padding: 10, width: "100%" }}
              disabled={loadingCats || submitting || !filtered.length}
            >
              {loadingCats ? (
                <option>Loading...</option>
              ) : filtered.length ? (
                filtered.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              ) : (
                <option value="">No categories for {direction}</option>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: "#666" }}>
              Amount
            </label>
            <input
              inputMode="decimal"
              placeholder="e.g. 12.34"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ padding: 10, width: "100%" }}
              disabled={submitting}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666" }}>
            Description (optional)
          </label>
          <input
            placeholder="e.g. Dinner, Netflix, Taxi..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ padding: 10, width: "100%" }}
            disabled={submitting}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || loadingCats}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: submitting ? "#e5e7eb" : "#111827",
              color: submitting ? "#6b7280" : "#fff",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Saving..." : "Save transaction"}
          </button>

          <button
            type="button"
            onClick={() => {
              setAmount("");
              setDescription("");
              setError("");
              setSuccess("");
            }}
            disabled={submitting}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </main>
  );
}
