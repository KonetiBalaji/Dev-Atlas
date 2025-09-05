# DevAtlas Troubleshooting Guide

## Common Issues and Solutions

### Development Environment Issues

#### 1. Database Connection Errors

**Problem**: `ECONNREFUSED` or `Connection refused` errors when connecting to PostgreSQL.

**Solutions**:

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL container
docker-compose up -d postgres

# Check database logs
docker-compose logs postgres

# Test connection manually
psql postgresql://postgres:password@localhost:5432/devatlas

# Reset database if corrupted
docker-compose down -v
docker-compose up -d postgres
pnpm db:migrate
```

#### 2. Redis Connection Issues

**Problem**: Redis connection timeouts or `ECONNREFUSED` errors.

**Solutions**:

```bash
# Check Redis status
docker ps | grep redis
redis-cli ping

# Restart Redis
docker-compose restart redis

# Clear Redis data if needed
redis-cli flushall

# Check Redis logs
docker-compose logs redis
```

#### 3. Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::3000`

**Solutions**:

```bash
# Find process using the port
lsof -i :3000
netstat -tulpn | grep :3000

# Kill the process (replace PID)
kill -9 <PID>

# Or use different ports
PORT=3001 pnpm dev:api
```

#### 4. Node.js Version Issues

**Problem**: Package installation or runtime errors due to Node.js version mismatch.

**Solutions**:

```bash
# Check Node.js version
node --version

# Use Node Version Manager
nvm install 18
nvm use 18

# Or use fnm
fnm install 18
fnm use 18

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install
```

#### 5. pnpm Installation Issues

**Problem**: `pnpm: command not found` or package installation failures.

**Solutions**:

```bash
# Install pnpm globally
npm install -g pnpm

# Or use corepack (Node 16.10+)
corepack enable
corepack prepare pnpm@latest --activate

# Clear pnpm cache
pnpm store prune
pnpm install --frozen-lockfile
```

### Application Runtime Issues

#### 1. GitHub App Authentication Failures

**Problem**: `GitHub App authentication failed` or webhook delivery issues.

**Solutions**:

```bash
# Check GitHub App configuration
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  https://api.github.com/app

# Verify private key format
echo "$GITHUB_APP_PRIVATE_KEY" | openssl rsa -check

# Test webhook endpoint
curl -X POST http://localhost:3000/webhooks/github \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check webhook logs
docker-compose logs api | grep webhook
```

#### 2. LLM Integration Issues

**Problem**: OpenAI API errors or timeout issues.

**Solutions**:

```bash
# Test OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check token limits and usage
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Use alternative models
export OPENAI_MODEL=gpt-3.5-turbo
export OPENAI_MAX_TOKENS=2000

# Enable detailed logging
DEBUG=devatlas:ai pnpm dev
```

#### 3. Queue Processing Issues

**Problem**: Jobs stuck in queue or failing repeatedly.

**Solutions**:

```bash
# Check queue status
redis-cli
> LLEN bull:analysis:waiting
> LLEN bull:analysis:failed

# Clear failed jobs
> DEL bull:analysis:failed

# Monitor queue processing
docker-compose logs worker

# Restart worker
docker-compose restart worker

# Check job details
> LRANGE bull:analysis:failed 0 -1
```

#### 4. File System Permission Issues

**Problem**: `EACCES` errors when reading/writing files during analysis.

**Solutions**:

```bash
# Check file permissions
ls -la /tmp/devatlas-analysis/

# Fix permissions
chmod -R 755 /tmp/devatlas-analysis/
chown -R $USER:$USER /tmp/devatlas-analysis/

# Use Docker volume mounts
docker-compose exec worker ls -la /app/temp/

# Clean up temporary files
rm -rf /tmp/devatlas-analysis/*
```

### Production Issues

#### 1. High Memory Usage

**Problem**: Application consuming excessive memory, causing OOM kills.

**Diagnostics**:

```bash
# Check memory usage
kubectl top pods -n devatlas
docker stats

# Get heap dump (Node.js)
kill -USR2 <PID>
# Or use --inspect flag and Chrome DevTools

# Monitor memory over time
kubectl exec -it deployment/devatlas-api -- node -e "
  setInterval(() => {
    const used = process.memoryUsage();
    console.log(JSON.stringify(used));
  }, 5000);
"
```

**Solutions**:

```bash
# Increase memory limits
kubectl patch deployment devatlas-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"limits":{"memory":"2Gi"}}}]}}}}'

# Tune Node.js memory settings
NODE_OPTIONS="--max-old-space-size=1536"

# Enable garbage collection logging
NODE_OPTIONS="--trace-gc --trace-gc-verbose"

# Implement memory monitoring
# Add to application code:
setInterval(() => {
  if (process.memoryUsage().heapUsed > 1.5e9) {
    console.error('High memory usage detected');
  }
}, 30000);
```

#### 2. Database Performance Issues

**Problem**: Slow queries, connection pool exhaustion, or deadlocks.

**Diagnostics**:

```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions**:

```bash
# Increase connection pool size
DATABASE_POOL_SIZE=20

# Add database indexes
pnpm db:migration:create --name add_performance_indexes

# Enable query logging
# In postgresql.conf:
log_statement = 'all'
log_min_duration_statement = 1000

# Use read replicas
DATABASE_READ_URL=postgresql://readonly@replica:5432/devatlas

# Implement query caching
REDIS_QUERY_CACHE=true
REDIS_QUERY_TTL=300
```

#### 3. API Rate Limiting Issues

**Problem**: API requests being rate limited or blocked.

**Diagnostics**:

```bash
# Check rate limit headers
curl -I https://api.devatlas.dev/v1/projects

# Monitor rate limit metrics
kubectl logs deployment/devatlas-api | grep "rate.limit"

# Check Redis rate limit data
redis-cli
> KEYS rate-limit:*
> TTL rate-limit:user:123
```

**Solutions**:

```bash
# Adjust rate limits
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=1000       # requests per window

# Implement user-specific limits
RATE_LIMIT_PREMIUM_MAX=5000

# Use distributed rate limiting
RATE_LIMIT_STORE=redis
RATE_LIMIT_KEY_GENERATOR=ip+user

# Implement graceful degradation
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=true
```

#### 4. Webhook Delivery Failures

**Problem**: GitHub webhooks not being received or processed.

**Diagnostics**:

```bash
# Check webhook endpoint
curl -X POST https://api.devatlas.dev/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"test": true}'

# Verify webhook secret
echo -n "payload" | openssl dgst -sha256 -hmac "$GITHUB_WEBHOOK_SECRET"

# Check GitHub webhook deliveries
# Go to GitHub App settings > Advanced > Recent Deliveries
```

**Solutions**:

```bash
# Update webhook URL
# GitHub App settings > Webhook URL

# Verify SSL certificate
curl -I https://api.devatlas.dev

# Implement webhook retry logic
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY=1000

# Add webhook validation
WEBHOOK_VERIFY_SIGNATURE=true
WEBHOOK_ALLOWED_IPS=192.30.252.0/22,185.199.108.0/22
```

### Infrastructure Issues

#### 1. Kubernetes Pod Crashes

**Problem**: Pods crashing with `CrashLoopBackOff` or `OOMKilled` status.

**Diagnostics**:

```bash
# Check pod status
kubectl get pods -n devatlas
kubectl describe pod devatlas-api-xxx

# Check logs
kubectl logs devatlas-api-xxx --previous
kubectl logs devatlas-api-xxx -f

# Check resource usage
kubectl top pod devatlas-api-xxx
```

**Solutions**:

```bash
# Increase resource limits
kubectl patch deployment devatlas-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"limits":{"cpu":"1000m","memory":"2Gi"}}}]}}}}'

# Add health checks
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

# Implement graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
```

#### 2. Service Discovery Issues

**Problem**: Services unable to communicate with each other.

**Diagnostics**:

```bash
# Test service connectivity
kubectl exec -it deployment/devatlas-api -- nslookup devatlas-postgres
kubectl exec -it deployment/devatlas-api -- telnet devatlas-redis 6379

# Check service endpoints
kubectl get endpoints -n devatlas
kubectl describe service devatlas-postgres
```

**Solutions**:

```bash
# Verify service selectors
kubectl get service devatlas-api -o yaml
kubectl get deployment devatlas-api -o yaml

# Check network policies
kubectl get networkpolicy -n devatlas
kubectl describe networkpolicy devatlas-policy

# Update service configuration
# Use fully qualified domain names
DATABASE_URL=postgresql://user:pass@devatlas-postgres.devatlas.svc.cluster.local:5432/devatlas
```

#### 3. Ingress/Load Balancer Issues

**Problem**: External traffic not reaching the application.

**Diagnostics**:

```bash
# Check ingress status
kubectl get ingress -n devatlas
kubectl describe ingress devatlas-ingress

# Test ingress controller
kubectl get pods -n ingress-nginx
kubectl logs deployment/ingress-nginx-controller -n ingress-nginx

# Check SSL certificate
kubectl get certificate -n devatlas
kubectl describe certificate devatlas-tls
```

**Solutions**:

```bash
# Update ingress annotations
annotations:
  nginx.ingress.kubernetes.io/proxy-body-size: "10m"
  nginx.ingress.kubernetes.io/proxy-read-timeout: "600"

# Verify DNS configuration
nslookup app.devatlas.dev

# Check certificate issuer
kubectl get clusterissuer letsencrypt-prod
kubectl describe clusterissuer letsencrypt-prod
```

### Monitoring and Alerting Issues

#### 1. Missing Metrics

**Problem**: Prometheus metrics not being collected or displayed.

**Solutions**:

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics

# Verify Prometheus configuration
kubectl get configmap prometheus-config -o yaml

# Check ServiceMonitor
kubectl get servicemonitor -n devatlas
kubectl describe servicemonitor devatlas-api

# Add custom metrics
const promClient = require('prom-client');
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});
```

#### 2. Alert Fatigue

**Problem**: Too many false positive alerts or alert spam.

**Solutions**:

```yaml
# Tune alert thresholds
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m  # Wait 5 minutes before firing

# Add alert grouping
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m

# Implement alert suppression
- alert: MaintenanceMode
  expr: up{job="maintenance"} == 1
  labels:
    suppress: "all"
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_analyses_project_id_created_at 
ON analyses(project_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_repos_org_id_updated_at 
ON repos(org_id, updated_at DESC);

-- Optimize queries
-- Before:
SELECT * FROM analyses WHERE project_id = $1 ORDER BY created_at DESC;

-- After:
SELECT id, status, created_at, summary 
FROM analyses 
WHERE project_id = $1 
ORDER BY created_at DESC 
LIMIT 10;
```

### Application Optimization

```javascript
// Implement caching
const cache = new Map();
async function getCachedResult(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = await expensiveOperation(key);
  cache.set(key, result);
  return result;
}

// Batch database queries
const analyses = await prisma.analysis.findMany({
  where: { id: { in: analysisIds } },
  include: { repos: true }
});

// Use connection pooling
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Security Troubleshooting

### Authentication Issues

```bash
# Verify JWT token
echo "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." | base64 -d

# Check token expiration
node -e "
const jwt = require('jsonwebtoken');
const token = 'your-token-here';
console.log(jwt.decode(token));
"

# Test API authentication
curl -H "Authorization: Bearer <token>" \
  https://api.devatlas.dev/v1/projects
```

### CORS Issues

```javascript
// Configure CORS properly
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### SSL/TLS Issues

```bash
# Check certificate validity
openssl s_client -connect api.devatlas.dev:443 -servername api.devatlas.dev

# Verify certificate chain
curl -vI https://api.devatlas.dev

# Test SSL configuration
nmap --script ssl-enum-ciphers -p 443 api.devatlas.dev
```

## Getting Help

### Log Collection

```bash
# Collect all logs
kubectl logs deployment/devatlas-api > api.log
kubectl logs deployment/devatlas-worker > worker.log
kubectl logs deployment/devatlas-web > web.log

# Or using Docker Compose
docker-compose logs > all-services.log
```

### System Information

```bash
# Kubernetes cluster info
kubectl cluster-info
kubectl get nodes -o wide
kubectl top nodes

# Docker system info
docker system info
docker system df
```

### Support Channels

1. **GitHub Issues**: Report bugs and feature requests
2. **Discord Community**: Real-time help and discussions  
3. **Documentation**: Check docs.devatlas.dev for updates
4. **Enterprise Support**: Contact support@devatlas.dev for priority assistance

### Creating Bug Reports

Include the following information:

1. **Environment**: Development/staging/production
2. **Version**: Application version and deployment method
3. **Steps to reproduce**: Detailed reproduction steps
4. **Expected behavior**: What should happen
5. **Actual behavior**: What actually happens
6. **Logs**: Relevant log entries
7. **Configuration**: Sanitized environment variables
8. **System info**: OS, Node.js version, resource constraints
