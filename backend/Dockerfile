# ==============================================================================
# Dockerfile for DineGo Backend (NestJS 11 + Prisma ORM + MS SQL Server Driver)
# ==============================================================================

# ----------------- Stage 1: Build -----------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies without failing Prisma postinstall
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
RUN npm install --prefer-offline --no-audit

# Copy application source
COPY . .

# Generate Prisma Client for Linux
ENV DATABASE_URL="sqlserver://localhost:1433;database=dinego_db;integratedSecurity=false;trustServerCertificate=true"
RUN npx prisma generate

# Build NestJS application
RUN npm run build

# ----------------- Stage 2: Production Runner -----------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Copy dependencies and build outputs from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Non-root user for security
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/main"]
