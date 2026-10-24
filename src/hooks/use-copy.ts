import { App } from "antd";
import copy from "copy-to-clipboard";
import { useCallback } from "react";

export function useCopy() {
  const { message } = App.useApp();

  return useCallback(
    (text: string, label = "已复制到剪贴板") => {
      if (!text) return;
      copy(text);
      message.success(label);
    },
    [message],
  );
}
