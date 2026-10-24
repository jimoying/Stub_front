import { App, Pagination } from "antd";
import dayjs from "dayjs";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { adminApi } from "@/services/api";
import { ApiError } from "@/services/api/client";
import type { UnknownShortCodeEvent } from "@/services/api/types";

export default function AdminSecurityPage() {
  const { message } = App.useApp();

  const [items, setItems] = useState<UnknownShortCodeEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sourceIp, setSourceIp] = useState("");
  const [rateLimited, setRateLimited] = useState<string>("");
  const [timePreset, setTimePreset] = useState<"30d" | "7d" | "24h">("30d");
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const to = dayjs().toISOString();
    const range =
      timePreset === "24h"
        ? { from: dayjs().subtract(24, "hour").toISOString(), to }
        : timePreset === "7d"
          ? { from: dayjs().subtract(7, "day").toISOString(), to }
          : {};

    try {
      const res = await adminApi.listUnknownShortCodes({
        sourceIp: sourceIp.trim() || undefined,
        rateLimited: rateLimited === "" ? undefined : rateLimited === "true",
        ...range,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.pagination.total);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "读取未知短码安全事件失败");
    } finally {
      setLoading(false);
    }
  }, [sourceIp, rateLimited, timePreset, page, pageSize, message]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-cn-display text-[28px] font-black tracking-tight">
          管理员 · 未知短码与探测安全事件
        </h1>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          记录不存在或尚处于 7 天冷却期的短码访问请求 · 按 (sourceIp, codeFingerprint, 5m窗口) 聚合防刷写放大 ·
          仅保存 HMAC-SHA256 指纹
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex gap-1 rounded border border-[var(--line-2)] bg-[var(--paper-3)] p-1">
          {(
            [
              ["30d", "近 30 天"],
              ["7d", "近 7 天"],
              ["24h", "近 24 小时"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setTimePreset(k);
                setPage(1);
              }}
              className={`cursor-pointer rounded px-3 py-1 text-xs ${
                timePreset === k ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink-2)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={sourceIp}
          onChange={(e) => {
            setSourceIp(e.target.value);
            setPage(1);
          }}
          placeholder="按来源 IP 筛选 (sourceIp)"
          className="h-9 w-48 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 font-mono text-xs outline-none"
        />

        <select
          value={rateLimited}
          onChange={(e) => {
            setRateLimited(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-2.5 font-mono text-xs outline-none"
        >
          <option value="">rateLimited：全部</option>
          <option value="true">true（已触发限流）</option>
          <option value="false">false（未触发限流）</option>
        </select>

        <button type="button" onClick={fetchList} className="stub-btn ghost !h-9 ml-auto">
          <RefreshCw size={13} />
          刷新
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--line-2)] bg-[var(--paper-3)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--paper-2)] text-left font-mono text-[11px] text-[var(--ink-3)]">
                <th className="px-4 py-2.5">5 分钟聚合窗口</th>
                <th className="px-4 py-2.5">来源 IP</th>
                <th className="px-4 py-2.5">短码 HMAC 指纹 (codeFingerprint)</th>
                <th className="px-4 py-2.5">探测次数 (eventCount)</th>
                <th className="px-4 py-2.5">限流状态</th>
                <th className="px-4 py-2.5">最近发生时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-2)]">
              {items.map((ev) => (
                <tr key={ev.eventId} className="hover:bg-[#fffdf8]">
                  <td className="px-4 py-3 font-mono text-xs">
                    <div>{formatDateTime(ev.windowStartedAt)}</div>
                    <div className="text-[11px] text-[var(--ink-3)]">#{ev.eventId}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{ev.sourceIp}</td>
                  <td className="px-4 py-3 font-mono text-xs" title={ev.codeFingerprint}>
                    {ev.codeFingerprint.slice(0, 20)}…
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{ev.eventCount}</td>
                  <td className="px-4 py-3">
                    {ev.rateLimited ? (
                      <span className="stub-badge bad">已触发限流</span>
                    ) : (
                      <span className="stub-badge neutral">正常记录</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDateTime(ev.lastOccurredAt, "YYYY-MM-DD HH:mm:ss")}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--ink-3)]">
                    当前时间窗口内无未知短码探测事件
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {total > pageSize && (
          <div className="flex justify-end border-t border-[var(--line)] px-4 py-3">
            <Pagination
              size="small"
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(p) => setPage(p)}
              showTotal={(t) => `共 ${t} 条`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
