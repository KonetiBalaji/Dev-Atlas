# DevAtlas Local Development Guide

## Prerequisites

- Node.js 18+ (with pnpm)
- Docker & Docker Compose
- PostgreSQL 14+ (with pgvector extension)
- Redis 6+
- MinIO (S3-compatible storage)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/devatlas.git
   cd devatlas
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start infrastructure services**
   ```bash
   docker-compose -f infra/docker/docker-compose.yml up -d
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize the database**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

6. **Start the development servers**
   ```bash
   # Start all services
   pnpm dev

   # Or start individual services
   pnpm dev:api     # API server
   pnpm dev:web     # Frontend
   pnpm dev:worker  # Background worker
   ```

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/devatlas"

# Redis
REDIS_URL="redis://localhost:6379"

# MinIO (S3-compatible storage)
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="devatlas"

# GitHub App
GITHUB_APP_ID="your-app-id"
GITHUB_APP_PRIVATE_KEY="your-private-key"
GITHUB_WEBHOOK_SECRET="your-webhook-secret"

# JWT
JWT_SECRET="your-jwt-secret"

# LLM (OpenAI)
OPENAI_API_KEY="your-openai-api-key"

# Stripe (for billing)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Observability
SENTRY_DSN="your-sentry-dsn"
```

## Development Workflow

### Database Migrations

```bash
# Create a new migration
pnpm db:migration:create --name add_new_table

# Run migrations
pnpm db:migrate

# Reset database (development only)
pnpm db:reset
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

## Architecture Overview

### Monorepo Structure

```
devatlas/
├── apps/
│   ├── api/          # NestJS API server
│   ├── web/          # Next.js frontend
│   └── worker/       # Background job processor
├── packages/
│   ├── analyzer/     # Code analysis engine
│   ├── ai/           # LLM integration
│   ├── config/       # Shared configuration
│   ├── db/           # Database schema & migrations
│   └── enterprise/   # Enterprise features
└── infra/
    ├── docker/       # Development containers
    └── terraform/    # Production infrastructure
```

### Key Components

1. **API Server** (`apps/api`)
   - NestJS REST API
   - JWT authentication
   - Rate limiting
   - OpenAPI documentation

2. **Frontend** (`apps/web`)
   - Next.js with App Router
   - React + TypeScript
   - Tailwind CSS + shadcn/ui
   - TanStack Query for state management

3. **Background Worker** (`apps/worker`)
   - BullMQ job processing
   - Code analysis pipeline
   - LLM integration
   - Webhook handling

4. **Analyzer Engine** (`packages/analyzer`)
   - Multi-language static analysis
   - Security scanning
   - Test coverage analysis
   - License compliance

## Development Tips

### Hot Reloading

All services support hot reloading during development:

- **API**: Automatically restarts on file changes
- **Web**: Next.js Fast Refresh for instant updates
- **Worker**: Restarts job processors on changes

### Debugging

1. **API Debugging**
   ```bash
   # Enable debug logging
   DEBUG=devatlas:* pnpm dev:api

   # Use VS Code debugger
   # See .vscode/launch.json for configurations
   ```

2. **Database Debugging**
   ```bash
   # Connect to local PostgreSQL
   psql postgresql://postgres:password@localhost:5432/devatlas

   # View Prisma queries
   DEBUG=prisma:query pnpm dev:api
   ```

3. **Queue Debugging**
   ```bash
   # Monitor Redis queues
   redis-cli monitor

   # View BullMQ dashboard
   # Available at http://localhost:3001/admin/queues
   ```

### Performance Profiling

1. **API Performance**
   ```bash
   # Enable OpenTelemetry tracing
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev:api
   ```

2. **Frontend Performance**
   ```bash
   # Analyze bundle size
   pnpm build:analyze

   # Lighthouse CI
   pnpm lighthouse
   ```

## Common Issues

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Reset database connection
pnpm db:reset
```

### Redis Connection Issues

```bash
# Check Redis is running
docker ps | grep redis

# Clear Redis cache
redis-cli flushall
```

### Build Issues

```bash
# Clear all node_modules and reinstall
pnpm clean
pnpm install

# Clear Next.js cache
rm -rf apps/web/.next
```

## Contributing

1. **Branch Naming**
   - `feature/description`
   - `fix/description`
   - `docs/description`

2. **Commit Messages**
   - Follow [Conventional Commits](https://www.conventionalcommits.org/)
   - Use `feat:`, `fix:`, `docs:`, `refactor:`, etc.

3. **Pull Requests**
   - Include tests for new features
   - Update documentation
   - Ensure CI passes

## Additional Resources

- [API Documentation](http://localhost:3000/api/docs)
- [Database Schema](./database-schema.md)
- [Deployment Guide](./deployment.md)
- [Troubleshooting](./troubleshooting.md)
