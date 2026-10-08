# ==========================================
# 1. Base / Dependencies Stage
# ==========================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies yang dibutuhkan Prisma & library native
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# ==========================================
# 2. Builder Stage
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS (dist/main.js)
RUN npm run build

# Prune devDependencies untuk image runtime produksi yang ramping
RUN npm prune --omit=dev

# ==========================================
# 3. Production Runner Stage
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache openssl

# Buat non-root user demi standar keamanan
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Siapkan folder uploads dengan permission yang benar
RUN mkdir -p uploads && chown -R nestjs:nodejs /app

COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main"]
