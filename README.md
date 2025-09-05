# DevAtlas

> **Understand any developer and codebase in minutes.**
> Ingest public/private GitHub repos, analyze structure and quality, infer ownership, summarize with LLMs, and produce a transparent, reproducible score with actionable guidance.

<p align="center">
<img alt="DevAtlas overview" src="https://dummyimage.com/1200x280/efefef/333&text=DevAtlas:+Codebase+%2B+Developer+Profiler"/>
</p>

---

## Table of Contents

* [Vision & Use Cases](#vision--use-cases)
* [Core Features](#core-features)
* [Architecture](#architecture)
* [Tech Stack](#tech-stack)
* [Monorepo Layout](#monorepo-layout)
* [Quick Start (10 min)](#quick-start-10-min)
* [Environment Variables](#environment-variables)
* [GitHub App/OAuth Setup](#github-appoauth-setup)
* [Database Schema (Prisma excerpt)](#database-schema-prisma-excerpt)
* [Scoring Rubric (Transparent)](#scoring-rubric-transparent)
* [Analyzer Pipeline](#analyzer-pipeline)
* [LLM Integration & Cost Control](#llm-integration--cost-control)
* [Vector Search (pgvector)](#vector-search-pgvector)
* [API (REST + OpenAPI)](#api-rest--openapi)
* [Frontend UX](#frontend-ux)
* [Background Jobs & Scheduling](#background-jobs--scheduling)
* [Observability (Logs, Metrics, Traces)](#observability-logs-metrics-traces)
* [Security & Privacy](#security--privacy)
* [Multi-tenancy & Isolation](#multi-tenancy--isolation)
* [CI/CD & Quality Gates](#cicd--quality-gates)
* [Testing Strategy](#testing-strategy)
* [Performance & Cost Guidelines](#performance--cost-guidelines)
* [SRE Runbook](#sre-runbook)
* [Scaling Guide](#scaling-guide)
* [Release Process & Versioning](#release-process--versioning)
* [Roadmap](#roadmap)
* [FAQ](#faq)
* [Contributing](#contributing)
* [License](#license)

---

## Vision & Use Cases

**DevAtlas** helps hiring managers, recruiters, and engineering leaders quickly understand a developer and their repositories through:

* **Clear summaries** of repos/modules, **ownership maps**, and **quality/security metrics**.
* A **transparent score** (0–100) backed by reproducible metrics—*not* a black box.
* **Actionable advice** to improve craft, reliability, docs, and security.

**Primary use cases**

* Recruiters: pre-screen GitHub candidates with evidence from real work.
* Managers: understand a new hire’s repo landscape and strengths.
* Dev teams: continuous repo health insights and contributor impact.

---

## Core Features

* **Repo Ingestion**: Clone and index top-N repos; fetch GitHub metadata (stars, PRs, CI).
* **Static Analysis**: LOC, language mix, lints, complexity, tests/coverage, CI presence.
* **Security Hygiene**: dependency vuln scan (npm/pip), secret detection, license check.
* **Documentation Quality**: README completeness and API docs presence.
* **Ownership & Collaboration**: `git blame` density by directory, PR/issue signals.
* **LLM Summaries**: concise repo/folder descriptions with gaps and run steps.
* **Vector Search**: semantic Q\&A over summaries and key files.
* **Scoring Engine**: transparent, weighted rubric with drill-downs.
* **Multi-Tenant SaaS**: orgs, roles, billing, audit logs.

---

## Architecture

```
                        +-----------------------+
                        |        Frontend       |
                        |   Next.js (App dir)   |
                        +-----------+-----------+
                                    |
                                    v
+--------------------+    +---------+----------+        +-------------------+
|  GitHub App/OAuth  |--> |  API Gateway (Nest)| <----> | PostgreSQL +      |
|  (scoped access)   |    |  AuthZ, Rate Limit |        | Prisma + pgvector |
+--------------------+    +---------+----------+        +-------------------+
                                    |                                ^
                                    v                                |
                           +--------+---------+               +------+------+
                           |  Job Queue (BullMQ) | <--------> |  Object    |
                           |  Redis               |            |  Storage   |
                           +----------+-----------+            |  (S3/MinIO)|
                                      |                        +------------+
                                      v
                           +----------+-----------+
                           |  Analyzer Workers    |
                           |  (Node/Python)       |
                           |  Git, Lint, SAST,    |
                           |  LLM Summaries       |
                           +----------------------+
```

**Key design notes**

* API is **stateless**, workers are **idempotent**; all long tasks go through Redis-backed queues.
* Git operations and large artifacts (logs, SARIF, SBOMs) are written to **S3/MinIO**.
* **OpenTelemetry** everywhere: request IDs and trace propagation from web → API → worker.

---

## Tech Stack

* **Frontend**: Next.js (App Router), shadcn/ui, TanStack Query, Zod, React Hook Form.
* **Backend**: NestJS (REST), Prisma ORM, Postgres (Neon/Supabase-compatible), Redis (queues), MinIO/S3.
* **Analysis**: Node & Python toolchain, `eslint`, `ruff`, `bandit`, `npm audit`/`yarn audit`, `pip-audit`, custom secret scan.
* **AI**: LLM gateway (OpenAI, local via Ollama), embeddings (text-embedding-3\* or local), **pgvector**.
* **Infra**: Docker Compose (dev), Terraform (cloud), GitHub Actions (CI), Sentry + OpenTelemetry.
* **Billing**: Stripe (Checkout + webhooks).

---

## Monorepo Layout

```
/devatlas
├─ apps/
│  ├─ web/                 # Next.js frontend
│  ├─ api/                 # NestJS REST API
│  └─ worker/              # Queue consumers & analyzers
├─ packages/
│  ├─ db/                  # Prisma schema & migrations
│  ├─ ai/                  # Prompt templates, model router
│  ├─ analyzer/            # Shared analyzers (JS/TS), runners
│  └─ config/              # eslint, tsconfig, prettier, commitlint
├─ infra/
│  ├─ docker/              # docker-compose, Dockerfiles
│  └─ terraform/           # optional IaC for cloud
├─ .github/workflows/      # CI pipelines
└─ README.md
```

---

## Quick Start (10 min)

> Local dev with Docker Compose. For a pure local run without Docker, see \[docs/local.md] (optional).

```bash
# 1) Clone
git clone https://github.com/your-org/devatlas.git && cd devatlas

# 2) Bootstrap env
cp .env.example .env        # root
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env

# 3) Start services
docker compose -f infra/docker/compose.dev.yml up --build

# 4) Run migrations & seed (from another shell)
docker compose exec api pnpm prisma migrate deploy
docker compose exec api pnpm prisma db seed

# 5) Open
# Web UI:    http://localhost:3000
# API docs:  http://localhost:8080/docs
```

**Default accounts (seed)**

* `owner@devatlas.local` / `changeme` (Owner)
* `admin@devatlas.local` / `changeme` (Admin)
* `viewer@devatlas.local` / `changeme` (Viewer)

> After login, create a **GitHub App** (see below), connect an org, and queue your first analysis.

---

## Environment Variables

**Root**

```
NODE_ENV=development
LOG_LEVEL=info
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
SENTRY_DSN=
```

**API (`apps/api/.env`)**

```
DATABASE_URL=postgresql://postgres:postgres@db:5432/devatlas
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET=devatlas
JWT_SECRET=devatlas-dev-secret
MULTI_TENANCY_MODE=org
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY_BASE64=...   # base64(PKCS8 PEM)
GITHUB_APP_CLIENT_ID=Iv1.abc...
GITHUB_APP_CLIENT_SECRET=...        # for user-to-server OAuth
ALLOWED_ORIGINS=http://localhost:3000
OPENAI_API_KEY=...                  # or leave empty to use Ollama
EMBEDDING_MODEL=text-embedding-3-small
```

**Worker (`apps/worker/.env`)**

```
DATABASE_URL=postgresql://postgres:postgres@db:5432/devatlas
REDIS_URL=redis://redis:6379
S3_*=... (same as API)
OPENAI_API_KEY=...
OLLAMA_BASE_URL=http://ollama:11434
MAX_TOKENS_PER_REPO=40000
MAX_PARALLEL_CLONES=3
```

**Web (`apps/web/.env`)**

```
NEXT_PUBLIC_API_BASE=http://localhost:8080
NEXTAUTH_SECRET=devatlas-dev-secret
GITHUB_OAUTH_CLIENT_ID=Iv1.abc...
GITHUB_OAUTH_CLIENT_SECRET=...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## GitHub App/OAuth Setup

1. **Create GitHub App** (Settings → Developer settings → GitHub Apps):

   * Webhook URL: `http://localhost:8080/integrations/github/webhook`
   * Permissions (minimum):

     * Repository contents: **Read-only**
     * Metadata: **Read-only**
     * Pull requests: **Read-only**
     * Issues: **Read-only**
     * Actions: **Read-only**
     * Members (for org installs): **Read-only**
   * Subscribe to events: `push`, `pull_request`, `issues`, `workflow_run` (optional)
   * Generate a private key → base64 encode → set `GITHUB_APP_PRIVATE_KEY_BASE64`.
2. **Install the App** on your org or account; enable selected repositories.
3. **(Optional) OAuth App** (for end-user login): map client ID/secret to web `.env`.

> DevAtlas clones via the installation token; private repos require org/user installation.

---

## Database Schema (Prisma excerpt)

```prisma
model Org {
  id          String   @id @default(cuid())
  name        String
  stripeId    String?  @unique
  users       User[]
  projects    Project[]
  createdAt   DateTime @default(now())
}

model User {
  id        String   @id @default(cuid())
  orgId     String
  org       Org      @relation(fields: [orgId], references: [id])
  email     String   @unique
  name      String?
  role      Role     @default(VIEWER)
  provider  String   @default("github")
  createdAt DateTime @default(now())
}

enum Role { OWNER ADMIN EDITOR VIEWER }

model Project {               // a GitHub identity to analyze (user/org)
  id        String   @id @default(cuid())
  orgId     String
  org       Org      @relation(fields: [orgId], references: [id])
  handle    String   // github username/org
  type      String   // "user" | "org"
  status    String   @default("idle")
  analyses  Analysis[]
  createdAt DateTime @default(now())
}

model Analysis {
  id           String   @id @default(cuid())
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id])
  startedAt    DateTime @default(now())
  finishedAt   DateTime?
  status       String   @default("queued") // queued|running|failed|complete
  summary      String?
  scoreId      String?
  score        Score?   @relation(fields: [scoreId], references: [id])
  repos        Repo[]
}

model Repo {
  id           String   @id @default(cuid())
  analysisId   String
  analysis     Analysis @relation(fields: [analysisId], references: [id])
  name         String
  url          String
  stars        Int      @default(0)
  forks        Int      @default(0)
  language     String?
  loc          Int      @default(0)
  hasTests     Boolean  @default(false)
  hasCI        Boolean  @default(false)
  readmeScore  Int      @default(0)
  lintIssues   Int      @default(0)
  complexity   Float?
  vulnCount    Int      @default(0)
  secretsFound Int      @default(0)
  summary      String?
}

model Ownership {
  id        String @id @default(cuid())
  repoId    String
  repo      Repo   @relation(fields: [repoId], references: [id])
  path      String
  author    String  // normalized login/email
  share     Float   // 0.0..1.0
}

model Score {
  id             String   @id @default(cuid())
  analysisId     String   @unique
  overall        Int
  craft          Int
  reliability    Int
  documentation  Int
  security       Int
  impact         Int
  collaboration  Int
  details        Json
}

model Embedding {
  id        String   @id @default(cuid())
  repoId    String
  repo      Repo     @relation(fields: [repoId], references: [id])
  path      String
  kind      String   // repo|dir|file|doc
  vector    Vector   // pgvector(1536)
  text      String
}
```

---

## Scoring Rubric (Transparent)

> Deterministic functions over raw metrics. Store *both* sub-scores and inputs for auditability.

Weights (tune per customer):

* **Craft (25%)** – lint issues/KLOC, complexity, idiomatic usage
* **Reliability (15%)** – tests present, coverage signals, CI passing
* **Documentation (15%)** – README completeness, API docs, examples
* **Security (15%)** – vuln density, secret leaks, dependency freshness
* **Impact (20%)** – PRs merged, issues closed, releases, community signals
* **Collaboration (10%)** – review activity, commit message quality, PR descriptions

Example formulas (pseudo):

```
craft = 100 - clamp01(lintIssuesPerKLOC / 50)*100 - clamp01(avgComplexity / 10)*20
reliability = 40 + 30*hasTests + 30*hasCI + 0..optional coverage badge parse..
documentation = readmeScore  // 0..100 from checklist
security = 100 - clamp01(vulnsPerKLOC / 0.5)*60 - min(secretsFound,3)*10
impact = clamp01(norm(PRsMerged + IssuesClosed + Releases + StarsWeighted))*100
collaboration = clamp01(norm(Reviews + PRComments + ConventionalCommitRate))*100
overall = round(0.25*craft + 0.15*reliability + 0.15*documentation + 0.15*security + 0.20*impact + 0.10*collaboration)
```

**Principles**

* Never pretend certainty—show confidence bands and missing-data warnings.
* Disclose rubric to users; allow custom weights per org.

---

## Analyzer Pipeline

**Phases** (each emits artifacts to S3 and rows to Postgres):

1. **Discover** – list repos for handle; filter forks/archived if configured.
2. **Clone/Checkout** – shallow clone default branch; optional depth per size.
3. **Inventory** – language detection, LOC, file map, package managers.
4. **Static Checks** – run `eslint` (JS/TS), `ruff`/`flake8` + `bandit` (Python), parse SARIF.
5. **Security** – `npm audit`/`yarn npm audit`, `pip-audit`, secret scan (entropy + denylist), license scan.
6. **Docs** – README checklist (purpose, setup, run, test, env, license), Swagger/JSDoc/docstrings.
7. **Ownership** – `git blame` by top-k directories; compute author share.
8. **LLM Summaries** – repo root + top folders by LOC; redacted inputs.
9. **Scoring** – compute sub-scores; store `Score.details` with inputs.
10. **Indexing** – build embeddings for summaries; store in `Embedding`.

**Idempotency**: every phase is resumable via job keys; partial artifacts are safe to re-use.

---

## LLM Integration & Cost Control

* **Model router**: OpenAI by default; fallback to **Ollama** (e.g., `llama3:instruct`) for dev.
* **Budgeting**: cap tokens per repo (`MAX_TOKENS_PER_REPO`); summarize *folders*, not files; skip binaries and vendored code.
* **Redaction**: strip secrets and emails from prompts; hash filenames if configured.
* **Prompts** (repo root, ≤120 words):

  > “You document a repository for a hiring manager. In ≤120 words, state purpose, main modules, how to run tests, and 2–3 missing documentation gaps if any. Be concrete and neutral.”

---

## Vector Search (pgvector)

* Embeddings for repo-level and directory-level summaries for semantic Q\&A.
* Query pattern: `SELECT ... ORDER BY vector <-> query_embedding LIMIT 5`.
* Chunk policy: repo root + top N directories by LOC (N configurable) to stay cheap and relevant.

---

## API (REST + OpenAPI)

OpenAPI served at `/docs`.

**Auth**: JWT session from NextAuth; org-scoped API keys for automation.

**Key endpoints**

```
POST   /v1/projects                           # register a GitHub handle (user/org)
POST   /v1/projects/:id/analyze               # enqueue analysis
GET    /v1/projects/:id/analyses/latest       # latest analysis summary
GET    /v1/analyses/:id                       # analysis by id
GET    /v1/analyses/:id/score                 # overall + breakdown
GET    /v1/analyses/:id/repos                 # per-repo metrics
GET    /v1/repos/:id/ownership                # blame-based shares
POST   /v1/search                             # semantic query over embeddings
```

**Sample response**

```json
{
  "analysisId": "an_123",
  "overall": 78,
  "breakdown": {"craft":82,"reliability":65,"documentation":75,"security":80,"impact":70,"collaboration":88},
  "notes": [
    "Missing tests in 4/7 repos",
    "2 high vulns in api-server (fixable via minor upgrade)",
    "Add quick-start to 3 READMEs"
  ]
}
```

**Rate limits**

* Default: 60 req/min per org; burst 120.
* Analysis jobs: concurrency per org to protect GitHub API quotas.

---

## Frontend UX

* **Project Overview**: avatar, top languages, score dial, confidence band.
* **Repos Grid**: cards with summary, sub-scores, issues to fix.
* **Ownership Map**: tree view with contributor shares per directory.
* **Security & Docs**: vuln table with severities; README checklist heatmap.
* **Semantic Search**: ask “Where is auth implemented?” → links to files/dirs.
* **Reports**: export PDF of profile and recommendations.

---

## Background Jobs & Scheduling

* Queue: **BullMQ** with named jobs per phase.
* Schedulers: nightly re-analysis; webhook-driven on `push`/`workflow_run`.
* Dead-letter queues and retry with backoff; circuit breaker when GitHub rate limit nears.

---

## Observability (Logs, Metrics, Traces)

* **Logs**: pino JSON; requestId, orgId propagation.
* **Traces**: OpenTelemetry; spans across web→api→worker; sampled at 20% in dev.
* **Metrics**: Prometheus export—job durations, error rates, LLM token spend, GitHub API quota.
* **Alerting**: SLOs (p95 API latency, job success rate), Slack & email.

---

## Security & Privacy

* **Principle of least privilege** GitHub permissions.
* Secrets in **.env** only for dev; in prod use KMS/ASM and dynamic DB creds.
* **Secret scanning** pre-ingest; redact before LLM.
* **Tenant isolation** at row level (orgId) + scope checks on every query.
* **Data retention**: configurable TTL for artifacts; right-to-be-forgotten endpoint.
* **Compliance-ready** docs: DPIA template, subprocessors list, data map.

**Ethics**: scoring is guidance, not judgment. Show missing data; never infer sensitive attributes.

---

## Multi-tenancy & Isolation

* `orgId` everywhere; RLS policy (if using Postgres RLS) or app-level guards.
* Per-tenant rate limits; per-tenant job concurrency caps.
* Optional single-tenant deployments for enterprises.

---

## CI/CD & Quality Gates

* **Pipelines** (GitHub Actions):

  * Lint + typecheck
  * Unit & integration tests
  * Build Docker images
  * DB migration check (`prisma migrate diff`)
  * Trivy scan images; npm/pip audit budget
  * Preview env (Vercel) for web, ephemeral DB for PRs
* **Quality gates**: block on critical vuln or >X lint errors/KLOC.

---

## Testing Strategy

* **Unit**: pure functions (scoring, checklists, normalizers).
* **Integration**: analyzer runners against fixture repos.
* **E2E**: spin up compose; run an analysis of a sample GitHub user; assert scores.
* **Contract tests**: API schema with Pact; Frontend with Playwright.
* **Security**: secret scan false-positives corpus; dependency audit snapshots.

---

## Performance & Cost Guidelines

* Clone shallow (`--depth=1`), size caps per repo.
* Skip large binaries, vendor directories; respect `.devatlasignore`.
* Limit LLM usage to repo root + top-k dirs; reuse cached summaries by commit SHA.
* Batch GitHub API calls; exponential backoff; ETags.
* Track **tokens & \$** per analysis; show in UI; budget alerts.

---

## SRE Runbook

* **Prod incident**: identify failing phase via span; drain queue for org; replay with `replay --org`.
* **GitHub quota**: throttle new jobs; retry after `X-RateLimit-Reset`.
* **DB hot rows**: check slow queries → add composite index (`orgId, createdAt`).
* **Large repo timeouts**: raise `CLONE_TIMEOUT_MS` and set size caps.
* **LLM outages**: switch router to Ollama; degrade to no-summaries.

---

## Scaling Guide

* **API**: stateless HPA by CPU/RPS; sticky sessions not required.
* **Workers**: scale by queue depth; limit concurrent LLM and Git tasks.
* **DB**: connection pooling (pgBouncer); read replicas for analytics; partition large tables by month if needed.
* **Storage**: S3 lifecycle rules; compress SARIF/logs; CDN for static.

---

## Release Process & Versioning

* Semantic versioning for API: `v1` path; breaking changes behind feature flags.
* Release train weekly; changelog generated from Conventional Commits.
* Blue/green deploy; run `prisma migrate deploy` with lock.

---

## Roadmap

* **v1.0**: repo-level summaries, static checks, scoring, org multi-tenancy, Stripe.
* **v1.1**: ownership map, semantic Q\&A, PDF reporting, custom weight profiles.
* **v1.2**: coverage parsing, flaky test detection, SBOM & license policy.
* **v2.0**: team analytics over time, JIRA/GitLab integrations, SSO (SAML/OIDC).

---

## FAQ

**Q:** Is the score fair?
**A:** It’s transparent and reproducible; missing data lowers confidence, not score. Customize weights per org.

**Q:** Private repos?
**A:** Yes, via GitHub App installation with repo access. Data stays within your tenant.

**Q:** Model privacy?
**A:** Summaries are redacted and can run on local models (Ollama). No code is permanently stored in prompts.

---

## Contributing

* Use **pnpm** workspaces and **Conventional Commits**.
* Pre-commit hooks run lint, typecheck, and tests.
* New analyzers should return SARIF or a typed JSON spec and include fixtures.

```bash
pnpm i
pnpm -w lint
pnpm -w build
pnpm -w test
```

---

## License

Apache-2.0. See [LICENSE](LICENSE).

---

### Appendix A – Docker Compose (excerpt)

```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: devatlas
    ports: ["5432:5432"]
  redis:
    image: redis:7
    ports: ["6379:6379"]
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio123
    ports: ["9000:9000","9001:9001"]
  api:
    build: ./apps/api
    env_file: ./apps/api/.env
    depends_on: [db, redis, minio]
    ports: ["8080:8080"]
  worker:
    build: ./apps/worker
    env_file: ./apps/worker/.env
    depends_on: [db, redis, minio]
  web:
    build: ./apps/web
    env_file: ./apps/web/.env
    ports: ["3000:3000"]
```

### Appendix B – Example README Checklist

* Project purpose & audience
* Quick start (run, test)
* Env variables documented
* CI badge
* Contribution guide
* License
* API docs or link
* Examples/screenshots

### Appendix C – Secret Patterns (denylist)

* Common AWS keys, GCP keys, GitHub tokens, Slack webhooks
* High-entropy strings > 32 chars with base64/hex alphabet

### Appendix D – Ownership Computation

* Compute blame per file → aggregate by directory → normalize shares → top contributors per node.

### Appendix E – Missing Data Handling

* If no tests folder: reliability cannot exceed 70
* If no README: documentation ≤ 40
* If dependency scan fails: security confidence ↓ but don’t zero the score
