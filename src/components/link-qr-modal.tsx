import { Modal, QRCode } from "antd";
import { Copy, Download } from "lucide-react";
import { useRef } from "react";
import { useCopy } from "@/hooks/use-copy";

interface LinkQRModalProps {
  open: boolean;
  code: string;
  url: string;
  onClose: () => void;
}

export function LinkQRModal({ open, code, url, onClose }: LinkQRModalProps) {
  const copy = useCopy();
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const canvas = wrapRef.current?.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = `stub-${code}.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={380}
      title={<span className="font-cn-display text-lg font-black">短链二维码 · /r/{code}</span>}
    >
      <div className="flex flex-col items-center gap-4 pt-2">
        <div
          ref={wrapRef}
          className="flex flex-col items-center gap-2 rounded-md border border-[var(--ink)] bg-[#fbf9f4] p-5 text-[#17150f]"
        >
          <QRCode
            value={url || "https://s.example.com"}
            size={200}
            color="#17150f"
            bgColor="#fbf9f4"
            icon="/favicon.svg"
            iconSize={38}
            bordered={false}
          />
          <span className="font-mono text-xs font-semibold text-[#4a463c]">/r/{code}</span>
        </div>

        <div className="w-full truncate rounded border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2 text-center font-mono text-xs text-[var(--ink-2)]">
          {url}
        </div>

        <div className="grid w-full grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => copy(url, "已复制短链 URL")}
            className="stub-btn ghost !h-9 !text-xs"
          >
            <Copy size={14} />
            复制链接
          </button>
          <button type="button" onClick={handleDownload} className="stub-btn signal !h-9 !text-xs">
            <Download size={14} />
            下载 PNG
          </button>
        </div>
      </div>
    </Modal>
  );
}
