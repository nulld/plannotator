# Stage 1: Build portal static files
FROM oven/bun:1 AS portal-builder

WORKDIR /app

# Copy package files (skip lockfile - let bun create fresh)
COPY package.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/portal ./apps/portal

# Install dependencies (bun will create new lockfile)
RUN bun install

# Build portal
RUN bun run build:portal

# Stage 2: Final runtime image
FROM oven/bun:1-slim

WORKDIR /app

# Copy paste-service code
COPY apps/paste-service ./apps/paste-service

# Copy package files for workspace resolution (skip lockfile)
COPY package.json ./

# Install production dependencies (bun will create new lockfile)
RUN bun install --production

# Copy built portal from stage 1
COPY --from=portal-builder /app/apps/portal/dist ./apps/paste-service/public/share

# Environment defaults
ENV PASTE_PORT=8080
ENV PASTE_DATA_DIR=/data/pastes
ENV NODE_ENV=production

# Create data directory
RUN mkdir -p /data/pastes

# Expose port
EXPOSE 8080

# Start server
CMD ["bun", "run", "apps/paste-service/targets/railway.ts"]
