# DevAtlas Deployment & Running Guide

## 🚀 **Quick Start Guide**

This guide provides step-by-step instructions for deploying and running DevAtlas in different environments.

## 📋 **Prerequisites**

### **System Requirements**
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 10GB free space
- **Network**: Internet connection for external APIs

### **Software Requirements**
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: Version 2.30+
- **Node.js**: Version 18+ (for local development)
- **Python**: Version 3.9+ (for local development)

---

## 🏗️ **Development Environment Setup**

### **Step 1: Clone Repository**
```bash
# Clone the repository
git clone https://github.com/your-org/devatlas.git
cd devatlas

# Verify structure
ls -la
# Expected: README.md, docker-compose.yml, frontend/, backend/, worker/, database/
```

### **Step 2: Environment Configuration**
```bash
# Create environment files
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp worker/.env.example worker/.env

# Edit configuration files
nano .env
nano frontend/.env
nano backend/.env
nano worker/.env
```

### **Step 3: Start Development Environment**
```bash
# Start all services
docker-compose up --build

# Check services are running
docker-compose ps
# Expected: All services show "Up" status

# Verify endpoints
curl http://localhost:8080/api/health
curl http://localhost:3000
```

### **Step 4: Initialize Database**
```bash
# Run database migrations
docker-compose exec postgres psql -U postgres -d devatlas -f /docker-entrypoint-initdb.d/schema.sql

# Verify database setup
docker-compose exec postgres psql -U postgres -d devatlas -c "\dt"
# Expected: Tables listed (repositories, analyses, etc.)
```

---

## 🚀 **Phase 1: MVP Deployment**

### **Local Development**
```bash
# 1. Start Phase 1 services
docker-compose up --build

# 2. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080/api/health
# Database: localhost:5432

# 3. Test basic functionality
curl -X POST http://localhost:8080/api/repositories \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "https://github.com/facebook/react"}'
```

### **Production Deployment (Phase 1)**
```bash
# 1. Use production Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# 2. Set production environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://user:pass@db:5432/devatlas

# 3. Run production build
docker-compose -f docker-compose.prod.yml exec frontend npm run build
docker-compose -f docker-compose.prod.yml exec backend npm run build
```

---

## 🚀 **Phase 2: Enhanced Features Deployment**

### **Prerequisites for Phase 2**
```bash
# 1. OpenAI API Key
export OPENAI_API_KEY=your_openai_api_key_here

# 2. Update environment files
echo "OPENAI_API_KEY=your_openai_api_key_here" >> backend/.env
echo "OPENAI_API_KEY=your_openai_api_key_here" >> worker/.env
```

### **Deployment Steps**
```bash
# 1. Update dependencies
cd backend && npm install
cd ../worker && pip install -r requirements.txt

# 2. Run database migration
docker-compose exec postgres psql -U postgres -d devatlas -f /docker-entrypoint-initdb.d/phase2_migration.sql

# 3. Start enhanced services
docker-compose up --build

# 4. Test enhanced features
curl -X POST http://localhost:8080/api/test-openai \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 🚀 **Phase 3: Production SaaS Deployment**

### **Prerequisites for Phase 3**
```bash
# 1. Stripe Account Setup
# - Create Stripe account
# - Get API keys from dashboard
# - Set up webhook endpoints

# 2. Redis Setup
# - Install Redis server
# - Configure Redis for production

# 3. SSL Certificate
# - Obtain SSL certificate
# - Configure HTTPS
```

### **Environment Variables for Phase 3**
```bash
# Core configuration
NODE_ENV=production
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=postgresql://user:pass@db:5432/devatlas

# Stripe configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis configuration
REDIS_HOST=redis
REDIS_PORT=6379

# OpenAI configuration
OPENAI_API_KEY=your_openai_api_key_here

# Frontend configuration
FRONTEND_URL=https://your-domain.com
```

### **Production Deployment Steps**
```bash
# 1. Clone repository on production server
git clone https://github.com/your-org/devatlas.git
cd devatlas

# 2. Set up environment
cp .env.example .env
# Edit .env with production values

# 3. Start production services
docker-compose -f docker-compose.prod.yml up -d

# 4. Run database migrations
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d devatlas -f /docker-entrypoint-initdb.d/phase3_migration.sql

# 5. Verify deployment
curl https://your-domain.com/api/health
```

---

## 🐳 **Docker Configuration**

### **Development Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: devatlas
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/devatlas
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
    command: npm run dev

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    command: npm run dev

  worker:
    build: ./worker
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/devatlas
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./worker:/app
    command: python main.py

volumes:
  postgres_data:
```

### **Production Docker Compose**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - VITE_API_BASE=${API_BASE_URL}
    restart: unless-stopped

  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 🔧 **Production Dockerfiles**

### **Backend Production Dockerfile**
```dockerfile
# backend/Dockerfile.prod
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 8080

# Start application
CMD ["npm", "start"]
```

### **Frontend Production Dockerfile**
```dockerfile
# frontend/Dockerfile.prod
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### **Worker Production Dockerfile**
```dockerfile
# worker/Dockerfile.prod
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Start worker
CMD ["python", "main.py"]
```

---

## 🌐 **Cloud Deployment Options**

### **Option 1: Railway**
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Deploy
railway up

# 4. Set environment variables
railway variables set DATABASE_URL=postgresql://...
railway variables set OPENAI_API_KEY=...
```

### **Option 2: Render**
```bash
# 1. Connect GitHub repository
# 2. Set build command: npm run build
# 3. Set start command: npm start
# 4. Configure environment variables
# 5. Deploy
```

### **Option 3: DigitalOcean App Platform**
```bash
# 1. Create app from GitHub
# 2. Configure services (web, worker, database)
# 3. Set environment variables
# 4. Deploy
```

### **Option 4: AWS ECS**
```bash
# 1. Create ECS cluster
# 2. Create task definitions
# 3. Set up load balancer
# 4. Configure RDS database
# 5. Deploy services
```

---

## 🔒 **Security Configuration**

### **SSL/TLS Setup**
```bash
# 1. Obtain SSL certificate (Let's Encrypt)
certbot certonly --webroot -w /var/www/html -d your-domain.com

# 2. Configure nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **Environment Security**
```bash
# 1. Use strong passwords
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)

# 2. Restrict database access
# Only allow connections from application servers

# 3. Use secrets management
# Store sensitive data in environment variables or secrets manager
```

---

## 📊 **Monitoring & Logging**

### **Application Monitoring**
```bash
# 1. Set up health checks
curl http://localhost:8080/api/health

# 2. Monitor logs
docker-compose logs -f backend
docker-compose logs -f worker

# 3. Set up alerts
# Monitor API response times
# Monitor error rates
# Monitor resource usage
```

### **Database Monitoring**
```bash
# 1. Monitor database performance
docker-compose exec postgres psql -U postgres -d devatlas -c "
SELECT * FROM pg_stat_activity;
"

# 2. Monitor disk usage
docker-compose exec postgres df -h

# 3. Set up backups
# Regular database backups
# Test restore procedures
```

---

## 🔄 **Backup & Recovery**

### **Database Backup**
```bash
# 1. Create backup
docker-compose exec postgres pg_dump -U postgres devatlas > backup.sql

# 2. Restore backup
docker-compose exec -T postgres psql -U postgres devatlas < backup.sql

# 3. Automated backups
# Set up cron job for daily backups
0 2 * * * docker-compose exec postgres pg_dump -U postgres devatlas > /backups/backup_$(date +\%Y\%m\%d).sql
```

### **Application Backup**
```bash
# 1. Backup configuration
tar -czf config_backup.tar.gz .env* docker-compose*.yml

# 2. Backup data volumes
docker run --rm -v devatlas_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Issue 1: Docker Compose Fails to Start**
```bash
# Solution
docker-compose down
docker system prune -f
docker-compose up --build
```

#### **Issue 2: Database Connection Errors**
```bash
# Solution
docker-compose restart postgres
# Wait 30 seconds
docker-compose up backend
```

#### **Issue 3: Port Conflicts**
```bash
# Solution
# Check what's using the port
lsof -i :3000
lsof -i :8080
lsof -i :5432

# Kill conflicting processes
kill -9 PID
```

#### **Issue 4: Memory Issues**
```bash
# Solution
# Increase Docker memory limit
# Check system resources
free -h
df -h
```

### **Debug Commands**
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs worker

# Execute commands in containers
docker-compose exec backend bash
docker-compose exec postgres psql -U postgres -d devatlas

# Check resource usage
docker stats
```

---

## 📝 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL certificates obtained
- [ ] Domain configured
- [ ] Monitoring set up

### **Deployment**
- [ ] Services start successfully
- [ ] Health checks pass
- [ ] Database connections work
- [ ] API endpoints respond
- [ ] Frontend loads correctly

### **Post-Deployment**
- [ ] Test all functionality
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify backups
- [ ] Update documentation

---

## 🎯 **Quick Commands Reference**

### **Development**
```bash
# Start development environment
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart backend
```

### **Production**
```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Stop production services
docker-compose -f docker-compose.prod.yml down

# Update production
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### **Database**
```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d devatlas

# Run migrations
docker-compose exec postgres psql -U postgres -d devatlas -f /docker-entrypoint-initdb.d/schema.sql

# Create backup
docker-compose exec postgres pg_dump -U postgres devatlas > backup.sql
```

This deployment guide ensures DevAtlas can be successfully deployed and run in any environment, from local development to production SaaS deployment.
