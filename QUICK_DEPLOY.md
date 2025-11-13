# Quick Deployment Guide

Fast-track guide to deploy InForm-V2 to production. For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## 🚀 Quick Start (5 Minutes)

### Option 1: Deploy to Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Set environment variables in Vercel dashboard
# Go to: Project Settings → Environment Variables
# Add all variables from .env.example

# 5. Run migrations
vercel env pull .env.production.local
pnpm prisma migrate deploy
```

**Required External Services:**
- Database: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) or [Neon](https://neon.tech)
- Redis: [Upstash Redis](https://upstash.com)

### Option 2: Test Locally First

```bash
# Run the automated deployment test script
./scripts/deploy-local-test.sh
```

This script will:
- ✓ Check prerequisites
- ✓ Install dependencies
- ✓ Start database services
- ✓ Run migrations
- ✓ Seed database
- ✓ Build application
- ✓ Start production server

## 📋 Pre-Deployment Checklist

- [ ] Generate secure `AUTH_SESSION_SECRET`: `openssl rand -base64 32`
- [ ] Set up production database (PostgreSQL 16+)
- [ ] Set up Redis instance
- [ ] Configure environment variables
- [ ] Test locally with `./scripts/deploy-local-test.sh`

## 🔐 Required Environment Variables

```bash
# Minimum required for production
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
AUTH_SESSION_SECRET=your-32-char-random-string
REDIS_URL=redis://:password@host:6379
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

## 🏥 Health Check

After deployment, verify health:

```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T19:30:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "checks": {
    "database": { "status": "healthy", "responseTime": 15 },
    "redis": { "status": "healthy", "responseTime": 8 }
  }
}
```

## 🎯 Quick Deploy Commands

### Vercel
```bash
vercel --prod
```

### Docker
```bash
docker build -t inform-v2 .
docker run -p 3000:3000 --env-file .env.production inform-v2
```

### VPS with PM2
```bash
pnpm install --frozen-lockfile
pnpm build
pm2 start npm --name "inform-v2" -- start
```

## 🔄 Database Migrations

```bash
# Production migrations (safe, no data loss)
pnpm prisma migrate deploy

# Check migration status
pnpm prisma migrate status
```

## 🌱 Initial Seed (First Deploy Only)

```bash
# Set admin credentials in .env first
SEED_SUPERADMIN_EMAIL=admin@yourdomain.com
SEED_SUPERADMIN_PASSWORD=secure-password

# Run seed
pnpm db:seed
```

**⚠️ IMPORTANT**: Change the super admin password immediately after first login!

## 📊 Post-Deployment Verification

1. **Test Authentication**
   ```bash
   curl -X POST https://yourdomain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@yourdomain.com","password":"your-password"}'
   ```

2. **Test Health Endpoint**
   ```bash
   curl https://yourdomain.com/api/health
   ```

3. **Check SSL**
   ```bash
   curl -I https://yourdomain.com
   ```

4. **Verify Database**
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"User\";"
   ```

## 🐛 Quick Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs inform-v2
# or
vercel logs
```

### Database connection error
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Redis connection error
```bash
# Test connection
redis-cli -u $REDIS_URL ping
```

### Build errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

## 🔙 Quick Rollback

### Vercel
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Docker
```bash
docker-compose down
docker-compose up -d --force-recreate
```

### VPS
```bash
git checkout <previous-commit>
pnpm install && pnpm build
pm2 restart inform-v2
```

## 📚 Full Documentation

For detailed deployment instructions, troubleshooting, and advanced configurations:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [README.md](./README.md) - Project overview and local development
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing procedures

## 🆘 Support

- **Documentation**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Issues**: Check logs and health endpoint first
- **Emergency**: Follow rollback procedures above

---

**Quick Deploy Time**: ~5 minutes (Vercel) | ~15 minutes (VPS)
