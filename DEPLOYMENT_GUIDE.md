# InForm-V2 Deployment Guide

Complete guide for deploying InForm-V2 to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Options](#deployment-options)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Services

- **Node.js**: v20.x or higher
- **PostgreSQL**: v16 or higher
- **Redis**: v7 or higher
- **Package Manager**: pnpm (recommended) or npm

### External Services (Optional but Recommended)

- **Email Provider**: Postmark account for transactional emails
- **CAPTCHA**: Cloudflare Turnstile for bot protection
- **Hosting**: Vercel, AWS, DigitalOcean, or similar

### Development Tools

- Git
- Docker & Docker Compose (for local testing)
- SSL certificate for production domain

---

## Pre-Deployment Checklist

### Security Checklist

- [ ] Generate strong `AUTH_SESSION_SECRET` (32+ characters, cryptographically random)
- [ ] Configure production `DATABASE_URL` with SSL enabled
- [ ] Set up Redis with authentication enabled
- [ ] Obtain Postmark API token for email delivery
- [ ] Configure Cloudflare Turnstile keys
- [ ] Review and update CORS settings if needed
- [ ] Enable HTTPS/SSL for production domain
- [ ] Configure rate limiting thresholds
- [ ] Review database connection pool settings
- [ ] Set up database backups
- [ ] Configure monitoring and alerting

### Code Checklist

- [ ] Run `pnpm typecheck` - ensure no TypeScript errors
- [ ] Run `pnpm lint` - fix all linting issues
- [ ] Run `pnpm test` - all tests passing
- [ ] Review and update `.env.example` with all required variables
- [ ] Ensure all migrations are committed
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set `NODE_ENV=production`

---

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Pros**: Zero-config, automatic scaling, edge network, built-in CI/CD
**Cons**: Requires external database and Redis

### Option 2: Docker Container

**Pros**: Portable, consistent environments, easy scaling
**Cons**: Requires container orchestration knowledge

### Option 3: Traditional VPS (DigitalOcean, AWS EC2, etc.)

**Pros**: Full control, cost-effective for predictable traffic
**Cons**: Manual setup, requires DevOps knowledge

### Option 4: Platform-as-a-Service (Railway, Render, Fly.io)

**Pros**: Easy setup, managed infrastructure
**Cons**: Less control, potential vendor lock-in

---

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database - Use production PostgreSQL with SSL
DATABASE_URL=postgresql://username:password@host:5432/inform_prod?sslmode=require

# Auth - CRITICAL: Generate a secure random string
AUTH_SESSION_SECRET=your-secure-32-char-random-string-here

# Email - Postmark for transactional emails
POSTMARK_API_TOKEN=your-production-postmark-token

# CAPTCHA - Cloudflare Turnstile
TURNSTILE_SITE_KEY=your-production-site-key
TURNSTILE_SECRET_KEY=your-production-secret-key

# Redis - Use production Redis with authentication
REDIS_URL=redis://:password@host:6379

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production

# Seed Data (for initial setup only)
SEED_SUPERADMIN_EMAIL=admin@yourdomain.com
SEED_SUPERADMIN_PASSWORD=secure-initial-password-change-immediately
```

### Generating Secure Secrets

```bash
# Generate AUTH_SESSION_SECRET (32+ characters)
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Database URL Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require&connection_limit=10
```

**Important**: Always use `sslmode=require` for production databases.

---

## Database Setup

### 1. Provision Production Database

#### Option A: Managed PostgreSQL (Recommended)

- **Vercel Postgres**: Integrated with Vercel deployments
- **Supabase**: Free tier available, good for startups
- **AWS RDS**: Enterprise-grade, highly available
- **DigitalOcean Managed Database**: Cost-effective
- **Neon**: Serverless PostgreSQL with generous free tier

#### Option B: Self-Hosted PostgreSQL

```bash
# Install PostgreSQL 16
sudo apt update
sudo apt install postgresql-16

# Create database and user
sudo -u postgres psql
CREATE DATABASE inform_prod;
CREATE USER inform_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE inform_prod TO inform_user;
\q

# Enable SSL (recommended)
# Edit postgresql.conf:
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
```

### 2. Run Database Migrations

```bash
# Set DATABASE_URL to production database
export DATABASE_URL="postgresql://user:pass@host:5432/inform_prod?sslmode=require"

# Run migrations
pnpm prisma migrate deploy

# Verify migration status
pnpm prisma migrate status
```

### 3. Seed Initial Data (First Deployment Only)

```bash
# Set seed credentials in .env
export SEED_SUPERADMIN_EMAIL=admin@yourdomain.com
export SEED_SUPERADMIN_PASSWORD=secure-password

# Run seed script
pnpm db:seed
```

**IMPORTANT**: Change the super admin password immediately after first login!

### 4. Database Backup Strategy

```bash
# Automated daily backups (cron job example)
0 2 * * * pg_dump -h host -U user -d inform_prod | gzip > /backups/inform_$(date +\%Y\%m\%d).sql.gz

# Retention: Keep 30 days of backups
find /backups -name "inform_*.sql.gz" -mtime +30 -delete
```

---

## Deployment Steps

### Deployment Option 1: Vercel

#### Step 1: Prepare Repository

```bash
# Ensure code is committed and pushed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

#### Step 2: Deploy to Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Via Vercel Dashboard** (recommended):
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your Git repository
   - Configure project settings:
     - Framework Preset: Next.js
     - Root Directory: `./`
     - Build Command: `pnpm build`
     - Output Directory: `.next`
     - Install Command: `pnpm install`

3. **Configure Environment Variables**:
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add all variables from `.env.production`
   - Ensure `NODE_ENV=production` is set

4. **Configure External Services**:
   - **Database**: Use Vercel Postgres or external provider
   - **Redis**: Use Upstash Redis (recommended for Vercel)
   
   ```bash
   # Upstash Redis URL format
   REDIS_URL=rediss://default:password@endpoint.upstash.io:6379
   ```

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Vercel will provide a deployment URL

#### Step 3: Run Database Migrations

```bash
# Using Vercel CLI
vercel env pull .env.production.local
pnpm prisma migrate deploy
```

Or use Vercel's deployment hooks to run migrations automatically.

#### Step 4: Configure Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning

---

### Deployment Option 2: Docker Container

#### Step 1: Create Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Step 2: Update next.config.js

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Enable for Docker
  // ... rest of config
}

module.exports = nextConfig
```

#### Step 3: Create docker-compose.production.yml

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - AUTH_SESSION_SECRET=${AUTH_SESSION_SECRET}
      - POSTMARK_API_TOKEN=${POSTMARK_API_TOKEN}
      - TURNSTILE_SITE_KEY=${TURNSTILE_SITE_KEY}
      - TURNSTILE_SECRET_KEY=${TURNSTILE_SECRET_KEY}
      - REDIS_URL=${REDIS_URL}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
      - NODE_ENV=production
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: inform
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: inform_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Step 4: Build and Deploy

```bash
# Build Docker image
docker build -t inform-v2:latest .

# Run with docker-compose
docker-compose -f docker-compose.production.yml up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Check logs
docker-compose logs -f app
```

---

### Deployment Option 3: Traditional VPS

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL 16
sudo apt install -y postgresql-16

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
npm install -g pm2
```

#### Step 2: Clone and Build Application

```bash
# Create app directory
sudo mkdir -p /var/www/inform
sudo chown $USER:$USER /var/www/inform

# Clone repository
cd /var/www/inform
git clone https://github.com/yourusername/inform-v2.git .

# Install dependencies
pnpm install --frozen-lockfile

# Copy environment file
cp .env.example .env.production
nano .env.production  # Edit with production values

# Build application
pnpm build
```

#### Step 3: Configure PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'inform-v2',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/inform',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    error_file: '/var/log/inform/error.log',
    out_file: '/var/log/inform/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
EOF

# Create log directory
sudo mkdir -p /var/log/inform
sudo chown $USER:$USER /var/log/inform

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### Step 4: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/inform
```

```nginx
# /etc/nginx/sites-available/inform
upstream inform_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/inform_access.log;
    error_log /var/log/nginx/inform_error.log;

    # Client upload size
    client_max_body_size 10M;

    location / {
        proxy_pass http://inform_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://inform_backend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/inform /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Step 5: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check application is running
curl https://yourdomain.com

# Check API health
curl https://yourdomain.com/api/health

# Check database connectivity
curl https://yourdomain.com/api/health/db

# Check Redis connectivity
curl https://yourdomain.com/api/health/redis
```

### 2. Functional Testing

- [ ] **Authentication**: Test login/logout functionality
- [ ] **Form Creation**: Create a test form
- [ ] **Form Submission**: Submit a test form as public user
- [ ] **Review System**: Submit a review
- [ ] **Email Delivery**: Verify emails are being sent
- [ ] **File Uploads**: Test attachment uploads
- [ ] **CAPTCHA**: Verify Turnstile is working
- [ ] **Rate Limiting**: Test rate limits are enforced

### 3. Performance Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test homepage performance
ab -n 1000 -c 10 https://yourdomain.com/

# Test API endpoint
ab -n 100 -c 5 https://yourdomain.com/api/health
```

### 4. Security Verification

```bash
# Check SSL configuration
curl -I https://yourdomain.com

# Verify security headers
curl -I https://yourdomain.com | grep -E "X-Frame-Options|X-Content-Type-Options|X-XSS-Protection"

# Test HTTPS redirect
curl -I http://yourdomain.com
```

### 5. Database Verification

```bash
# Connect to production database
psql $DATABASE_URL

# Check tables exist
\dt

# Verify seed data
SELECT * FROM "User" WHERE "isSuperAdmin" = true;

# Check migrations
SELECT * FROM "_prisma_migrations" ORDER BY "finished_at" DESC LIMIT 5;

\q
```

---

## Monitoring & Maintenance

### Application Monitoring

#### PM2 Monitoring (VPS Deployment)

```bash
# View application status
pm2 status

# View logs
pm2 logs inform-v2

# Monitor resources
pm2 monit

# View detailed info
pm2 info inform-v2
```

#### Log Management

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/inform
```

```
/var/log/inform/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Database Monitoring

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('inform_prod'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';
```

### Redis Monitoring

```bash
# Connect to Redis
redis-cli -h host -p 6379 -a password

# Check memory usage
INFO memory

# Check connected clients
INFO clients

# Monitor commands in real-time
MONITOR
```

### Automated Monitoring Setup

```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Setup PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Uptime Monitoring

Use external services:
- **UptimeRobot**: Free tier available
- **Pingdom**: Comprehensive monitoring
- **StatusCake**: Free SSL monitoring
- **Better Uptime**: Modern interface

### Error Tracking

Consider integrating:
- **Sentry**: Error tracking and performance monitoring
- **LogRocket**: Session replay and error tracking
- **Datadog**: Full-stack observability

---

## Troubleshooting

### Common Issues

#### Issue 1: Application Won't Start

```bash
# Check logs
pm2 logs inform-v2 --lines 100

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Port already in use
# - Build errors

# Verify environment
pm2 env 0

# Check port availability
sudo lsof -i :3000

# Restart application
pm2 restart inform-v2
```

#### Issue 2: Database Connection Errors

```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection limits
psql $DATABASE_URL -c "SHOW max_connections"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# Restart PostgreSQL if needed
sudo systemctl restart postgresql
```

#### Issue 3: Redis Connection Errors

```bash
# Test Redis connectivity
redis-cli -h host -p 6379 -a password ping

# Check Redis is running
sudo systemctl status redis

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Restart Redis if needed
sudo systemctl restart redis
```

#### Issue 4: 502 Bad Gateway (Nginx)

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if application is running
pm2 status

# Check Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Issue 5: High Memory Usage

```bash
# Check memory usage
free -h

# Check application memory
pm2 info inform-v2

# Restart application to clear memory
pm2 restart inform-v2

# Consider increasing server resources or optimizing queries
```

#### Issue 6: Slow Performance

```bash
# Check database query performance
# Enable slow query logging in PostgreSQL
# Edit postgresql.conf:
log_min_duration_statement = 1000  # Log queries taking > 1s

# Check for missing indexes
# Run EXPLAIN ANALYZE on slow queries

# Check Redis performance
redis-cli --latency

# Monitor application metrics
pm2 monit
```

### Database Migration Issues

```bash
# Check migration status
pnpm prisma migrate status

# If migrations are out of sync
pnpm prisma migrate resolve --applied "migration_name"

# Force reset (DESTRUCTIVE - backup first!)
pnpm prisma migrate reset --force

# Re-run migrations
pnpm prisma migrate deploy
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run

# Check Nginx SSL configuration
sudo nginx -t
```

---

## Rollback Procedures

### Application Rollback

#### Vercel Rollback

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

#### Docker Rollback

```bash
# List available images
docker images inform-v2

# Stop current container
docker-compose down

# Start previous version
docker run -d --name inform-v2 inform-v2:previous-tag

# Or rollback with docker-compose
docker-compose -f docker-compose.production.yml up -d --force-recreate
```

#### VPS Rollback

```bash
# Using Git
cd /var/www/inform
git log --oneline  # Find previous commit
git checkout <previous-commit-hash>

# Rebuild
pnpm install
pnpm build

# Restart
pm2 restart inform-v2

# Or use PM2 ecosystem
pm2 reload ecosystem.config.js
```

### Database Rollback

```bash
# IMPORTANT: Always backup before rollback!

# Backup current state
pg_dump $DATABASE_URL > backup_before_rollback.sql

# Rollback last migration
pnpm prisma migrate resolve --rolled-back "migration_name"

# Restore from backup if needed
psql $DATABASE_URL < backup_before_rollback.sql
```

### Emergency Rollback Plan

1. **Notify stakeholders** of the rollback
2. **Backup current state** (database, files, logs)
3. **Rollback application** to previous version
4. **Rollback database** if schema changed
5. **Verify functionality** with smoke tests
6. **Monitor logs** for errors
7. **Document incident** for post-mortem

---

## Production Checklist

### Before Going Live

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate installed and valid
- [ ] DNS records configured correctly
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] Rate limiting configured
- [ ] Email delivery tested
- [ ] CAPTCHA working
- [ ] Error tracking enabled
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Documentation updated
- [ ] Team trained on deployment process
- [ ] Rollback procedure tested
- [ ] Incident response plan documented

### Post-Launch Monitoring (First 24 Hours)

- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify email delivery
- [ ] Monitor database performance
- [ ] Check Redis memory usage
- [ ] Review security logs
- [ ] Monitor user feedback
- [ ] Check SSL certificate status
- [ ] Verify backups are running
- [ ] Monitor server resources

---

## Additional Resources

### Documentation

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Best Practices](https://redis.io/docs/management/optimization/)

### Security

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

### Monitoring

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Monitoring](https://www.nginx.com/blog/monitoring-nginx/)
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html)

---

## Support

For deployment assistance:
- Email: support@iterate.ai
- Documentation: [Internal Wiki]
- Emergency: [On-call rotation]

---

**Last Updated**: 2025-01-13
**Version**: 1.0.0
**Maintained By**: Iterate.ai DevOps Team
