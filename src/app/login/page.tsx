"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data.error ||
            `${mode === "login" ? "Login" : "Registration"} failed (${res.status})`,
        );
        return;
      }

      if (mode === "register") {
        setSuccess("Account created! Signing you in…");
        // Auto-login after successful registration
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (loginRes.ok) {
          router.push("/dashboard");
          return;
        }
        // If auto-login fails, switch to login mode
        setMode("login");
        setSuccess("Account created! Please sign in.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          padding: 32,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
        }}
      >
        <h1 style={{ margin: "0 0 4px", fontSize: 24 }}>FinTrack</h1>
        <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 14 }}>
          {mode === "login"
            ? "Sign in to your account"
            : "Create a new account"}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 4,
                color: "#374151",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 4,
                color: "#374151",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 12px",
                borderRadius: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 12px",
                borderRadius: 8,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#15803d",
                fontSize: 13,
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: loading ? "#9ca3af" : "#111827",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            fontSize: 13,
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setSuccess("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4f46e5",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4f46e5",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
