# DevAtlas Worker Dockerfile
# Created by Balaji Koneti

FROM node:18-alpine AS base

# Install pnpm and git
RUN npm install -g pnpm && apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/ai/package.json ./packages/ai/
COPY packages/analyzer/package.json ./packages/analyzer/
COPY packages/config/package.json ./packages/config/
COPY apps/worker/package.json ./apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Build packages
RUN pnpm --filter @devatlas/db build
RUN pnpm --filter @devatlas/ai build
RUN pnpm --filter @devatlas/analyzer build

# Build worker
RUN pnpm --filter @devatlas/worker build

# Production stage
FROM node:18-alpine AS production

# Install pnpm and git
RUN npm install -g pnpm && apk add --no-cache git

WORKDIR /app

# Copy built application
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/worker/dist ./apps/worker/dist
COPY --from=base /app/apps/worker/package.json ./apps/worker/

# Create temp directory for git clones
RUN mkdir -p /tmp/devatlas

# Start worker
CMD ["node", "apps/worker/dist/main.js"]
