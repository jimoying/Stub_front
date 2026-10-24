import { App } from "antd";
import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { adminApi } from "@/services/api";
import { ApiError } from "@/services/api/client";
import type { RegistrationSettings } from "@/services/api/types";

export default function AdminSettingsPage() {
  const { message } = App.useApp();
  const [settings, setSettings] = useState<RegistrationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await adminApi.getRegistrationSettings();
      setSettings(res);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "读取注册设置失败");
    }
  }, [message]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = async (field: "allowPublicRegistration" | "allowInviteRegistration") => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await adminApi.updateRegistrationSettings({
        [field]: !settings[field],
      });
      setSettings(next);
      message.success("全局注册开关已更新");
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "更新失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-cn-display text-[28px] font-black tracking-tight">管理员 · 全局注册模式开关</h1>
        <p className="mt-1 text-[13px] text-[var(--ink-2)]">
          控制平台是否允许公开自助注册或持单次邀请码注册 · 两种注册方式均强制要求邮箱验证码校验
        </p>
      </div>

      {settings && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-md border border-[var(--line-2)] bg-[var(--paper-3)] p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--ink-3)]">ALLOW_PUBLIC_REGISTRATION</span>
                <span
                  className={`stub-badge ${settings.allowPublicRegistration ? "ok" : "neutral"}`}
                >
                  {settings.allowPublicRegistration ? "已开启" : "已关闭（默认）"}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold">允许公开注册 (allowPublicRegistration)</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">
                开启后，新用户无需提供邀请码，仅通过邮箱验证码即可自助注册普通账号；关闭时公开注册接口返回{" "}
                <code className="font-mono">403 registration_disabled</code>。
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4">
              <span className="font-mono text-[11px] text-[var(--ink-3)]">
                更新于 {formatDateTime(settings.updatedAt)}
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleToggle("allowPublicRegistration")}
                className={`stub-btn !h-8 !text-xs ${
                  settings.allowPublicRegistration ? "ghost" : "signal"
                }`}
              >
                {settings.allowPublicRegistration ? "关闭公开注册" : "开启公开注册"}
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-md border border-[var(--line-2)] bg-[var(--paper-3)] p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--ink-3)]">ALLOW_INVITE_REGISTRATION</span>
                <span
                  className={`stub-badge ${settings.allowInviteRegistration ? "ok" : "neutral"}`}
                >
                  {settings.allowInviteRegistration ? "已开启（默认）" : "已关闭"}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold">允许邀请码注册 (allowInviteRegistration)</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--ink-2)]">
                开启后，持有有效单次邀请码的用户可通过邮箱验证码完成注册；若与公开注册同时关闭，平台将暂停一切新用户注册。
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4">
              <span className="font-mono text-[11px] text-[var(--ink-3)]">
                更新于 {formatDateTime(settings.updatedAt)}
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleToggle("allowInviteRegistration")}
                className={`stub-btn !h-8 !text-xs ${
                  settings.allowInviteRegistration ? "ghost" : "signal"
                }`}
              >
                {settings.allowInviteRegistration ? "关闭邀请码注册" : "开启邀请码注册"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
