"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

type Budget = {
  id: string;
  monthStart: string;
  limitAmount: string;
  category: Category;
};

export default function BudgetsPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [monthStart, setMonthStart] = useState("2026-06-01");
  const [limitAmount, setLimitAmount] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "EXPENSE"),
    [categories],
  );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [catRes, budgetRes] = await Promise.all([
        fetch("/api/categories", { cache: "no-store" }),
        fetch("/api/budgets", { cache: "no-store" }),
      ]);

      if (catRes.status === 401 || budgetRes.status === 401) {
        router.push("/login");
        return;
      }

      const catJson = await catRes.json();
      const budgetJson = await budgetRes.json();

      if (!catRes.ok)
        throw new Error(catJson.error ?? "Failed to load categories");
      if (!budgetRes.ok)
        throw new Error(budgetJson.error ?? "Failed to load budgets");

      setCategories(catJson.categories ?? []);
      setBudgets(budgetJson.budgets ?? []);

      const firstExpense = (catJson.categories ?? []).find(
        (c: Category) => c.type === "EXPENSE",
      );

      if (firstExpense && !categoryId) {
        setCategoryId(firstExpense.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createBudget() {
    setSaving(true);
    setError("");

    try {
      if (!categoryId) throw new Error("Please select an expense category");
      if (!monthStart) throw new Error("Please select a month");
      const amount = Number.parseFloat(limitAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Budget limit must be a positive number");
      }

      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          categoryId,
          monthStart,
          limitAmount: amount,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(body.error ?? "Failed to create budget");
      }

      setLimitAmount("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create budget");
    } finally {
      setSaving(false);
    }
  }

  async function updateBudget(budgetId: string) {
    setSaving(true);
    setError("");

    try {
      const amount = Number.parseFloat(editingAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Budget limit must be a positive number");
      }

      const res = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          budgetId,
          limitAmount: amount,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(body.error ?? "Failed to update budget");
      }

      setEditingId(null);
      setEditingAmount("");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update budget");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(budgetId: string) {
    const ok = confirm("Delete this budget?");
    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/budgets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ budgetId }),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error(body.error ?? "Failed to delete budget");
      }

      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete budget");
    } finally {
      setSaving(false);
    }
  }

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
          <h1 style={{ marginBottom: 6, fontSize: 28 }}>Budget Management</h1>
          <p style={{ marginTop: 0, color: "#666" }}>
            Set monthly limits for your expense categories.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <a href="/dashboard" style={navButton}>
            Dashboard
          </a>
          <a href="/transactions" style={navButton}>
            Transactions
          </a>
          <a href="/categories" style={navButton}>
            Categories
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
        <h2 className="cardTitle">Create Budget</h2>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <div>
            <label style={label}>Expense Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={input}
              disabled={saving || expenseCategories.length === 0}
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Month Start</label>
            <input
              type="date"
              value={monthStart}
              onChange={(e) => setMonthStart(e.target.value)}
              style={input}
              disabled={saving}
            />
          </div>

          <div>
            <label style={label}>Limit Amount</label>
            <input
              inputMode="decimal"
              placeholder="e.g. 300"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              style={input}
              disabled={saving}
            />
          </div>

          <button
            type="button"
            onClick={createBudget}
            disabled={saving || loading}
            style={primaryButton}
          >
            {saving ? "Saving..." : "Create Budget"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="cardTitle">Budgets</h2>

        {loading ? (
          <p>Loading budgets…</p>
        ) : budgets.length === 0 ? (
          <p>No budgets yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={th}>Month</th>
                  <th style={th}>Category</th>
                  <th style={th}>Limit</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {budgets.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={td}>{b.monthStart.slice(0, 10)}</td>
                    <td style={td}>{b.category.name}</td>
                    <td style={td}>
                      {editingId === b.id ? (
                        <input
                          value={editingAmount}
                          onChange={(e) => setEditingAmount(e.target.value)}
                          style={input}
                        />
                      ) : (
                        Number(b.limitAmount).toFixed(2)
                      )}
                    </td>
                    <td style={td}>
                      {editingId === b.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => updateBudget(b.id)}
                            disabled={saving}
                            style={smallButton}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditingAmount("");
                            }}
                            disabled={saving}
                            style={{ ...smallButton, marginLeft: 8 }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(b.id);
                              setEditingAmount(String(b.limitAmount));
                            }}
                            style={smallButton}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBudget(b.id)}
                            disabled={saving}
                            style={{
                              ...smallButton,
                              marginLeft: 8,
                              color: "#b91c1c",
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
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

const smallButton: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "white",
  color: "#374151",
  fontSize: 13,
  cursor: "pointer",
};
