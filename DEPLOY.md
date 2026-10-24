# Stub 前端安装与部署任务书 (AI 可执行)

> 本文档面向 AI 编程助手 (Codex / Claude Code / Cursor 等), 人工照做同样适用。
>
> **执行纪律**
> 1. 任何写操作 (改文件 / 删目录 / 装依赖 / 起容器) 前先向用户描述方法并等待批准。
> 2. 任何步骤失败时, 原样报告错误信息, 禁止静默降级 / 伪造成功 / 吞异常。
> 3. 每个阶段完成后按本文件的验收项自查, 未通过不得进入下一阶段。

## 0. 环境要求

| 项 | 要求 | 说明 |
| --- | --- | --- |
| Node.js | >= 22 (或 >= 20.19) | Vite 7 要求 |
| 包管理器 | npm | 仓库含 `package-lock.json`, 一律 `npm ci` / `npm run ...`, 不要引入其他包管理器 |
| Docker | 仅路径 B 需要 | 本地没有可跳过, 由 CI 的 docker build 步骤远程验证 |
| 后端 API | Stub 后端, 默认 `http://localhost:8588` | 前端所有业务数据来源 |

## 1. 路径 A · 本地安装运行

```bash
npm ci                      # 按 lock 精确安装
cp .env.example .env        # 可选; 默认值即可跑通本地开发
npm run dev                 # http://localhost:5173
```

验收:

```bash
curl -I http://localhost:5173/     # 期望 200
```

说明: dev 模式下 `/api` 与 `/r/` 由 Vite 代理转发到 `VITE_API_PROXY_TARGET` (默认 `http://localhost:8588`), 需要先启动 Stub 后端。

## 2. 路径 B · Docker 生产部署

构建 (可选注入前端变量):

```bash
docker build -t stub-front:latest \
  --build-arg VITE_API_BASE_URL="" \
  --build-arg VITE_PUBLIC_BASE_URL="https://s.example.com" .
```

也可以直接使用 CI 推送到 GHCR 的现成镜像 (master 每次推送自动更新):

```bash
docker pull ghcr.io/<owner>/stub-front:latest
```

运行 (**必须**传 `API_UPSTREAM`):

```bash
docker run -d --name stub-front -p 80:80 \
  -e API_UPSTREAM=http://<后端主机>:8588 stub-front:latest
```

验收:

```bash
curl -I http://localhost/                  # 期望 200 (前端页面)
curl -i  http://localhost/api/v1/<真实接口> # 期望后端响应而非 502
```

注意:

- **不传 `API_UPSTREAM` 时容器会启动失败** (`proxy_pass` 为空), 这是有意设计, 避免静默反代到错误目标。
- 后端主机用容器网络可达地址 (如 `host.docker.internal:8588` 或 compose 服务名), 不要写 `localhost:8588` (容器内的 localhost 不是宿主机)。
- 回滚: `docker rm -f stub-front && docker rmi stub-front:latest`。

## 3. 环境变量表

| 变量 | 生效阶段 | 默认 | 说明 |
| --- | --- | --- | --- |
| `VITE_API_PROXY_TARGET` | dev | `http://localhost:8588` | Vite dev server 代理目标 |
| `VITE_API_BASE_URL` | build | 空 (= 同源 `/api`) | 前端独立部署直连跨域 API 时填完整地址 |
| `VITE_PUBLIC_BASE_URL` | build | 空 | 短链展示前缀, 仅 UI 展示用 |
| `API_UPSTREAM` | run | **必填** | nginx 反代 `/api` 与 `/r/` 的后端地址 |

## 4. CI

`.github/workflows/ci.yml` 在 push `master` 与 pull_request 时执行:
Docker 构建。

push `master` 时额外产出两样东西:

- 镜像推送到 GHCR: `ghcr.io/<owner>/stub-front:latest` 与 `:<git-sha>` (用内置 GITHUB_TOKEN, 无需手动配密钥);
- dist 产物归档: Actions run 页面底部 Artifacts 区下载 `stub-front-dist.zip` (保留 14 天)。

pull_request 与其他分支 push 只做构建冒烟, 不推送镜像。

本地没有 Docker 时, **Dockerfile 的真实验证以 Actions 首跑为准**; 失败时把 Actions 日志贴给 AI 排查。

## 5. 常见故障

| 症状 | 原因 | 处理 |
| --- | --- | --- |
| `localhost:5173` 拒绝连接 | dev server 未启动 | `npm run dev` |
| 页面报 `Failed to resolve import "@/pages/..."` | 文件缺失或被 `.gitignore` 意外忽略 | 先 `git check-ignore -v <路径>`; 教训: 曾因 `logs/` 规则吞掉 `src/pages/logs/`, 已改为 `/logs/` 锚定根目录 |
| 容器启动即退出 | 未传 `API_UPSTREAM` | `docker logs stub-front` 确认后, 删容器带 `-e` 重建 |
| `/api` 返回 502 | `API_UPSTREAM` 指错 / 后端未启动 / 容器内 `localhost` 指向自身 | 先直连后端验证, 再修 `-e` 值重建容器 |
| CI 的 Docker 步骤红 | 基础镜像拉取受限 / 网络问题 | 查看 Actions 日志定位, 常见于 runner 网络波动, 重跑一次 |

## 6. 总验收清单

- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 产出 `dist/`
- [ ] 路径 A: `localhost:5173` 返回 200
- [ ] 路径 B: 容器存活, `/` 返回 200, `/api/...` 透传后端
- [ ] `git status` 无意外文件; 新增源码目录提交前用 `git check-ignore -v <路径>` 复核