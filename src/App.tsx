import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { RouterProvider } from "react-router-dom";
import { getAntThemeConfig } from "@/lib/app-theme";
import { router } from "@/router";

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={getAntThemeConfig()}>
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
}
