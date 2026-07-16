# ─────────────────────────────────────────────────
# ESUUQ API — Multi-stage Production Dockerfile
# ─────────────────────────────────────────────────

# ── Stage 1: Build ──
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (cached layer)
COPY package*.json ./
# IMPORTANT: Install ALL dependencies including devDependencies
RUN npm ci --include=dev

COPY . .
RUN npm run build

# Prune dev deps (remove dev dependencies after build)
RUN npm prune --production

# ── Stage 2: Production ──
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built artifacts
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Create uploads directory for file storage
RUN mkdir -p uploads && chown -R nestjs:nodejs uploads

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('http');const port=process.env.PORT||3000;http.get({host:'127.0.0.1',port,path:'/v1/health',timeout:3000},(res)=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1));"

CMD ["node", "dist/main"]