FROM node:26.13.0-bookworm-slim AS base
RUN npm install -g pnpm@12.18.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
FROM base AS runtime
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod && mkdir -p /data/uploads && chown node:node /data/uploads
COPY server ./server
COPY shared ./shared
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node","server/app.js"]
