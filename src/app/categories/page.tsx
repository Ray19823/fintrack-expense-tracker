"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCategories() {
    try {
      setLoading(true);

      const res = await fetch("/api/categories", {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load categories");
      }

      setCategories(data.categories ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function createCategory() {
    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create category");
      }

      setName("");
      await loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(categoryId: string) {
    const ok = confirm("Delete this category? This cannot be undone.");

    if (!ok) return;

    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete category");
      }

      await loadCategories();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete category");
    }
  }

  return (
    <main className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>Category Management</h1>

        <div style={{ display: "flex", gap: 8 }}>
          <a href="/dashboard" style={navButton}>
            Dashboard
          </a>

          <a href="/transactions" style={navButton}>
            Transactions
          </a>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fff5f5",
            border: "1px solid #ffd6d6",
            color: "#b00020",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Create Category</h2>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: 10,
              minWidth: 220,
            }}
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
            style={{
              padding: 10,
            }}
          >
            <option value="EXPENSE">EXPENSE</option>
            <option value="INCOME">INCOME</option>
          </select>

          <button type="button" disabled={saving} onClick={createCategory}>
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Categories</h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th align="left">Name</th>
                <th align="left">Type</th>
                <th align="left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{c.type}</td>

                  <td style={td}>
                    <button
                      type="button"
                      onClick={() => deleteCategory(c.id)}
                      style={{
                        color: "#b91c1c",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

const td: React.CSSProperties = {
  padding: "10px 6px",
  borderTop: "1px solid #eee",
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
