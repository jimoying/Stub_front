# syntax=docker/dockerfile:1

# ---------- 构建阶段: Vite 产物 ----------
FROM node:22-alpine AS builder
WORKDIR /app

# 先装依赖, 利用镜像层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 再拷源码 (受 .dockerignore 约束, 本地 .env 不会进入构建上下文)
COPY . .

# 构建期前端变量 (可选): 同源部署时 VITE_API_BASE_URL 留空即可
ARG VITE_API_BASE_URL=""
ARG VITE_PUBLIC_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_PUBLIC_BASE_URL=${VITE_PUBLIC_BASE_URL}

RUN npm run build

# ---------- 运行阶段: nginx 静态托管 + API 反代 ----------
FROM nginx:1.27-alpine

# 官方镜像启动时对 /etc/nginx/templates/*.template 做 envsubst,
# 生成 /etc/nginx/conf.d/default.conf (只替换已定义的环境变量)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# 运行时必须显式传入后端地址, 例:
#   docker run -d -p 80:80 -e API_UPSTREAM=http://<后端主机>:8588 stub-front
# 不传 API_UPSTREAM 时 nginx 会因 proxy_pass 为空而启动失败, 这是有意设计,
# 避免静默反代到错误目标。详见 DEPLOY.md。