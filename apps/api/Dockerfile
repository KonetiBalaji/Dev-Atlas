# DevAtlas API Dockerfile
# Created by Balaji Koneti

FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/ai/package.json ./packages/ai/
COPY packages/analyzer/package.json ./packages/analyzer/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build packages
RUN pnpm --filter @devatlas/db build
RUN pnpm --filter @devatlas/ai build
RUN pnpm --filter @devatlas/analyzer build

# Build API
RUN pnpm --filter @devatlas/api build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy built application
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "apps/api/dist/main.js"]
