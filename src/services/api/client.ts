const DEFAULT_BASE = typeof window !== "undefined"
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : "http://127.0.0.1:8000";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE;

function buildUrl(path: string) {
  try {
    return new URL(path, BASE_URL).toString();
  } catch {
    const base = BASE_URL.replace(/\/+$/, "");
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  }
}

export const getBaseUrl = () => BASE_URL;

export async function apiFetch(path: string, init?: RequestInit) {
  const access = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (access) headers["Authorization"] = `Bearer ${access}`;
  const url = buildUrl(path);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
