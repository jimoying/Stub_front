import { App } from "antd";
import { Laptop, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { authApi } from "@/services/api";
import { ApiError } from "@/services/api/client";
import type { Session } from "@/services/api/types";
import { useAuthStore } from "@/stores/auth-store";

export default function AccountPage() {
  const { message, modal } = App.useApp();
  const { user, isAdmin, permissionItems, businesses } = useAuthStore();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.listSessions(1, 50);
      setSessions(res.items);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "加载登录会话失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = (s: Session) => {
    modal.confirm({
      title: `注销设备会话「${s.deviceName || s.clientAppId}」？`,
      content: s.isCurrent
        ? "这是你当前正在使用的会话，注销后需要重新登录。"
        : "注销后该设备会话将立即失效。",
      okText: "确认注销",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await authApi.revokeSession(s.sessionId);
          message.success("已注销会话");
          fetchSessions();
        } catch (err) {
          message.error(err instanceof ApiError ? err.message : "注销会话失败");
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-cn-display text-[28px] font-black tracking-tight">账号、权限与多端会话</h1>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          同端单活 (shortlink_web / shortlink_app / canvas_app)、跨端并存 · 7 天固定有效期 · 5 分钟心跳保活
        </p>
      </div>

      {/* 基本资料 + 已授权业务 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-[var(--line-2)] bg-[var(--paper-3)] p-5">
          <div className="mb-3 font-mono text-[11px] tracking-widest text-[var(--ink-3)]">
            ACCOUNT PROFILE · 账户基本信息
          </div>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2.5 text-xs">
            <dt className="text-[var(--ink-3)]">用户 ID</dt>
            <dd className="font-mono font-semibold">{user?.userId}</dd>
            <dt className="text-[var(--ink-3)]">登录邮箱</dt>
            <dd className="font-mono">{user?.email}</dd>
            <dt className="text-[var(--ink-3)]">系统角色</dt>
            <dd>
              <span className={`stub-badge ${isAdmin ? "signal" : "neutral"}`}>
                {user?.role} {isAdmin ? "· 系统管理员" : "· 普通用户"}
              </span>
            </dd>
            <dt className="text-[var(--ink-3)]">默认工作空间</dt>
            <dd className="font-mono">{user?.defaultWorkspaceId}</dd>
            <dt className="text-[var(--ink-3)]">邀请人 UserId</dt>
            <dd className="font-mono">{user?.invitedByUserId || "无（公开注册或初始管理员）"}</dd>
            <dt className="text-[var(--ink-3)]">邮箱验证时间</dt>
            <dd className="font-mono">{formatDateTime(user?.emailVerifiedAt)}</dd>
          </dl>
        </div>

        <div className="rounded-md border border-[var(--line-2)] bg-[var(--paper-3)] p-5">
          <div className="mb-3 font-mono text-[11px] tracking-widest text-[var(--ink-3)]">
            AUTHORIZED BUSINESS BUCKETS · 已授权业务桶 (/me/businesses)
          </div>
          {businesses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {businesses.map((b) => (
                <div
                  key={b.businessId}
                  className="rounded border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2 text-xs"
                >
                  <div className="font-semibold">{b.displayName}</div>
                  <div className="font-mono text-[11px] text-[var(--ink-3)]">
                    bucket / businessId: {b.businessId}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[var(--ink-3)]">
              当前账户尚未被授权任何 MinIO 业务桶（需管理员在「用户管理」中授权业务访问）
            </div>
          )}
        </div>
      </div>

      {/* 权限清单 */}
      <div className="rounded-md border border-[var(--line-2)] bg-[var(--paper-3)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[11px] tracking-widest text-[var(--ink-3)]">
            PERMISSIONS · 当前生效权限开关 (/me/permissions)
          </div>
          {isAdmin && (
            <span className="stub-badge ok">
              <ShieldCheck size={12} />
              管理员固定拥有全部权限
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {permissionItems.map((p) => (
            <div
              key={p.code}
              className={`rounded border p-3 text-xs ${
                p.enabled
                  ? "border-[var(--ink)] bg-[var(--paper-3)]"
                  : "border-[var(--line)] bg-[var(--paper-2)] opacity-60"
              }`}
            >
              <div className="font-mono font-bold">{p.code}</div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={p.enabled ? "text-[var(--ok)] font-semibold" : "text-[var(--ink-3)]"}>
                  {p.enabled ? "已开启" : "未开启"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 会话列表 */}
      <div className="overflow-hidden rounded-md border border-[var(--line-2)] bg-[var(--paper-3)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <div>
            <h3 className="text-[15px] font-bold">登录设备与会话列表 (/me/sessions)</h3>
            <p className="text-xs text-[var(--ink-3)]">
              最近心跳时间在 15 分钟内且未过期、未注销视为在线 (online=true)
            </p>
          </div>
          <button type="button" onClick={fetchSessions} className="stub-btn ghost !h-8 !text-xs">
            <RefreshCw size={13} />
            刷新会话
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--paper-2)] text-left font-mono text-[11px] text-[var(--ink-3)]">
                <th className="px-4 py-2.5">客户端应用 / 设备</th>
                <th className="px-4 py-2.5">在线状态</th>
                <th className="px-4 py-2.5">最近活跃 (lastSeenAt)</th>
                <th className="px-4 py-2.5">固定过期时间 (7d)</th>
                <th className="px-4 py-2.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-2)]">
              {sessions.map((s) => (
                <tr key={s.sessionId} className="hover:bg-[#fffdf8]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Laptop size={14} />
                      <span>{s.deviceName || s.platform || "未知设备"}</span>
                      {s.isCurrent && <span className="stub-badge signal">当前会话</span>}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--ink-3)]">
                      {s.clientAppId} · {s.sessionId}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.revokedAt ? (
                      <span className="stub-badge bad">已注销</span>
                    ) : s.online ? (
                      <span className="stub-badge ok">在线 (online)</span>
                    ) : (
                      <span className="stub-badge neutral">离线</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{formatDateTime(s.lastSeenAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatDateTime(s.expiresAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {!s.revokedAt && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(s)}
                        className="stub-btn ghost !h-7 !px-2.5 !text-xs text-[var(--danger)]"
                      >
                        <LogOut size={12} />
                        注销会话
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-[var(--ink-3)]">
                    暂无会话记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
