# ── Stage 1: build the frontend ──────────────────────────────────────────────
FROM node:20-alpine AS web-builder
WORKDIR /build

COPY .npmrc ./web/.npmrc
COPY shared/ ./shared/
COPY web/package*.json ./web/
RUN cd web && npm ci --silent

COPY web/ ./web/
RUN cd web && npm run build

# ── Stage 2: production server ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install Chromium for Puppeteer PDF export
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

# Install ALL deps (tsx is needed to run TypeScript directly — POC mode)
COPY .npmrc ./.npmrc
COPY shared/ ./shared/
COPY server/package*.json ./
RUN npm ci --silent

# Copy server source and built frontend
COPY server/src/ ./src/
COPY --from=web-builder /build/web/dist ./web/dist/

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
