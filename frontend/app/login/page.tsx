"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE, storeAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Login failed. Please check your credentials.");
        return;
      }
      storeAuth(data.access_token, data.username);
      router.push("/dashboard");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* ── Left teal panel ── */}
      <div
        style={{
          flex: "0 0 42%",
          background: "linear-gradient(160deg, #0F6E56 0%, #0a5240 60%, #083d30 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 2.5rem",
          color: "#fff",
        }}
        className="hidden-mobile"
      >
        <div style={{ maxWidth: "340px", width: "100%" }}>
          <div
            style={{
              fontSize: "2.5rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "16px",
            }}
          >
            📈
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              marginBottom: "0.75rem",
              color: "#fff",
              lineHeight: 1.2,
            }}
          >
            Market Insight
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "0.95rem",
              lineHeight: 1.75,
              marginBottom: "2.5rem",
            }}
          >
            Real-time NSE stocks, AI-powered analysis, and news sentiment — all
            in one place.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              ["📊", "Live NSE price tracking"],
              ["🤖", "Gemini AI stock insights"],
              ["📰", "News sentiment analysis"],
            ].map(([icon, text]) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.875rem",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          padding: "2rem 1.5rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <h2
            style={{
              fontSize: "1.625rem",
              fontWeight: 800,
              color: "#111827",
              marginBottom: "0.375rem",
            }}
          >
            Welcome back
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>
            Sign in to your account to continue.
          </p>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <div>
              <label htmlFor="login-email" className="label">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: "0.5rem", padding: "0.75rem", fontSize: "0.95rem" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p
            style={{
              marginTop: "1.5rem",
              textAlign: "center",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              style={{ color: "#0F6E56", fontWeight: 600, textDecoration: "none" }}
            >
              Create one →
            </Link>
          </p>

          <p
            style={{
              marginTop: "2rem",
              textAlign: "center",
              fontSize: "0.72rem",
              color: "#9ca3af",
              lineHeight: 1.6,
            }}
          >
            For informational purposes only. Not financial advice.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
