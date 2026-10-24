import { App, Drawer, Modal, Pagination } from "antd";
import { Eye, Plus, Power, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { templatesApi } from "@/services/api";
import { ApiError } from "@/services/api/client";
import type {
  LinkRulesInput,
  TemplateDTO,
  TemplateListItem,
  TemplateVersionDTO,
  TemplateVersionListItem,
} from "@/services/api/types";
import { useAuthStore } from "@/stores/auth-store";

export default function TemplatesPage() {
  const { message, modal } = App.useApp();
  const { user, isAdmin, hasPermission } = useAuthStore();

  const [items, setItems] = useState<TemplateListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [includeDeleted, setIncludeDeleted] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");

  // 新建模板弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxVisits, setMaxVisits] = useState("-1");
  const [cidrsText, setCidrsText] = useState("");
  const [requirePassword, setRequirePassword] = useState(false);
  const [strategy, setStrategy] = useState<"fixed_cooldown" | "progressive_cooldown">("fixed_cooldown");
  const [creating, setCreating] = useState(false);

  // 详情与版本抽屉
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTpl, setActiveTpl] = useState<TemplateDTO | null>(null);
  const [versionList, setVersionList] = useState<TemplateVersionListItem[]>([]);
  const [inspectedVersion, setInspectedVersion] = useState<TemplateVersionDTO | null>(null);

  // 发布新版本弹窗
  const [newVerOpen, setNewVerOpen] = useState(false);
  const [verChangeNote, setVerChangeNote] = useState("");
  const [verMaxVisits, setVerMaxVisits] = useState("-1");
  const [verCidrs, setVerCidrs] = useState("");
  const [verRequirePwd, setVerRequirePwd] = useState(false);
  const [verStrategy, setVerStrategy] = useState<"fixed_cooldown" | "progressive_cooldown">("fixed_cooldown");
  const [verSubmitting, setVerSubmitting] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await templatesApi.list({
        workspaceId: user?.defaultWorkspaceId,
        status: statusFilter || undefined,
        includeDeleted,
        keyword: keyword.trim() || undefined,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.pagination.total);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "加载规则模板失败");
    } finally {
      setLoading(false);
    }
  }, [user?.defaultWorkspaceId, statusFilter, includeDeleted, keyword, page, pageSize, message]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = async (templateId: string) => {
    try {
      const [detail, vers] = await Promise.all([
        templatesApi.get(templateId),
        templatesApi.listVersions(templateId),
      ]);
      setActiveTpl(detail);
      setVersionList(vers.versions);
      setInspectedVersion({
        version: detail.latestVersion,
        rules: detail.latestRules,
        createdAt: detail.updatedAt,
      });
      setDetailOpen(true);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "加载模板详情失败");
    }
  };

  const inspectSingleVersion = async (templateId: string, version: number) => {
    try {
      const v = await templatesApi.getVersion(templateId, version);
      setInspectedVersion(v);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "读取版本快照失败");
    }
  };

  const buildRulesInput = (
    mv: string,
    cidrs: string,
    reqPwd: boolean,
    strat: "fixed_cooldown" | "progressive_cooldown",
  ): LinkRulesInput => ({
    maxVisits: mv.trim() === "" ? -1 : Number(mv),
    allowedIpCidrs: cidrs
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean),
    requirePassword: reqPwd,
    wrongPasswordPolicy: reqPwd ? { strategy: strat } : undefined,
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      message.warning("请输入模板名称（同一工作空间内唯一）");
      return;
    }
    if (!user?.defaultWorkspaceId) {
      message.error("未获取到当前工作空间 ID");
      return;
    }
    setCreating(true);
    try {
      await templatesApi.create({
        workspaceId: user.defaultWorkspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        rules: buildRulesInput(maxVisits, cidrsText, requirePassword, strategy),
      });
      message.success("已创建规则模板（初始版本 v1）");
      setCreateOpen(false);
      setName("");
      setDescription("");
      fetchList();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "创建规则模板失败");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!activeTpl) return;
    setVerSubmitting(true);
    try {
      const created = await templatesApi.createVersion(activeTpl.templateId, {
        changeNote: verChangeNote.trim() || undefined,
        rules: buildRulesInput(verMaxVisits, verCidrs, verRequirePwd, verStrategy),
      });
      message.success(`已发布新版本 v${created.version}（已创建短链不受影响）`);
      setNewVerOpen(false);
      setVerChangeNote("");
      openDetail(activeTpl.templateId);
      fetchList();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "生成模板新版本失败");
    } finally {
      setVerSubmitting(false);
    }
  };

  const handleToggleStatus = async (tpl: TemplateListItem | TemplateDTO) => {
    try {
      if (tpl.status === "active") {
        await templatesApi.disable(tpl.templateId);
        message.success("模板已停用（不可用于新短链，已建短链不受影响）");
      } else {
        await templatesApi.enable(tpl.templateId);
        message.success("模板已启用");
      }
      fetchList();
      if (activeTpl?.templateId === tpl.templateId) openDetail(tpl.templateId);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "状态变更失败");
    }
  };

  const handleRemove = (tpl: TemplateListItem | TemplateDTO) => {
    modal.confirm({
      title: `软删除规则模板「${tpl.name}」？`,
      content: "软删除后不可用于新短链，历史版本审计引用继续保留，不影响已创建的短链。",
      okText: "确认删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await templatesApi.remove(tpl.templateId);
          message.success("模板已软删除");
          setDetailOpen(false);
          fetchList();
        } catch (err) {
          message.error(err instanceof ApiError ? err.message : "删除失败");
        }
      },
    });
  };

  const handleRestore = async (templateId: string) => {
    try {
      await templatesApi.restore(templateId);
      message.success("规则模板已恢复");
      fetchList();
      if (activeTpl?.templateId === templateId) openDetail(templateId);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "恢复失败");
    }
  };

  const canManage = isAdmin || hasPermission("templates.manage");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-cn-display text-[28px] font-black tracking-tight">规则模板</h1>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            每次修改规则自动生成新版本 v1, v2… · 模板仅保存是否要求口令及冷却策略，不保存口令明文或有效期
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setCreateOpen(true)} className="stub-btn signal">
            <Plus size={15} />
            新建规则模板
          </button>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex gap-1 rounded border border-[var(--line-2)] bg-[var(--paper-3)] p-1">
          {[
            ["", "全部状态"],
            ["active", "启用中 (active)"],
            ["disabled", "已停用 (disabled)"],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setStatusFilter(k);
                setPage(1);
              }}
              className={`cursor-pointer rounded px-3 py-1 text-xs ${
                statusFilter === k ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--ink-2)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-1.5 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 py-1.5 text-xs">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => {
              setIncludeDeleted(e.target.checked);
              setPage(1);
            }}
            className="accent-[var(--ink)]"
          />
          <span>包含已软删除模板</span>
        </label>

        <input
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          placeholder="按模板名称搜索 keyword"
          className="h-9 w-52 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 text-xs outline-none focus:border-[var(--ink)]"
        />

        <button type="button" onClick={fetchList} className="stub-btn ghost !h-9 ml-auto">
          <RefreshCw size={13} />
          刷新
        </button>
      </div>

      {/* 列表 */}
      <div className="overflow-hidden rounded-md border border-[var(--line-2)] bg-[var(--paper-3)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--paper-2)] text-left font-mono text-[11px] text-[var(--ink-3)]">
                <th className="px-4 py-2.5">模板名称 / TemplateId</th>
                <th className="px-4 py-2.5">状态</th>
                <th className="px-4 py-2.5">当前最新版本</th>
                <th className="px-4 py-2.5">已引用短链数</th>
                <th className="px-4 py-2.5">更新时间</th>
                <th className="px-4 py-2.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-2)]">
              {items.map((item) => (
                <tr key={item.templateId} className="hover:bg-[#fffdf8]">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{item.name}</div>
                    <div className="font-mono text-[11px] text-[var(--ink-3)]">{item.templateId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`stub-badge ${item.status === "active" ? "ok" : "neutral"}`}>
                      {item.status === "active" ? "active · 启用" : "disabled · 停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">v{item.latestVersion}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.referencedLinkCount} 条</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatDateTime(item.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDetail(item.templateId)}
                        className="stub-btn ghost !h-7 !px-2.5 !text-xs"
                      >
                        <Eye size={12} />
                        版本与规则
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className="stub-btn ghost !h-7 !px-2.5 !text-xs"
                          >
                            {item.status === "active" ? "停用" : "启用"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="stub-btn ghost !h-7 !px-2.5 !text-xs text-[var(--danger)]"
                          >
                            <Trash2 size={12} />
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--ink-3)]">
                    暂无规则模板
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

      {/* 新建模板弹窗 */}
      <Modal
        title="新建规则模板 (初始 v1)"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="创建模板"
        cancelText="取消"
        width={520}
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--ink-2)]">模板名称（工作空间内唯一）</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：内部合作伙伴交付"
              className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 text-sm outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--ink-2)]">描述说明（选填）</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="限 50 次 + 启用口令 + 固定冷却"
              className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--ink-2)]">最大访问次数 (-1 不限)</label>
              <input
                type="number"
                value={maxVisits}
                onChange={(e) => setMaxVisits(e.target.value)}
                className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 font-mono text-sm outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--ink-2)]">允许 IP CIDR（逗号分隔）</label>
              <input
                value={cidrsText}
                onChange={(e) => setCidrsText(e.target.value)}
                placeholder="10.0.0.0/8, 203.0.113.0/24"
                className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 font-mono text-xs outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--paper-3)] p-3">
            <div>
              <b className="text-sm">要求访问口令 (requirePassword)</b>
              <p className="text-xs text-[var(--ink-3)]">具体口令在创建短链时按条填写</p>
            </div>
            <input
              type="checkbox"
              checked={requirePassword}
              onChange={(e) => setRequirePassword(e.target.checked)}
              className="h-4 w-4 accent-[var(--signal)]"
            />
          </div>
          {requirePassword && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStrategy("fixed_cooldown")}
                className={`cursor-pointer rounded border p-2.5 text-left ${
                  strategy === "fixed_cooldown"
                    ? "border-[var(--ink)] bg-[var(--paper-3)] shadow-[inset_0_0_0_1px_var(--ink)]"
                    : "border-[var(--line-2)]"
                }`}
              >
                <b className="block text-xs">固定冷却 (fixed_cooldown)</b>
                <small className="text-[11px] text-[var(--ink-3)]">连错 5 次冷却 15 分钟</small>
              </button>
              <button
                type="button"
                onClick={() => setStrategy("progressive_cooldown")}
                className={`cursor-pointer rounded border p-2.5 text-left ${
                  strategy === "progressive_cooldown"
                    ? "border-[var(--ink)] bg-[var(--paper-3)] shadow-[inset_0_0_0_1px_var(--ink)]"
                    : "border-[var(--line-2)]"
                }`}
              >
                <b className="block text-xs">逐步冷却 (progressive_cooldown)</b>
                <small className="text-[11px] text-[var(--ink-3)]">15m → 1h → 6h → 24h</small>
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* 模板详情与版本历史抽屉 */}
      <Drawer
        title={<span className="font-cn-display text-lg font-black">模板详情与不可变版本历史</span>}
        width={560}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        {activeTpl && (
          <div className="flex flex-col gap-5">
            <div className="rounded-md border border-[var(--line-2)] bg-[var(--paper-3)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">{activeTpl.name}</h3>
                  <p className="text-xs text-[var(--ink-2)]">{activeTpl.description || "无描述"}</p>
                </div>
                <span className={`stub-badge ${activeTpl.status === "active" ? "ok" : "neutral"}`}>
                  {activeTpl.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs text-[var(--ink-3)]">
                <span>ID: {activeTpl.templateId}</span>
                <span>· 最新版本: v{activeTpl.latestVersion}</span>
                <span>· 已引用短链: {activeTpl.referencedLinkCount}</span>
              </div>
              {canManage && (
                <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
                  {!activeTpl.deletedAt && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerMaxVisits(String(activeTpl.latestRules.maxVisits));
                        setVerCidrs((activeTpl.latestRules.allowedIpCidrs || []).join(", "));
                        setVerRequirePwd(activeTpl.latestRules.requirePassword);
                        setVerStrategy(
                          activeTpl.latestRules.wrongPasswordPolicy?.strategy || "fixed_cooldown",
                        );
                        setNewVerOpen(true);
                      }}
                      className="stub-btn signal !h-8 !text-xs"
                    >
                      <Plus size={13} />
                      生成新版本 (v{activeTpl.latestVersion + 1})
                    </button>
                  )}
                  {activeTpl.deletedAt ? (
                    <button
                      type="button"
                      onClick={() => handleRestore(activeTpl.templateId)}
                      className="stub-btn ghost !h-8 !text-xs"
                    >
                      <RotateCcw size={13} />
                      恢复模板
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(activeTpl)}
                      className="stub-btn ghost !h-8 !text-xs"
                    >
                      <Power size={13} />
                      {activeTpl.status === "active" ? "停用" : "启用"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {inspectedVersion && (
              <div className="rounded-md border border-[var(--ink)] bg-[var(--paper-3)] p-4">
                <div className="mb-2 font-mono text-xs font-bold">
                  版本快照 v{inspectedVersion.version}{" "}
                  {inspectedVersion.changeNote ? `· ${inspectedVersion.changeNote}` : ""}
                </div>
                <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-xs">
                  <dt className="text-[var(--ink-3)]">最大访问次数</dt>
                  <dd className="font-mono">
                    {inspectedVersion.rules.maxVisits === -1
                      ? "不限制 (-1)"
                      : inspectedVersion.rules.maxVisits}
                  </dd>
                  <dt className="text-[var(--ink-3)]">允许 IP CIDR</dt>
                  <dd className="font-mono">
                    {inspectedVersion.rules.allowedIpCidrs?.length
                      ? inspectedVersion.rules.allowedIpCidrs.join(", ")
                      : "不限制 ([])"}
                  </dd>
                  <dt className="text-[var(--ink-3)]">是否要求口令</dt>
                  <dd className="font-mono">
                    {inspectedVersion.rules.requirePassword ? "true（要求口令）" : "false"}
                  </dd>
                  <dt className="text-[var(--ink-3)]">口令错误冷却策略</dt>
                  <dd className="font-mono">
                    {inspectedVersion.rules.requirePassword
                      ? inspectedVersion.rules.wrongPasswordPolicy?.strategy || "fixed_cooldown"
                      : "—"}
                  </dd>
                </dl>
              </div>
            )}

            <div className="rounded-md border border-[var(--line-2)] bg-[var(--paper-3)]">
              <div className="border-b border-[var(--line)] px-4 py-2.5 font-mono text-[11px] text-[var(--ink-3)]">
                VERSIONS · 点击任意版本查看当时快照
              </div>
              <div className="divide-y divide-[var(--line-2)]">
                {versionList.map((v) => (
                  <button
                    key={v.version}
                    type="button"
                    onClick={() => inspectSingleVersion(activeTpl.templateId, v.version)}
                    className={`flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-[#fffdf8] ${
                      inspectedVersion?.version === v.version ? "bg-[var(--paper-2)] font-semibold" : ""
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold">v{v.version}</span>
                      <span className="ml-2 text-[var(--ink-2)]">{v.changeNote || "初始规则"}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--ink-3)]">
                      {formatDateTime(v.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 生成新版本弹窗 */}
      <Modal
        title={`发布新规则版本 (v${(activeTpl?.latestVersion || 1) + 1})`}
        open={newVerOpen}
        onCancel={() => setNewVerOpen(false)}
        onOk={handleCreateVersion}
        confirmLoading={verSubmitting}
        okText="生成新版本"
        cancelText="取消"
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--ink-2)]">版本变更说明 (changeNote)</label>
            <input
              value={verChangeNote}
              onChange={(e) => setVerChangeNote(e.target.value)}
              placeholder="例如：切换为逐步冷却策略并收紧办公网 CIDR"
              className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--ink-2)]">最大访问次数 (-1 不限)</label>
              <input
                type="number"
                value={verMaxVisits}
                onChange={(e) => setVerMaxVisits(e.target.value)}
                className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 font-mono text-sm outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--ink-2)]">允许 IP CIDR</label>
              <input
                value={verCidrs}
                onChange={(e) => setVerCidrs(e.target.value)}
                placeholder="10.0.0.0/8"
                className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 font-mono text-xs outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--paper-3)] p-3">
            <span className="text-xs font-semibold">要求访问口令 (requirePassword)</span>
            <input
              type="checkbox"
              checked={verRequirePwd}
              onChange={(e) => setVerRequirePwd(e.target.checked)}
              className="h-4 w-4 accent-[var(--signal)]"
            />
          </div>
          {verRequirePwd && (
            <select
              value={verStrategy}
              onChange={(e) =>
                setVerStrategy(e.target.value as "fixed_cooldown" | "progressive_cooldown")
              }
              className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 font-mono text-xs outline-none"
            >
              <option value="fixed_cooldown">fixed_cooldown（固定 15 分钟冷却）</option>
              <option value="progressive_cooldown">progressive_cooldown（15m → 1h → 6h → 24h）</option>
            </select>
          )}
        </div>
      </Modal>
    </div>
  );
}
