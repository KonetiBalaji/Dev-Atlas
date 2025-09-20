FROM node:18-alpine

WORKDIR /app

# Install system dependencies for analysis tools
RUN apk add --no-cache \
    git \
    python3 \
    py3-pip \
    curl \
    cloc

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/ai/package.json ./packages/ai/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install Python analysis tools
RUN pip3 install ruff bandit pip-audit

# Copy source code
COPY . .

# Build the application
RUN pnpm build --filter=worker

# Create directory for cloned repos
RUN mkdir -p /tmp/devatlas

CMD ["pnpm", "start:dev", "--filter=worker"]
