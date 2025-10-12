# Multi-stage build for typed-handler library development
FROM node:20-alpine AS base

# Enable pnpm via corepack
RUN corepack enable pnpm

# Set working directory
WORKDIR /app

# ============================================
# Dependencies stage
# ============================================
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Builder stage (for production builds)
# ============================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the library
RUN pnpm build

# ============================================
# Development stage (hot reload support)
# ============================================
FROM base AS dev

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including dev)
RUN pnpm install

# Copy source code (volumes will override in compose)
COPY . .

# Expose port for examples/dev server
EXPOSE 3000

# Default to development mode
CMD ["pnpm", "dev"]

# ============================================
# Test stage
# ============================================
FROM base AS test

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source and tests
COPY . .

# Run tests
CMD ["pnpm", "test"]

# ============================================
# Production runner stage (for testing builds)
# ============================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Default command (can be overridden)
CMD ["node", "dist/index.js"]
