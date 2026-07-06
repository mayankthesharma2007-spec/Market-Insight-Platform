"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { API_BASE, getToken, fetchWithAuth } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface StockData {
  symbol: string;
  current_price: number | null;
  daily_change_percent: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  volume: number | null;
}

interface AIInsight {
  symbol: string;
  trend: string;
  risks: string;
  observations: string;
}

interface NewsItem {
  headline: string;
  sentiment: "positive" | "negative" | "neutral";
}

// ── FAQ Accordion ──────────────────────────────────────────────────────────
interface FAQItem {
  q: string;
  a: string;
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="accordion-item">
          <button
            className="accordion-trigger"
            onClick={() => setOpen(open === i ? null : i)}
            id={`stock-faq-${i}`}
            aria-expanded={open === i}
          >
            <span>{item.q}</span>
            <span
              style={{
                transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
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
          {open === i && <div className="accordion-content">{item.a}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Sentiment badge ────────────────────────────────────────────────────────
function SentimentBadge({ sentiment }: { sentiment: string }) {
  const map: Record<string, { cls: string; label: string; icon: string }> = {
    positive: { cls: "badge-positive", label: "Positive", icon: "▲" },
    negative: { cls: "badge-negative", label: "Negative", icon: "▼" },
    neutral: { cls: "badge-neutral", label: "Neutral", icon: "●" },
  };
  const s = map[sentiment] ?? map.neutral;
  return (
    <span className={`badge ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

// ── Stat row item ──────────────────────────────────────────────────────────
function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "1.05rem",
          fontWeight: 700,
          color: color ?? "#111827",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const router = useRouter();

  const [stock, setStock] = useState<StockData | null>(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState("");

  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState("");

  // Auth guard
  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  // Fetch stock data
  useEffect(() => {
    if (!getToken()) return;
    setStockLoading(true);
    fetchWithAuth(`${API_BASE}/stock/${symbol}`)
      .then(async (r) => {
        if (r.status === 401) { router.replace("/login"); return; }
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Failed to fetch stock data.");
        setStock(d);
      })
      .catch((e) => setStockError(e.message))
      .finally(() => setStockLoading(false));
  }, [symbol, router]);

  // Fetch news
  useEffect(() => {
    if (!getToken()) return;
    setNewsLoading(true);
    fetchWithAuth(`${API_BASE}/news/${symbol}`)
      .then(async (r) => {
        if (r.status === 401) { router.replace("/login"); return; }
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Failed to fetch news.");
        setNews(Array.isArray(d) ? d : []);
      })
      .catch((e) => setNewsError(e.message))
      .finally(() => setNewsLoading(false));
  }, [symbol, router]);

  // Get AI insight on demand
  async function handleGetInsight() {
    setInsightLoading(true);
    setInsightError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/ai/insight`, {
        method: "POST",
        body: JSON.stringify({ symbol }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "AI insight failed.");
      setInsight(d);
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : "Failed to get insight.");
    } finally {
      setInsightLoading(false);
    }
  }

  // ── Build FAQ items from fetched data ────────────────────────────────────
  const faqItems: FAQItem[] = [];

  if (stock) {
    faqItems.push({
      q: `What are ${symbol}'s 52-week high and low?`,
      a:
        stock.week_52_high != null && stock.week_52_low != null
          ? `${symbol} hit a 52-week high of ₹${stock.week_52_high.toLocaleString("en-IN", { maximumFractionDigits: 2 })} and a 52-week low of ₹${stock.week_52_low.toLocaleString("en-IN", { maximumFractionDigits: 2 })} over the past year. The current price of ₹${stock.current_price?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "N/A"} is ${stock.current_price != null && stock.week_52_high != null ? ((stock.current_price / stock.week_52_high) * 100).toFixed(1) + "% of its 52-week high" : "not available"}.`
          : "52-week high/low data is not currently available for this stock.",
    });

    faqItems.push({
      q: `Is ${symbol} trending up or down?`,
      a:
        stock.daily_change_percent != null
          ? stock.daily_change_percent >= 0
            ? `${symbol} is trending UP today with a change of +${stock.daily_change_percent.toFixed(2)}%. This indicates positive momentum in the current session.`
            : `${symbol} is trending DOWN today with a change of ${stock.daily_change_percent.toFixed(2)}%. This reflects selling pressure in the current session.`
          : "Daily change data is not available for this stock right now.",
    });
  }

  faqItems.push({
    q: `What's driving ${symbol}'s price movement?`,
    a: insight
      ? `Based on AI analysis: ${insight.trend}`
      : 'Click "Get AI Insight" above to generate a Gemini-powered analysis of recent price trends, risks, and key observations for this stock.',
  });

  faqItems.push({
    q: `Should I buy or sell ${symbol}?`,
    a: `Market Insight Platform does not provide financial advice. All information shown — prices, AI insights, and news sentiment — is for informational and educational purposes only. Please consult a SEBI-registered investment advisor before making any buy, sell, or hold decisions.`,
  });

  const isPositive =
    stock?.daily_change_percent == null || stock.daily_change_percent >= 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7f9" }}>
      <Navbar />

      <div className="page-content">
        {/* ── Back link ── */}
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.85rem",
            color: "#6b7280",
            textDecoration: "none",
            marginBottom: "1.5rem",
            fontWeight: 500,
          }}
        >
          ← Back to Dashboard
        </Link>

        {/* ── Stock loading ── */}
        {stockLoading && (
          <div className="card" style={{ padding: "2rem" }}>
            <div
              className="skeleton"
              style={{ height: "28px", width: "200px", marginBottom: "1rem" }}
            />
            <div
              className="skeleton"
              style={{ height: "48px", width: "160px", marginBottom: "0.75rem" }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))",
                gap: "1rem",
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="skeleton" style={{ height: "11px", width: "60%", marginBottom: "6px" }} />
                  <div className="skeleton" style={{ height: "18px", width: "80%" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stock error ── */}
        {!stockLoading && stockError && (
          <div className="alert-error">{stockError}</div>
        )}

        {/* ── Stock data card ── */}
        {!stockLoading && stock && (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: "#111827",
                    marginBottom: "0.2rem",
                  }}
                >
                  {symbol.toUpperCase()}
                </h1>
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>NSE India</p>
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "2.25rem",
                    fontWeight: 800,
                    color: "#111827",
                    lineHeight: 1.1,
                  }}
                >
                  {stock.current_price != null
                    ? `₹${stock.current_price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                    : "—"}
                </div>
                {stock.daily_change_percent != null && (
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: isPositive ? "#3B6D11" : "#A32D2D",
                      marginTop: "0.2rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      justifyContent: "flex-end",
                    }}
                  >
                    {isPositive ? "▲" : "▼"}{" "}
                    {isPositive ? "+" : ""}
                    {stock.daily_change_percent.toFixed(2)}% today
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))",
                gap: "1.25rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <StatItem
                label="52-Week High"
                value={
                  stock.week_52_high != null
                    ? `₹${stock.week_52_high.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                    : "—"
                }
                color="#3B6D11"
              />
              <StatItem
                label="52-Week Low"
                value={
                  stock.week_52_low != null
                    ? `₹${stock.week_52_low.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                    : "—"
                }
                color="#A32D2D"
              />
              <StatItem
                label="Volume"
                value={
                  stock.volume != null
                    ? stock.volume >= 1_000_000
                      ? `${(stock.volume / 1_000_000).toFixed(2)}M`
                      : stock.volume >= 1_000
                      ? `${(stock.volume / 1_000).toFixed(1)}K`
                      : stock.volume.toString()
                    : "—"
                }
              />
              <StatItem
                label="Daily Change"
                value={
                  stock.daily_change_percent != null
                    ? `${stock.daily_change_percent >= 0 ? "+" : ""}${stock.daily_change_percent.toFixed(2)}%`
                    : "—"
                }
                color={isPositive ? "#3B6D11" : "#A32D2D"}
              />
            </div>
          </div>
        )}

        {/* ── AI Insight ── */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h2
                style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "0.2rem" }}
              >
                🤖 AI Insight
              </h2>
              <p style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
                Powered by Google Gemini — for informational use only.
              </p>
            </div>
            <button
              id="get-ai-insight-btn"
              className="btn btn-primary"
              onClick={handleGetInsight}
              disabled={insightLoading}
              style={{ flexShrink: 0 }}
            >
              {insightLoading ? "Generating…" : insight ? "Refresh Insight" : "Get AI Insight"}
            </button>
          </div>

          {insightError && <div className="alert-error">{insightError}</div>}

          {insightLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="skeleton" style={{ height: "12px", width: "100px", marginBottom: "6px" }} />
                  <div className="skeleton" style={{ height: "60px", width: "100%" }} />
                </div>
              ))}
            </div>
          )}

          {!insightLoading && insight && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                { key: "trend", label: "📈 Trend", text: insight.trend },
                { key: "risks", label: "⚠️ Risks", text: insight.risks },
                { key: "observations", label: "🔍 Observations", text: insight.observations },
              ].map((s) => (
                <div
                  key={s.key}
                  style={{
                    background: "#f6f7f9",
                    borderRadius: "8px",
                    padding: "1rem 1.25rem",
                    borderLeft: "3px solid #1a1a1a",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {s.label}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.75 }}>
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!insightLoading && !insight && !insightError && (
            <p style={{ fontSize: "0.875rem", color: "#9ca3af", textAlign: "center", padding: "1.5rem 0" }}>
              Click &quot;Get AI Insight&quot; to generate a Gemini-powered analysis of this stock.
            </p>
          )}
        </div>

        {/* ── News & Sentiment ── */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "0.25rem" }}>
            📰 Latest News
          </h2>
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", marginBottom: "1.25rem" }}>
            Top headlines with AI-powered sentiment analysis.
          </p>

          {newsLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className="skeleton" style={{ height: "20px", width: "72px", borderRadius: "999px", flexShrink: 0 }} />
                  <div className="skeleton" style={{ height: "16px", flex: 1 }} />
                </div>
              ))}
            </div>
          )}

          {!newsLoading && newsError && (
            <div className="alert-error">{newsError}</div>
          )}

          {!newsLoading && !newsError && news.length === 0 && (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
              No news articles found for {symbol}.
            </p>
          )}

          {!newsLoading && news.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {news.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.875rem",
                    padding: "0.875rem",
                    background: "#f6f7f9",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ flexShrink: 0, paddingTop: "2px" }}>
                    <SentimentBadge sentiment={item.sentiment} />
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.6 }}>
                    {item.headline}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Stock FAQ ── */}
        {faqItems.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginBottom: "1rem" }}>
              ❓ Frequently Asked Questions
            </h2>
            <FAQAccordion items={faqItems} />
          </div>
        )}
      </div>
    </div>
  );
}
