import type { APIErrorPayload } from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "") + "/api/v1";
const TOKEN_KEY = "stub_access_token";

export class ApiError extends Error {
  status: number;
  code: string;
  requestId?: string;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      sp.set(k, String(v));
    }
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function request<T = void>(
  path: string,
  options: RequestInit & { query?: Record<string, string | number | boolean | undefined | null> } = {},
): Promise<T> {
  const { query, headers: customHeaders, body, ...rest } = options;
  const url = `${API_BASE}${path}${buildQuery(query)}`;
  const token = getStoredToken();

  const headers = new Headers(customHeaders);
  headers.set("X-Client-App", "shortlink_web");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    body,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errPayload = data as APIErrorPayload | null;
    const code = errPayload?.error?.code || `http_${res.status}`;
    const msg = errPayload?.error?.message || `请求失败 (${res.status})`;
    const reqId = errPayload?.error?.requestId;

    if (res.status === 401 && token && !path.startsWith("/auth/login")) {
      setStoredToken(null);
      window.dispatchEvent(new CustomEvent("stub:unauthorized", { detail: msg }));
    }
    throw new ApiError(res.status, code, msg, reqId);
  }

  return data as T;
}
