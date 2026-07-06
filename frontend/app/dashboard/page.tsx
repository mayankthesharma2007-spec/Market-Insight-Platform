"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { API_BASE, getToken, fetchWithAuth } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface WatchlistEntry {
  symbol: string;
  added_at: string;
}

interface StockData {
  symbol: string;
  current_price: number | null;
  daily_change_percent: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  volume: number | null;
}

interface CardData extends StockData {
  sparkline: number[];
}

// ── Symbol → domain map ────────────────────────────────────────────────────
const DOMAIN_MAP: Record<string, string> = {
  RELIANCE: "relianceindustries",
  TCS: "tcs",
  INFY: "infosys",
  HDFCBANK: "hdfcbank",
  WIPRO: "wipro",
  HINDUNILVR: "hul",
  ICICIBANK: "icicibank",
  KOTAKBANK: "kotak",
  AXISBANK: "axisbank",
  BAJFINANCE: "bajajfinserv",
  SBIN: "sbi",
  MARUTI: "marutisuzuki",
  TATASTEEL: "tatasteel",
  LT: "larsentoubro",
  SUNPHARMA: "sunpharma",
};

function getDomain(symbol: string): string {
  const bare = symbol.replace(".NS", "").toUpperCase();
  return DOMAIN_MAP[bare] || bare.toLowerCase();
}

// ── Sparkline SVG ──────────────────────────────────────────────────────────
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 80;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data
    .map(
      (v, i) =>
        `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`
    )
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke={positive ? "#3B6D11" : "#A32D2D"}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

// ── Initials Avatar fallback ───────────────────────────────────────────────
const AVATAR_COLORS = [
  "#0F6E56", "#1a1a1a", "#374151", "#6b4226", "#4a2c8f", "#c94b00",
];

function InitialsAvatar({ symbol }: { symbol: string }) {
  const bare = symbol.replace(".NS", "");
  const initials = bare.slice(0, 2).toUpperCase();
  const color = AVATAR_COLORS[bare.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div
      style={{
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "0.875rem",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ── Market status ──────────────────────────────────────────────────────────
function getMarketStatus(): { open: boolean; label: string } {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const day = ist.getDay(); // 0=Sun 6=Sat
  const h = ist.getHours();
  const m = ist.getMinutes();
  const mins = h * 60 + m;
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && mins >= 9 * 60 + 15 && mins < 15 * 60 + 30;
  return { open: isOpen, label: isOpen ? "Market Open" : "Market Closed" };
}

// ── Random sparkline data ──────────────────────────────────────────────────
function genSparkline(change: number | null): number[] {
  const trend = change ?? 0;
  const pts: number[] = [100];
  for (let i = 1; i < 7; i++) {
    const delta = (Math.random() - 0.48) * 2 + trend * 0.1;
    pts.push(pts[i - 1] + delta);
  }
  return pts;
}

// ── Dashboard page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [addSymbol, setAddSymbol] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const marketStatus = getMarketStatus();

  // ── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  // ── Fetch watchlist + stock data ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const wlRes = await fetchWithAuth(`${API_BASE}/watchlist`);
      if (wlRes.status === 401) {
        router.replace("/login");
        return;
      }
      if (!wlRes.ok) {
        const d = await wlRes.json();
        throw new Error(d.detail || "Failed to load watchlist.");
      }
      const wlData: { symbols: WatchlistEntry[] } = await wlRes.json();
      const symbols = wlData.symbols || [];

      if (symbols.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      // Parallel fetch for all stocks
      const results = await Promise.allSettled(
        symbols.map((s) =>
          fetchWithAuth(`${API_BASE}/stock/${s.symbol}`).then((r) => r.json())
        )
      );

      const data: CardData[] = results
        .map((r, i) => {
          if (r.status === "fulfilled" && r.value && !r.value.detail) {
            const sd: StockData = r.value;
            return {
              ...sd,
              sparkline: genSparkline(sd.daily_change_percent),
            };
          }
          // Fallback placeholder
          return {
            symbol: symbols[i].symbol,
            current_price: null,
            daily_change_percent: null,
            week_52_high: null,
            week_52_low: null,
            volume: null,
            sparkline: genSparkline(null),
          };
        });

      setCards(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (getToken()) fetchAll();
  }, [fetchAll]);

  // ── Add stock ─────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!addSymbol.trim()) return;
    setAddError("");
    setAddSuccess("");
    setAddLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/watchlist/add`, {
        method: "POST",
        body: JSON.stringify({ symbol: addSymbol.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.detail || "Failed to add stock.");
        return;
      }
      setAddSuccess(`${addSymbol.trim().toUpperCase()} added!`);
      setAddSymbol("");
      fetchAll();
      setTimeout(() => setAddSuccess(""), 3000);
    } catch {
      setAddError("Network error, please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  // ── Remove stock ──────────────────────────────────────────────────────────
  async function handleRemove(symbol: string) {
    setRemoveLoading(symbol);
    try {
      const res = await fetchWithAuth(`${API_BASE}/watchlist/remove/${symbol}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || "Failed to remove stock.");
        return;
      }
      fetchAll();
    } catch {
      alert("Network error removing stock.");
    } finally {
      setRemoveLoading(null);
    }
  }

  // ── Stat computations ─────────────────────────────────────────────────────
  const totalValue = cards.reduce(
    (acc, c) => acc + (c.current_price ?? 0),
    0
  );
  const avgChange =
    cards.length > 0
      ? cards.reduce((acc, c) => acc + (c.daily_change_percent ?? 0), 0) /
      cards.length
      : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7f9" }}>
      <Navbar />

      <div className="page-content">
        {/* ── Page header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827" }}>
            My Watchlist
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Track your favourite NSE stocks in real time.
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {[
            {
              label: "Portfolio Value",
              value:
                cards.length === 0
                  ? "—"
                  : `₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
              sub: "Sum of current prices",
              icon: "💰",
            },
            {
              label: "Avg. Daily Change",
              value:
                avgChange == null
                  ? "—"
                  : `${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%`,
              sub: "Across all watchlist stocks",
              icon: avgChange != null && avgChange >= 0 ? "📈" : "📉",
              color:
                avgChange == null
                  ? "#111827"
                  : avgChange >= 0
                    ? "#3B6D11"
                    : "#A32D2D",
            },
            {
              label: "Market Status",
              value: marketStatus.label,
              sub: "NSE India (IST)",
              icon: marketStatus.open ? "🟢" : "🔴",
              color: marketStatus.open ? "#3B6D11" : "#A32D2D",
            },
          ].map((s) => (
            <div key={s.label} className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{s.icon}</span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {s.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: s.color ?? "#111827",
                  marginBottom: "0.2rem",
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Add stock bar ── */}
        <div className="card" style={{ marginBottom: "1.75rem", padding: "1.25rem" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Add Stock to Watchlist
          </p>
          {addError && <div className="alert-error">{addError}</div>}
          {addSuccess && <div className="alert-success">{addSuccess}</div>}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <input
              id="add-stock-input"
              type="text"
              className="input"
              placeholder="e.g. RELIANCE, TCS, INFY"
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ flex: 1, minWidth: "180px", maxWidth: "340px" }}
            />
            <button
              id="add-stock-btn"
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={addLoading || !addSymbol.trim()}
            >
              {addLoading ? "Adding…" : "+ Add"}
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
                  <div className="skeleton" style={{ width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: "14px", width: "60%", marginBottom: "6px" }} />
                    <div className="skeleton" style={{ height: "11px", width: "40%" }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: "28px", width: "70%", marginBottom: "8px" }} />
                <div className="skeleton" style={{ height: "32px", width: "100%" }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {!loading && fetchError && (
          <div className="alert-error">{fetchError}</div>
        )}

        {/* ── Empty state ── */}
        {!loading && !fetchError && cards.length === 0 && (
          <div
            className="card"
            style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Your watchlist is empty
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              Add an NSE ticker above to get started.
            </p>
          </div>
        )}

        {/* ── Stock cards grid ── */}
        {!loading && !fetchError && cards.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {cards.map((c) => {
              const bare = c.symbol.replace(".NS", "");
              const positive =
                c.daily_change_percent == null || c.daily_change_percent >= 0;
              const domain = getDomain(c.symbol);
              const logoUrl = `https://logo.clearbit.com/${domain}.com`;

              return (
                <div key={c.symbol} className="card" style={{ padding: "1.25rem" }}>
                  {/* Card header — logo + symbol + remove */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {imgErrors[c.symbol] ? (
                        <InitialsAvatar symbol={c.symbol} />
                      ) : (
                        <img
                          src={logoUrl}
                          alt={bare}
                          width={44}
                          height={44}
                          style={{ borderRadius: "50%", objectFit: "contain", border: "1px solid #e5e7eb", padding: "2px", background: "#fff", flexShrink: 0 }}
                          onError={() =>
                            setImgErrors((prev) => ({ ...prev, [c.symbol]: true }))
                          }
                        />
                      )}
                      <div>
                        <Link
                          href={`/stock/${bare}`}
                          style={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: "#111827",
                            textDecoration: "none",
                          }}
                        >
                          {bare}
                        </Link>
                        <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
                          NSE India
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemove(bare)}
                      disabled={removeLoading === c.symbol}
                      id={`remove-${bare}`}
                    >
                      {removeLoading === c.symbol ? "…" : "Remove"}
                    </button>
                  </div>

                  {/* Price + change */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 800,
                          color: "#111827",
                          lineHeight: 1.1,
                        }}
                      >
                        {c.current_price != null
                          ? `₹${c.current_price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                          : "—"}
                      </div>
                      {c.daily_change_percent != null && (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: positive ? "#3B6D11" : "#A32D2D",
                            marginTop: "0.2rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.2rem",
                          }}
                        >
                          {positive ? "▲" : "▼"}{" "}
                          {positive ? "+" : ""}
                          {c.daily_change_percent.toFixed(2)}%
                        </div>
                      )}
                    </div>
                    <Sparkline data={c.sparkline} positive={positive} />
                  </div>

                  {/* View detail link */}
                  <Link
                    href={`/stock/${bare}`}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "0.5rem",
                      background: "#f6f7f9",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#374151",
                      textDecoration: "none",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    View Details →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
