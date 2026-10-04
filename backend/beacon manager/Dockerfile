# Beacon AI — API + send worker.
#
# Build context is this directory. In Dokploy set:
#   Build Type  : Dockerfile
#   Build Path  : backend/beacon manager        <-- note the space
#   Dockerfile  : Dockerfile
#
# Node 22: the code relies on global fetch (ai.service.js) and top-level await,
# so anything below 18 fails at runtime rather than at build time.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Production deps only. npm ci needs the lockfile to match package.json.
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Run unprivileged. node:alpine ships a `node` user already.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
USER node

# config/env.js defaults PORT to 5000; the app and this image agree on 5050.
ENV PORT=5050
EXPOSE 5050

# /health is public (app.js:33) and needs no auth, so it is a usable probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5050/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Exec form, so node is PID 1 and receives SIGTERM directly. server.js handles
# it: closes the socket, quits Redis, drains HTTP, disconnects Mongo. Without
# this a redeploy would SIGKILL mid-send.
CMD ["node", "src/server.js"]
