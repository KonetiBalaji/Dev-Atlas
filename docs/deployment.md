# DevAtlas Deployment Guide

## Overview

DevAtlas supports multiple deployment strategies:

1. **Docker Compose** (Single-node development/staging)
2. **Kubernetes** (Production clusters)
3. **Cloud Platforms** (AWS, GCP, Azure)

## Docker Compose Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ disk space

### Quick Deploy

```bash
# Clone repository
git clone https://github.com/your-org/devatlas.git
cd devatlas

# Configure environment
cp .env.example .env.production
# Edit .env.production with production values

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose exec api pnpm db:migrate
```

### Services

The production Docker Compose includes:

- **API Server** (port 3000)
- **Frontend** (port 3001)
- **Background Worker**
- **PostgreSQL** (with pgvector)
- **Redis**
- **MinIO**
- **Traefik** (reverse proxy)

## Kubernetes Deployment

### Prerequisites

- Kubernetes 1.24+
- kubectl configured
- Helm 3.0+

### Using Helm Charts

```bash
# Add DevAtlas Helm repository
helm repo add devatlas https://charts.devatlas.dev
helm repo update

# Install with custom values
helm install devatlas devatlas/devatlas \
  --namespace devatlas \
  --create-namespace \
  --values values.prod.yaml
```

### Manual Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap.yaml
kubectl apply -f infra/k8s/secrets.yaml
kubectl apply -f infra/k8s/postgres.yaml
kubectl apply -f infra/k8s/redis.yaml
kubectl apply -f infra/k8s/minio.yaml
kubectl apply -f infra/k8s/api.yaml
kubectl apply -f infra/k8s/web.yaml
kubectl apply -f infra/k8s/worker.yaml
kubectl apply -f infra/k8s/ingress.yaml
```

## Cloud Platform Deployment

### AWS Deployment (Terraform)

```bash
# Navigate to Terraform directory
cd infra/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file="environments/prod.tfvars"

# Apply infrastructure
terraform apply -var-file="environments/prod.tfvars"

# Get cluster credentials
aws eks update-kubeconfig --region us-west-2 --name devatlas-prod

# Deploy application
helm install devatlas devatlas/devatlas \
  --namespace devatlas \
  --values values.aws.yaml
```

### GCP Deployment

```bash
# Set up GCP project
gcloud config set project your-project-id

# Create GKE cluster
gcloud container clusters create devatlas-prod \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2

# Get cluster credentials
gcloud container clusters get-credentials devatlas-prod --zone us-central1-a

# Deploy application
helm install devatlas devatlas/devatlas \
  --namespace devatlas \
  --values values.gcp.yaml
```

### Azure Deployment

```bash
# Create resource group
az group create --name devatlas-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group devatlas-rg \
  --name devatlas-prod \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3

# Get cluster credentials
az aks get-credentials --resource-group devatlas-rg --name devatlas-prod

# Deploy application
helm install devatlas devatlas/devatlas \
  --namespace devatlas \
  --values values.azure.yaml
```

## Configuration

### Environment Variables

#### Production Environment (.env.production)

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/devatlas
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://redis:6379
REDIS_CLUSTER_NODES=redis-1:6379,redis-2:6379,redis-3:6379

# Object Storage
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=devatlas-prod

# GitHub Integration
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Authentication
JWT_SECRET=your-jwt-secret-256-bits
JWT_EXPIRES_IN=24h

# LLM Integration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Observability
SENTRY_DSN=https://...@sentry.io/...
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318

# Security
CORS_ORIGIN=https://app.devatlas.dev
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Kubernetes Values (values.prod.yaml)

```yaml
global:
  imageRegistry: ghcr.io
  imageTag: latest
  
api:
  replicaCount: 3
  image:
    repository: devatlas/api
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1000m
      memory: 2Gi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

web:
  replicaCount: 2
  image:
    repository: devatlas/web
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

worker:
  replicaCount: 2
  image:
    repository: devatlas/worker
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi

postgresql:
  enabled: true
  auth:
    database: devatlas
    username: devatlas
    password: secure-password
  primary:
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 1000m
        memory: 2Gi

redis:
  enabled: true
  auth:
    enabled: true
    password: secure-password
  master:
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: app.devatlas.dev
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: devatlas-tls
      hosts:
        - app.devatlas.dev
```

## Database Setup

### Migrations

```bash
# Run migrations in production
kubectl exec -it deployment/devatlas-api -- pnpm db:migrate

# Or using Docker Compose
docker-compose exec api pnpm db:migrate
```

### Backup and Restore

```bash
# Create database backup
kubectl exec -it deployment/devatlas-postgres -- pg_dump -U devatlas devatlas > backup.sql

# Restore from backup
kubectl exec -i deployment/devatlas-postgres -- psql -U devatlas devatlas < backup.sql
```

## Monitoring and Observability

### Health Checks

- **API Health**: `GET /health`
- **Database Health**: `GET /health/db`
- **Redis Health**: `GET /health/redis`
- **Queue Health**: `GET /health/queues`

### Metrics

Prometheus metrics available at `/metrics`:

- HTTP request duration and count
- Database connection pool stats
- Queue job processing stats
- Custom business metrics

### Logging

Structured JSON logging with correlation IDs:

```json
{
  "timestamp": "2023-12-01T10:00:00.000Z",
  "level": "info",
  "message": "Analysis completed",
  "correlationId": "req-123",
  "userId": "user-456",
  "projectId": "proj-789",
  "duration": 1500
}
```

### Alerting

Recommended alerts:

- API response time > 2s
- Error rate > 5%
- Database connections > 80%
- Queue processing lag > 5min
- Disk usage > 85%

## Security Considerations

### Network Security

- Use TLS 1.3 for all external communications
- Implement network policies in Kubernetes
- Restrict database access to application pods only
- Use private subnets for databases and internal services

### Secrets Management

```bash
# Kubernetes secrets
kubectl create secret generic devatlas-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="..." \
  --from-literal=stripe-secret="..."

# AWS Secrets Manager
aws secretsmanager create-secret \
  --name devatlas/prod/database \
  --secret-string '{"url":"postgresql://..."}'
```

### RBAC Configuration

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: devatlas
  name: devatlas-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch"]
```

## Scaling

### Horizontal Scaling

```bash
# Scale API servers
kubectl scale deployment devatlas-api --replicas=5

# Scale workers based on queue depth
kubectl autoscale deployment devatlas-worker \
  --min=2 --max=10 \
  --cpu-percent=70
```

### Vertical Scaling

```bash
# Increase resource limits
kubectl patch deployment devatlas-api -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","resources":{"limits":{"cpu":"2000m","memory":"4Gi"}}}]}}}}'
```

### Database Scaling

```bash
# Create read replicas
kubectl apply -f infra/k8s/postgres-replica.yaml

# Configure connection pooling
# Update DATABASE_URL to use PgBouncer
```

## Troubleshooting

### Common Issues

1. **Pod Startup Issues**
   ```bash
   kubectl describe pod devatlas-api-xxx
   kubectl logs devatlas-api-xxx
   ```

2. **Database Connection Issues**
   ```bash
   kubectl exec -it deployment/devatlas-api -- pnpm db:status
   ```

3. **Queue Processing Issues**
   ```bash
   kubectl logs deployment/devatlas-worker
   ```

### Performance Issues

1. **API Response Time**
   - Check database query performance
   - Review N+1 query patterns
   - Analyze slow query logs

2. **Queue Processing**
   - Monitor queue depth
   - Check worker resource usage
   - Review job failure patterns

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # Point-in-time recovery
   kubectl apply -f infra/k8s/postgres-restore.yaml
   ```

2. **Application Recovery**
   ```bash
   # Rolling restart
   kubectl rollout restart deployment/devatlas-api
   kubectl rollout restart deployment/devatlas-worker
   ```

## Maintenance

### Updates

```bash
# Update application
helm upgrade devatlas devatlas/devatlas \
  --namespace devatlas \
  --values values.prod.yaml \
  --set image.tag=v1.2.0

# Update infrastructure
terraform plan -var-file="environments/prod.tfvars"
terraform apply -var-file="environments/prod.tfvars"
```

### Backup Strategy

- **Database**: Daily automated backups with 30-day retention
- **Object Storage**: Cross-region replication
- **Configuration**: Version-controlled infrastructure as code

### Disaster Recovery

- **RTO**: 4 hours (Recovery Time Objective)
- **RPO**: 1 hour (Recovery Point Objective)
- **Multi-region deployment** for high availability
- **Automated failover** procedures
