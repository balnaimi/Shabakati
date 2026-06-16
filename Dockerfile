# Multi-stage build for production
FROM node:24-alpine AS builder

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /app

# better-sqlite3 needs native build when prebuilt binaries are unavailable
RUN apk add --no-cache python3 make g++

COPY web/package*.json ./web/
COPY server/package*.json ./server/

RUN cd web && npm ci && cd ../server && npm ci

COPY . .

RUN cd web && npm run build

# Production stage
FROM node:24-alpine

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /app

COPY server/package*.json ./server/

# Reuse musl-built node_modules from builder — do not run npm ci again here
# (prebuild download often times out; node-gyp would need build tools again).
COPY --from=builder /app/server/node_modules ./server/node_modules

COPY --from=builder /app/web/dist ./dist

COPY server/ ./server/
COPY shared/ ./shared/

RUN mkdir -p server/logs

WORKDIR /app/server

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server.js"]
