export const API_BASE = "http://localhost:8000";

/** Get JWT token from localStorage (safe for SSR guard). */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

/** Get stored username from localStorage. */
export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("username");
}

/** Store auth data after successful login. */
export function storeAuth(token: string, username: string): void {
  localStorage.setItem("access_token", token);
  localStorage.setItem("username", username);
}

/** Clear auth data on logout. */
export function clearAuth(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("username");
}

/** Fetch wrapper that automatically injects the Authorization header. */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers });
}
