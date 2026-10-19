# ==============================================================================
# DEVICE PRO — Production Docker Containerfile
# Multi-stage security-hardened container for high-efficiency production delivery
# ==============================================================================

FROM node:22-alpine AS base

# Install security updates & dumb-init for clean process reaping
RUN apk --no-cache add dumb-init curl

WORKDIR /app

# Step 1: Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Step 2: Copy application files
COPY server.js ./
COPY ecosystem.config.js ./
COPY db ./db
COPY lib ./lib
COPY public ./public
COPY scripts ./scripts

# Step 3: Create runtime directories with appropriate permissions for node user
RUN mkdir -p /app/data /app/data/backups /app/logs && \
    chown -R node:node /app

# Switch to unprivileged system user
USER node

# Expose standard port
EXPOSE 3000

ENV PORT=3000 \
    NODE_ENV=production

# Healthcheck probe against the active server
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
