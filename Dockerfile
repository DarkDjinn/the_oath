# syntax=docker/dockerfile:1

# ---- build ---------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY . .
# Installs dependencies (including the prebuilt better-sqlite3 and sharp binaries) and builds Nuxt.
RUN npm ci --no-audit --no-fund && npm run build
# The backup script resolves better-sqlite3 from the server bundle's own node_modules.
RUN cp scripts/backup.mjs .output/server/backup.mjs

# ---- runtime -------------------------------------------------------------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/data/wedding.db \
    PHOTOS_DIR=/data/photos \
    BACKUP_DIR=/data/backups \
    WHATSAPP_DIR=/data/whatsapp
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
# The database, photos and backups live on a volume owned by the unprivileged user.
RUN mkdir -p /data/photos /data/backups /data/whatsapp && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Nitro shuts down gracefully on SIGTERM; the database is closed in server/plugins/lifecycle.ts.
CMD ["node", ".output/server/index.mjs"]
