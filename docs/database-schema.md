# DevAtlas Database Schema

## Overview

DevAtlas uses PostgreSQL with the pgvector extension for vector similarity search. The schema is managed using Prisma ORM with type-safe database access.

## Core Tables

### Organizations (`orgs`)

Central tenant isolation unit for multi-tenancy.

```sql
CREATE TABLE orgs (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orgs_slug ON orgs(slug);
CREATE INDEX idx_orgs_created_at ON orgs(created_at DESC);
```

**Fields:**
- `id`: Unique organization identifier (CUID)
- `name`: Display name for the organization
- `slug`: URL-friendly unique identifier
- `settings`: JSON configuration (billing, features, etc.)
- `created_at`: Organization creation timestamp
- `updated_at`: Last modification timestamp

### Users (`users`)

User accounts with organization associations.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  github_id INTEGER UNIQUE,
  github_username TEXT,
  org_id TEXT REFERENCES orgs(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_github_id ON users(github_id);
```

**Fields:**
- `id`: Unique user identifier (CUID)
- `email`: User's email address (unique)
- `name`: Display name
- `avatar`: Profile picture URL
- `github_id`: GitHub user ID for OAuth
- `github_username`: GitHub username
- `org_id`: Organization association
- `role`: User role (`admin`, `member`, `viewer`)

### Projects (`projects`)

Top-level project containers for repository groups.

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  name TEXT NOT NULL,
  description TEXT,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  github_org TEXT,
  github_repos TEXT[],
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_github_org ON projects(github_org);
```

**Fields:**
- `id`: Unique project identifier (CUID)
- `name`: Project display name
- `description`: Optional project description
- `org_id`: Organization owner
- `github_org`: GitHub organization name
- `github_repos`: Array of repository patterns
- `settings`: JSON configuration (analysis settings, etc.)

### Analyses (`analyses`)

Analysis execution records and results.

```sql
CREATE TABLE analyses (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  trigger TEXT DEFAULT 'manual',
  commit_sha TEXT,
  branch TEXT DEFAULT 'main',
  summary JSONB,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analyses_project_id ON analyses(project_id);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_project_status ON analyses(project_id, status);
```

**Fields:**
- `id`: Unique analysis identifier (CUID)
- `project_id`: Associated project
- `status`: Current status (`pending`, `running`, `completed`, `failed`)
- `trigger`: What triggered the analysis (`manual`, `webhook`, `scheduled`)
- `commit_sha`: Git commit being analyzed
- `branch`: Git branch being analyzed
- `summary`: Analysis results summary (JSON)
- `metadata`: Additional analysis metadata
- `started_at`: Analysis start time
- `completed_at`: Analysis completion time

### Repositories (`repos`)

Individual repository analysis results.

```sql
CREATE TABLE repos (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  url TEXT NOT NULL,
  clone_url TEXT,
  default_branch TEXT DEFAULT 'main',
  language TEXT,
  size INTEGER,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  issues INTEGER DEFAULT 0,
  pull_requests INTEGER DEFAULT 0,
  last_commit TIMESTAMP,
  analysis_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_repos_analysis_id ON repos(analysis_id);
CREATE INDEX idx_repos_name ON repos(name);
CREATE INDEX idx_repos_language ON repos(language);
CREATE INDEX idx_repos_last_commit ON repos(last_commit DESC);
```

**Fields:**
- `id`: Unique repository identifier (CUID)
- `analysis_id`: Associated analysis
- `name`: Repository name
- `full_name`: Full repository name (org/repo)
- `url`: Repository URL
- `clone_url`: Git clone URL
- `default_branch`: Default branch name
- `language`: Primary programming language
- `size`: Repository size in KB
- `stars`: GitHub star count
- `forks`: GitHub fork count
- `issues`: Open issue count
- `pull_requests`: Open PR count
- `last_commit`: Last commit timestamp
- `analysis_result`: Complete analysis results (JSON)

### Ownership (`ownership`)

Code ownership and contribution tracking.

```sql
CREATE TABLE ownership (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  author TEXT NOT NULL,
  author_email TEXT,
  lines INTEGER DEFAULT 0,
  commits INTEGER DEFAULT 0,
  last_commit TIMESTAMP,
  ownership_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ownership_repo_id ON ownership(repo_id);
CREATE INDEX idx_ownership_author ON ownership(author);
CREATE INDEX idx_ownership_file_path ON ownership(file_path);
CREATE INDEX idx_ownership_repo_author ON ownership(repo_id, author);
```

**Fields:**
- `id`: Unique ownership record identifier
- `repo_id`: Associated repository
- `file_path`: File path within repository
- `author`: Author name from git commits
- `author_email`: Author email from git commits
- `lines`: Number of lines authored
- `commits`: Number of commits by author for this file
- `last_commit`: Last commit timestamp by this author
- `ownership_percentage`: Percentage of file owned by author

### Scores (`scores`)

Quality scoring and metrics.

```sql
CREATE TABLE scores (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER DEFAULT 100,
  weight DECIMAL(3,2) DEFAULT 1.0,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scores_repo_id ON scores(repo_id);
CREATE INDEX idx_scores_category ON scores(category);
CREATE INDEX idx_scores_score ON scores(score DESC);
CREATE INDEX idx_scores_repo_category ON scores(repo_id, category);
```

**Fields:**
- `id`: Unique score identifier
- `repo_id`: Associated repository
- `category`: Score category (`craft`, `reliability`, `documentation`, `security`, `impact`, `collaboration`)
- `score`: Numeric score value
- `max_score`: Maximum possible score
- `weight`: Category weight for overall calculation
- `details`: Detailed scoring breakdown (JSON)

## Vector Search Tables

### Embeddings (`embeddings`)

Vector embeddings for semantic search.

```sql
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_path TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity index (pgvector)
CREATE INDEX idx_embeddings_vector ON embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Regular indexes
CREATE INDEX idx_embeddings_repo_id ON embeddings(repo_id);
CREATE INDEX idx_embeddings_content_type ON embeddings(content_type);
```

**Fields:**
- `id`: Unique embedding identifier
- `repo_id`: Associated repository
- `content_type`: Type of content (`file`, `directory`, `function`, `class`)
- `content_path`: File or directory path
- `content`: Text content that was embedded
- `embedding`: Vector embedding (1536 dimensions for OpenAI)
- `metadata`: Additional metadata (language, size, etc.)

## Enterprise Tables

### API Keys (`api_keys`)

Organization-scoped API keys for enterprise users.

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read'],
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_keys_org_id ON api_keys(org_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
```

**Fields:**
- `id`: Unique API key identifier
- `org_id`: Organization owner
- `name`: Human-readable key name
- `key_hash`: Hashed API key for verification
- `key_prefix`: First 8 characters for identification
- `permissions`: Array of permissions (`read`, `write`, `admin`)
- `last_used_at`: Last usage timestamp
- `expires_at`: Expiration timestamp (optional)

### Weight Profiles (`weight_profiles`)

Custom scoring weight configurations.

```sql
CREATE TABLE weight_profiles (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weights JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_weight_profiles_org_id ON weight_profiles(org_id);
CREATE INDEX idx_weight_profiles_is_default ON weight_profiles(is_default);
```

**Fields:**
- `id`: Unique profile identifier
- `org_id`: Organization owner
- `name`: Profile name
- `description`: Optional description
- `weights`: JSON object with category weights
- `is_default`: Whether this is the default profile

### Data Retention Policies (`data_retention_policies`)

Configurable data retention rules.

```sql
CREATE TABLE data_retention_policies (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data_types TEXT[] NOT NULL,
  retention_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_data_retention_org_id ON data_retention_policies(org_id);
CREATE INDEX idx_data_retention_active ON data_retention_policies(is_active);
```

**Fields:**
- `id`: Unique policy identifier
- `org_id`: Organization owner
- `name`: Policy name
- `data_types`: Array of data types to retain
- `retention_days`: Retention period in days
- `is_active`: Whether policy is active

### Audit Logs (`audit_logs`)

Comprehensive audit trail for enterprise compliance.

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT cuid(),
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
```

**Fields:**
- `id`: Unique log entry identifier
- `org_id`: Organization context
- `user_id`: User who performed the action
- `action`: Action performed (e.g., `project.created`)
- `resource_type`: Type of resource affected
- `resource_id`: ID of affected resource
- `ip_address`: Client IP address
- `user_agent`: Client user agent
- `metadata`: Additional context data

## Database Functions and Triggers

### Updated Timestamps

Automatic timestamp updates on record changes:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON orgs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (repeat for all tables)
```

### Vector Search Functions

Semantic search using pgvector:

```sql
-- Find similar content
CREATE OR REPLACE FUNCTION find_similar_content(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  id text,
  repo_id text,
  content text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.repo_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  FROM embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > similarity_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

## Performance Optimizations

### Partitioning

Large tables can be partitioned for better performance:

```sql
-- Partition audit_logs by month
CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_logs_y2024m02 PARTITION OF audit_logs
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

### Materialized Views

Pre-computed aggregations for dashboards:

```sql
CREATE MATERIALIZED VIEW org_stats AS
SELECT 
  o.id as org_id,
  o.name,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT r.id) as repo_count,
  AVG(s.score) as avg_score,
  MAX(a.created_at) as last_analysis
FROM orgs o
LEFT JOIN projects p ON p.org_id = o.id
LEFT JOIN analyses a ON a.project_id = p.id
LEFT JOIN repos r ON r.analysis_id = a.id
LEFT JOIN scores s ON s.repo_id = r.id
GROUP BY o.id, o.name;

-- Refresh periodically
CREATE INDEX idx_org_stats_org_id ON org_stats(org_id);
```

## Data Retention and Cleanup

### Automated Cleanup Jobs

```sql
-- Clean up old analyses
DELETE FROM analyses 
WHERE created_at < NOW() - INTERVAL '90 days'
  AND status IN ('completed', 'failed');

-- Clean up orphaned embeddings
DELETE FROM embeddings 
WHERE repo_id NOT IN (SELECT id FROM repos);

-- Archive old audit logs
INSERT INTO audit_logs_archive 
SELECT * FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '1 year';
```

## Migration Strategy

### Schema Versioning

Migrations are managed by Prisma:

```bash
# Create migration
pnpm db:migration:create --name add_enterprise_features

# Apply migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate
```

### Backward Compatibility

- Add new columns as nullable initially
- Use feature flags for new functionality
- Maintain API versioning for breaking changes
- Implement gradual rollouts for schema changes

## Monitoring and Maintenance

### Key Metrics to Monitor

- Table sizes and growth rates
- Index usage and performance
- Query execution times
- Connection pool utilization
- Vector search performance

### Regular Maintenance Tasks

- Update table statistics: `ANALYZE;`
- Rebuild indexes: `REINDEX INDEX CONCURRENTLY idx_name;`
- Vacuum tables: `VACUUM ANALYZE table_name;`
- Monitor slow queries: `pg_stat_statements`
- Check for unused indexes: `pg_stat_user_indexes`
