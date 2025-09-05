# DevAtlas Quick Start Guide

> **Created by Balaji Koneti**

## 🚀 Getting Started in 10 Minutes

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- pnpm (package manager)

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/devatlas.git
cd devatlas

# Copy environment files
cp env.example .env
cp apps/api/env.example apps/api/.env
cp apps/web/env.example apps/web/.env
cp apps/worker/env.example apps/worker/.env
```

### 2. Configure Environment

Edit the `.env` files with your configuration:

**Root `.env`:**
```bash
NODE_ENV=development
LOG_LEVEL=info
```

**`apps/api/.env`:**
```bash
# Add your GitHub App credentials
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY_BASE64=your_base64_private_key
GITHUB_APP_CLIENT_ID=your_client_id
GITHUB_APP_CLIENT_SECRET=your_client_secret

# Add OpenAI API key (optional - will use Ollama if not provided)
OPENAI_API_KEY=sk-your-openai-key
```

### 3. Start Services

```bash
# Start all services with Docker Compose
docker compose -f infra/docker/compose.dev.yml up --build

# Wait for services to be healthy, then run migrations
docker compose exec api pnpm prisma migrate deploy
docker compose exec api pnpm prisma db seed
```

### 4. Access the Application

- **Web UI**: http://localhost:3000
- **API Documentation**: http://localhost:8080/docs
- **MinIO Console**: http://localhost:9001 (minio/minio123)
- **Ollama**: http://localhost:11434

### 5. Default Login Credentials

- **Owner**: `owner@devatlas.local` / `changeme`
- **Admin**: `admin@devatlas.local` / `changeme`
- **Editor**: `editor@devatlas.local` / `changeme`
- **Viewer**: `viewer@devatlas.local` / `changeme`

### 6. Create Your First Analysis

1. Login to the web interface
2. Click "Add New Project"
3. Enter a GitHub username (e.g., `octocat`)
4. Select "User" type
5. Click "Create"
6. Click "Analyze" to start the analysis

## 🔧 Development

### Local Development (without Docker)

```bash
# Install dependencies
pnpm install

# Start database and Redis
docker compose -f infra/docker/compose.dev.yml up db redis minio -d

# Run migrations
pnpm --filter @devatlas/db prisma migrate dev

# Start all services in development mode
pnpm dev
```

### Project Structure

```
devatlas/
├── apps/
│   ├── api/          # NestJS REST API
│   ├── worker/       # Background job processor
│   └── web/          # Next.js frontend
├── packages/
│   ├── db/           # Prisma schema & client
│   ├── ai/           # LLM & embeddings
│   ├── analyzer/     # Static analysis tools
│   └── config/       # Shared configurations
└── infra/
    └── docker/       # Docker configurations
```

## 📊 Features

- **Repository Analysis**: Clone, analyze, and score GitHub repositories
- **Static Analysis**: Linting, complexity, security scanning
- **AI Summaries**: LLM-powered repository summaries
- **Semantic Search**: Vector-based code search
- **Ownership Mapping**: Git blame-based contributor analysis
- **Multi-tenant**: Organization-based isolation
- **Real-time**: WebSocket updates for analysis progress

## 🛠️ Configuration

### GitHub App Setup

1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Create a new GitHub App with these permissions:
   - Repository contents: Read-only
   - Metadata: Read-only
   - Pull requests: Read-only
   - Issues: Read-only
3. Set webhook URL: `http://localhost:8080/integrations/github/webhook`
4. Generate private key and base64 encode it
5. Update your `.env` files with the credentials

### AI Configuration

- **OpenAI**: Set `OPENAI_API_KEY` for GPT models
- **Ollama**: Runs locally for privacy (default)
- **Embeddings**: Uses OpenAI or local models

## 🚨 Troubleshooting

### Common Issues

1. **Database connection failed**
   ```bash
   docker compose logs db
   ```

2. **Analysis stuck in "queued"**
   ```bash
   docker compose logs worker
   ```

3. **GitHub API rate limits**
   - Add `GITHUB_TOKEN` to worker environment
   - Reduce `MAX_PARALLEL_CLONES`

4. **Out of disk space**
   ```bash
   docker system prune -a
   ```

### Reset Everything

```bash
# Stop all services
docker compose -f infra/docker/compose.dev.yml down -v

# Remove all data
docker volume prune -f

# Start fresh
docker compose -f infra/docker/compose.dev.yml up --build
```

## 📚 Next Steps

1. **Read the full documentation** in `README.md`
2. **Set up GitHub App** for production use
3. **Configure AI models** for your needs
4. **Customize scoring** in the analyzer package
5. **Deploy to production** using the provided Docker images

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pnpm test`
5. Submit a pull request

## 📄 License

Apache-2.0 - see [LICENSE](LICENSE) file for details.
