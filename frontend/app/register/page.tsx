"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Registration failed. Please try again.");
        return;
      }
      router.push("/login");
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
            Join Market Insight
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "0.95rem",
              lineHeight: 1.75,
              marginBottom: "2.5rem",
            }}
          >
            Start tracking your favourite NSE stocks with AI-powered insights
            in under a minute. Free forever.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {[
              ["✅", "Build a personalised watchlist"],
              ["🤖", "One-click AI insight generation"],
              ["📰", "Automatic news sentiment"],
              ["🔒", "Secure JWT authentication"],
            ].map(([icon, text]) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "0.65rem 1rem",
                  fontSize: "0.855rem",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                <span>{icon}</span>
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
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <h2
            style={{
              fontSize: "1.625rem",
              fontWeight: 800,
              color: "#111827",
              marginBottom: "0.375rem",
            }}
          >
            Create your account
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>
            Fill in the details below to get started.
          </p>

          {error && <div className="alert-error">{error}</div>}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}
          >
            <div>
              <label htmlFor="reg-username" className="label">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                className="input"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="label">
                Email address
              </label>
              <input
                id="reg-email"
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
              <label htmlFor="reg-password" className="label">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                className="input"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="label">
                Confirm password
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                className="input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              id="reg-submit"
              type="submit"
              className="btn btn-teal"
              disabled={loading}
              style={{ marginTop: "0.5rem", padding: "0.75rem", fontSize: "0.95rem" }}
            >
              {loading ? "Creating account…" : "Create Account"}
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
            Already have an account?{" "}
            <Link
              href="/login"
              style={{ color: "#0F6E56", fontWeight: 600, textDecoration: "none" }}
            >
              Sign in →
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
            By creating an account, you acknowledge this is for informational
            purposes only and not financial advice.
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
