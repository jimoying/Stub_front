import { App, Modal, Pagination } from "antd";
import { Plus, Power, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { adminApi } from "@/services/api";
import { ApiError } from "@/services/api/client";
import type { BusinessDTO } from "@/services/api/types";

export default function AdminBusinessesPage() {
  const { message } = App.useApp();

  const [items, setItems] = useState<BusinessDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // 新建业务登记弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listBusinesses({
        status: statusFilter || undefined,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.pagination.total);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "加载业务列表失败");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, pageSize, message]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleCreate = async () => {
    const id = businessId.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(id)) {
      message.warning("businessId 需匹配 ^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$（满足 S3/MinIO 桶命名规范）");
      return;
    }
    if (!displayName.trim()) {
      message.warning("请输入业务显示名称");
      return;
    }
    setCreating(true);
    try {
      await adminApi.createBusiness({
        businessId: id,
        displayName: displayName.trim(),
        bucketName: id,
      });
      message.success(`已登记业务并绑定桶 ${id}`);
      setCreateOpen(false);
      setBusinessId("");
      setDisplayName("");
      fetchList();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "登记业务失败");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (item: BusinessDTO) => {
    const nextStatus = item.status === "active" ? "disabled" : "active";
    try {
      await adminApi.updateBusiness(item.businessId, { status: nextStatus });
      message.success(`业务 ${item.businessId} 已切换为 ${nextStatus}`);
      fetchList();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "更新状态失败");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-cn-display text-[28px] font-black tracking-tight">
            管理员 · MinIO 业务即桶登记
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            方案第一阶段采用「业务即桶」：每个已登记业务对应一个同名 MinIO 桶 (bucketName = businessId)
          </p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="stub-btn signal">
          <Plus size={15} />
          登记新业务桶
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="inline-flex gap-1 rounded border border-[var(--line-2)] bg-[var(--paper-3)] p-1">
          {[
            ["", "全部"],
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
                <th className="px-4 py-2.5">业务标识 (businessId)</th>
                <th className="px-4 py-2.5">显示名称 (displayName)</th>
                <th className="px-4 py-2.5">MinIO 桶名 (bucketName)</th>
                <th className="px-4 py-2.5">状态</th>
                <th className="px-4 py-2.5">创建时间</th>
                <th className="px-4 py-2.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-2)]">
              {items.map((b) => (
                <tr key={b.businessId} className="hover:bg-[#fffdf8]">
                  <td className="px-4 py-3 font-mono font-bold">{b.businessId}</td>
                  <td className="px-4 py-3 font-medium">{b.displayName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.bucketName}</td>
                  <td className="px-4 py-3">
                    <span className={`stub-badge ${b.status === "active" ? "ok" : "neutral"}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{formatDateTime(b.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(b)}
                      className="stub-btn ghost !h-7 !px-2.5 !text-xs"
                    >
                      <Power size={12} />
                      {b.status === "active" ? "停用" : "启用"}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--ink-3)]">
                    尚未登记任何业务桶
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

      <Modal
        title="登记新业务桶 (bucketName = businessId)"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="确认登记"
        cancelText="取消"
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--ink-2)]">
              业务标识与桶名 (businessId = bucketName)
            </label>
            <input
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="例如 canvas-prod 或 marketing-assets"
              className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 font-mono text-sm outline-none"
            />
            <span className="font-mono text-[11px] text-[var(--ink-3)]">
              3–63 位小写字母、数字与连字符 -，且必须以字母或数字开头结尾
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--ink-2)]">业务显示名称 (displayName)</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如：无限画布生产素材桶"
              className="h-10 rounded border border-[var(--line-2)] bg-[var(--paper-3)] px-3 text-sm outline-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
