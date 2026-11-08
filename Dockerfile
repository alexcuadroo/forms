# syntax=docker/dockerfile:1
FROM node:26.13.0-bookworm-slim AS base
WORKDIR /app

FROM base AS dependencies
RUN npm install -g pnpm@12.18.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM dependencies AS production-dependencies
RUN --mount=type=cache,id=forms-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --prod --store-dir=/pnpm/store

FROM dependencies AS build
RUN --mount=type=cache,id=forms-pnpm,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY server ./server
COPY shared ./shared
COPY tests ./tests
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
ENV UPLOAD_DIR=/data/uploads
RUN mkdir -p /data/uploads && chown node:node /data/uploads
COPY package.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY server ./server
COPY shared ./shared
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node","server/index.ts"]
