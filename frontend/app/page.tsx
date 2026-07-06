"use client";

import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    q: "Where does the stock data come from?",
    a: "We source real-time and historical stock prices directly from NSE (National Stock Exchange of India) via yfinance — a reliable financial data library that pulls live market information.",
  },
  {
    q: "How does the AI insight feature work?",
    a: "Our AI Insight feature uses Google's Gemini model, one of the most advanced large language models available. It analyzes your stock's recent price history and generates structured observations on trend, risks, and key patterns — all automatically.",
  },
  {
    q: "Is my data and account secure?",
    a: "Yes. We use industry-standard JWT (JSON Web Token) authentication with bcrypt password hashing. Your credentials are never stored in plain text, and all API calls require a valid, time-limited token.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Market Insight Platform is an informational and educational tool only. Nothing on this platform constitutes financial advice. Always consult a SEBI-registered financial advisor before making investment decisions.",
  },
  {
    q: "How do I add stocks to my watchlist?",
    a: "After logging in, head to your Dashboard and use the 'Add Stock' input. Enter any NSE ticker symbol (e.g. RELIANCE, TCS, INFY) and click Add. The stock will appear on your watchlist with live pricing.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* ── Minimal header ── */}
      <header
        style={{
          background: "#1a1a1a",
          padding: "0 1.5rem",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>📈</span>
          Market Insight
        </span>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            href="/login"
            style={{
              color: "#d1d5db",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
              padding: "0.4rem 0.875rem",
              border: "1.5px solid #374151",
              borderRadius: "6px",
              transition: "border-color 0.2s",
            }}
          >
            Login
          </Link>
          <Link
            href="/register"
            style={{
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 600,
              padding: "0.4rem 0.875rem",
              background: "#0F6E56",
              borderRadius: "6px",
            }}
          >
            Register
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        style={{
          background: "linear-gradient(135deg, #0F6E56 0%, #1a5c47 50%, #0d4a37 100%)",
          padding: "6rem 1.5rem 5rem",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "999px",
              padding: "0.3rem 0.9rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              marginBottom: "1.5rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <span>✨</span> AI-Powered Market Intelligence
          </div>
          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: "1.25rem",
              color: "#fff",
            }}
          >
            Track Stocks Smarter,{" "}
            <span style={{ color: "#a7f3d0" }}>Not Harder</span>
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.7,
              marginBottom: "2.5rem",
              maxWidth: "560px",
              margin: "0 auto 2.5rem",
            }}
          >
            Real-time NSE stock tracking, AI-generated insights from Gemini, and
            news sentiment analysis — all in one clean dashboard.
          </p>
          <div
            style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link
              href="/register"
              style={{
                background: "#fff",
                color: "#0F6E56",
                textDecoration: "none",
                fontWeight: 700,
                padding: "0.75rem 2rem",
                borderRadius: "8px",
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              Get Started Free →
            </Link>
            <Link
              href="/login"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                padding: "0.75rem 2rem",
                borderRadius: "8px",
                fontSize: "0.95rem",
                border: "1.5px solid rgba(255,255,255,0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section style={{ padding: "5rem 1.5rem", background: "#f6f7f9" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              fontSize: "1.75rem",
              fontWeight: 800,
              marginBottom: "0.75rem",
              color: "#111827",
            }}
          >
            Everything you need to stay informed
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              marginBottom: "3rem",
              fontSize: "0.95rem",
            }}
          >
            No complexity. Just the data that matters.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {[
              {
                icon: "📊",
                title: "Live Price Tracking",
                desc: "Add any NSE-listed stock and get real-time prices, daily change %, 52-week highs/lows, and trading volume — refreshed every session.",
                accent: "#0F6E56",
              },
              {
                icon: "🤖",
                title: "AI-Generated Insights",
                desc: "One click activates Gemini AI analysis — trend direction, key risks, and market observations tailored to that stock's recent price action.",
                accent: "#1a1a1a",
              },
              {
                icon: "📰",
                title: "News Sentiment Analysis",
                desc: "Top Google News headlines for each stock automatically classified as positive, negative, or neutral by AI — no manual reading needed.",
                accent: "#0F6E56",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="card"
                style={{ padding: "2rem" }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    marginBottom: "1rem",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "52px",
                    height: "52px",
                    background: f.accent === "#0F6E56" ? "#e6f5f0" : "#f3f4f6",
                    borderRadius: "12px",
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    marginBottom: "0.5rem",
                    color: "#111827",
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.875rem", lineHeight: 1.7 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "5rem 1.5rem", background: "#fff" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              fontSize: "1.75rem",
              fontWeight: 800,
              marginBottom: "0.5rem",
              color: "#111827",
            }}
          >
            Frequently Asked Questions
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              marginBottom: "2.5rem",
              fontSize: "0.9rem",
            }}
          >
            Everything you need to know about Market Insight Platform.
          </p>

          <div>
            {faqs.map((f, i) => (
              <div key={i} className="accordion-item">
                <button
                  className="accordion-trigger"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  id={`faq-trigger-${i}`}
                  aria-expanded={openFaq === i}
                >
                  <span>{f.q}</span>
                  <span
                    style={{
                      transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      flexShrink: 0,
                      marginLeft: "0.5rem",
                    }}
                  >
                    ▼
                  </span>
                </button>
                {openFaq === i && (
                  <div className="accordion-content">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          background: "#1a1a1a",
          color: "#9ca3af",
          textAlign: "center",
          padding: "1.75rem 1.5rem",
          fontSize: "0.8rem",
        }}
      >
        <p>
          © {new Date().getFullYear()} Market Insight Platform. For informational purposes only —{" "}
          <strong style={{ color: "#e5e7eb" }}>not financial advice</strong>.
        </p>
      </footer>
    </div>
  );
}
