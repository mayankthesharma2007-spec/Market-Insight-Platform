"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUsername, clearAuth } from "@/lib/api";

export default function Navbar() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(getUsername());
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <nav style={{ background: "#1a1a1a" }}>
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "60px",
        }}
      >
        {/* Brand */}
        <Link
          href="/dashboard"
          style={{
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>📈</span>
          Market Insight
        </Link>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {username && (
            <span
              style={{
                color: "#9ca3af",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#333333",
                  color: "#ffffff",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {username.charAt(0)}
              </span>
              <span style={{ color: "#e5e7eb" }}>{username}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1.5px solid #374151",
              color: "#d1d5db",
              padding: "0.4rem 0.875rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
              transition: "border-color 0.2s, color 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#6b7280";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#374151";
              e.currentTarget.style.color = "#d1d5db";
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
