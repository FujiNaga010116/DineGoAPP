# ==============================================================================
# Dockerfile for DineGo Frontend (React 19 + TypeScript + Vite + Nginx Alpine)
# ==============================================================================

# ----------------- Stage 1: Build -----------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build production bundle into dist/
RUN npm run build

# ----------------- Stage 2: Serve with Nginx -----------------
FROM nginx:1.27-alpine AS runner

# Copy custom Nginx configuration for Single Page Application routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

