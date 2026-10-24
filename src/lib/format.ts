import dayjs from "dayjs";

/**
 * 方案规定：文件大小和总存储额度使用十进制 MB（1 MB = 1,000,000 字节）计量
 */
export const DECIMAL_MB = 1_000_000;

export function formatMB(bytes?: number | null, digits = 1): string {
  if (bytes === undefined || bytes === null) return "—";
  const mb = bytes / DECIMAL_MB;
  if (mb > 0 && mb < 0.1) return `${mb.toFixed(3)} MB`;
  return `${mb.toFixed(digits)} MB`;
}

export function bytesToMB(bytes?: number | null): number {
  if (!bytes) return 0;
  return Math.round((bytes / DECIMAL_MB) * 100) / 100;
}

export function mbToBytes(mb: number): number {
  return Math.round(mb * DECIMAL_MB);
}

export function formatDateTime(iso?: string | null, pattern = "YYYY-MM-DD HH:mm"): string {
  if (!iso) return "—";
  const d = dayjs(iso);
  return d.isValid() ? d.format(pattern) : iso;
}

export function formatShortTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = dayjs(iso);
  return d.isValid() ? d.format("MM-DD HH:mm") : iso;
}

export function getPublicBaseURL(): string {
  const envUrl = import.meta.env.VITE_PUBLIC_BASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://s.example.com";
}
