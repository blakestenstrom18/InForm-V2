# Vercel Deployment Guide - Neon Postgres Setup

## Step-by-Step: Setting Up Environment Variables on Vercel

### Part 1: Set Up Neon Postgres Database

1. **Go to Neon Console**
   - Visit https://console.neon.tech/
   - Sign up or log in

2. **Create a New Project**
   - Click "Create Project"
   - Choose a project name (e.g., "inform-v2")
   - Select a region closest to your users
   - Choose PostgreSQL version (15 or 16 recommended)
   - Click "Create Project"

3. **Get Your Connection String**
   - After project creation, you'll see a connection string like:
     ```
     postgres://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
     ```
   - **Copy this connection string** - you'll need it for Vercel

4. **Run Migrations on Neon**
   - Open your terminal
   - Set the DATABASE_URL temporarily:
     ```bash
     export DATABASE_URL="your-neon-connection-string-here"
     ```
   - Run migrations:
     ```bash
     pnpm db:migrate
     ```
   - This will create all your database tables on Neon

### Part 2: Add Environment Variables to Vercel

1. **Go to Your Vercel Project**
   - Visit https://vercel.com/dashboard
   - Click on your project (in-form-v2)

2. **Navigate to Settings → Environment Variables**

3. **Add Each Variable** (click "Add New" for each):

   #### Required Variables:

   **DATABASE_URL**
   - **Value:** Your Neon connection string from Part 1
   - **Environment:** Production, Preview, Development (select all)
   - Example: `postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

   **AUTH_SESSION_SECRET**
   - **Value:** Generate a secure random string (32+ characters)
   - **How to generate:**
     ```bash
     openssl rand -base64 32
     ```
     Or visit: https://generate-secret.vercel.app/32
   - **Environment:** Production, Preview, Development (select all)
   - Example: `aBc123XyZ456...` (at least 32 characters)

   **REDIS_URL**
   - **Option A: Use Upstash Redis (Recommended for Vercel)**
     1. Go to https://upstash.com/
     2. Sign up/login
     3. Create a new Redis database
     4. Copy the REST URL (looks like: `redis://default:password@xxx.upstash.io:6379`)
     5. Use this as your REDIS_URL value
   - **Option B: Use Redis Cloud or other Redis provider**
   - **Environment:** Production, Preview, Development (select all)

   #### Optional but Recommended:

   **NEXT_PUBLIC_APP_URL**
   - **Value:** Your production URL (e.g., `https://in-form-v2.vercel.app`)
   - **Environment:** Production only
   - This is used for API calls and redirects

   #### Optional Variables (Can add later):

   **NEXT_PUBLIC_TURNSTILE_SITE_KEY**
   - Get from Cloudflare Turnstile dashboard
   - **Environment:** Production, Preview (optional)

   **TURNSTILE_SECRET_KEY**
   - Get from Cloudflare Turnstile dashboard
   - **Environment:** Production, Preview (optional)
   - ⚠️ **Never** add this to Development environment (it's a secret)

   **POSTMARK_API_TOKEN** (if using email)
   - Get from Postmark account
   - **Environment:** Production only

   **POSTMARK_FROM_EMAIL** (if using email)
   - Your verified sender email
   - **Environment:** Production only

### Part 3: Verify Setup

1. **Redeploy Your Application**
   - Go to Vercel dashboard → Deployments
   - Click "Redeploy" on the latest deployment
   - Or push a new commit to trigger a deployment

2. **Check Build Logs**
   - Watch the build logs for any errors
   - Should see: `✓ Compiled successfully`
   - Should see: `Generating Prisma Client...`

3. **Test Database Connection**
   - After deployment, visit your app
   - Try logging in or creating a form
   - If you see database errors, check:
     - DATABASE_URL is correct
     - Migrations ran successfully
     - Database is accessible from Vercel's IPs

### Part 4: Run Migrations After First Deploy

If you haven't run migrations yet, you can do it via Vercel:

1. **Option A: Use Vercel CLI (Recommended)**
   ```bash
   # Set your DATABASE_URL locally
   export DATABASE_URL="your-neon-connection-string"
   
   # Run migrations
   pnpm db:migrate
   ```

2. **Option B: Use Neon SQL Editor**
   - Go to Neon Console → SQL Editor
   - Copy the SQL from `prisma/migrations/20251030200407_initial_migration/migration.sql`
   - Paste and run it

### Quick Checklist

- [ ] Neon Postgres database created
- [ ] DATABASE_URL added to Vercel (all environments)
- [ ] AUTH_SESSION_SECRET generated and added (all environments)
- [ ] REDIS_URL added (Upstash or other provider) (all environments)
- [ ] NEXT_PUBLIC_APP_URL added (production only)
- [ ] Migrations run on Neon database
- [ ] Application redeployed
- [ ] Build successful
- [ ] Database connection working

### Troubleshooting

**"Module '@prisma/client' has no exported member 'PrismaClient'"**
- ✅ Fixed! The `vercel.json` and `package.json` now include `prisma generate`

**"Database connection failed"**
- Check DATABASE_URL format is correct
- Ensure Neon database is running (not paused)
- Verify SSL mode is included: `?sslmode=require`
- Check Neon dashboard for connection limits

**"Redis connection failed"**
- Verify REDIS_URL format is correct
- Check Upstash dashboard to ensure database is active
- Redis is optional for basic functionality (rate limiting won't work without it)

**"Session secret too short"**
- AUTH_SESSION_SECRET must be at least 32 characters
- Generate a new one using: `openssl rand -base64 32`

### Environment Variable Summary

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ Yes | `postgres://user:pass@host/db?sslmode=require` | From Neon |
| `AUTH_SESSION_SECRET` | ✅ Yes | `32+ char random string` | Generate with openssl |
| `REDIS_URL` | ✅ Yes | `redis://default:pass@host:6379` | From Upstash/Redis provider |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Recommended | `https://your-app.vercel.app` | Your production URL |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ❌ Optional | `0x...` | From Cloudflare |
| `TURNSTILE_SECRET_KEY` | ❌ Optional | `secret...` | From Cloudflare (secret!) |
| `POSTMARK_API_TOKEN` | ❌ Optional | `token...` | From Postmark |
| `POSTMARK_FROM_EMAIL` | ❌ Optional | `noreply@yourdomain.com` | Verified sender |

### Next Steps After Setup

1. **Seed Production Database** (optional):
   ```bash
   export DATABASE_URL="your-neon-connection-string"
   export SEED_SUPERADMIN_EMAIL="admin@yourdomain.com"
   export SEED_SUPERADMIN_PASSWORD="secure-password"
   pnpm db:seed
   ```

2. **Set Up Custom Domain** (if needed):
   - Vercel Dashboard → Settings → Domains
   - Add your custom domain

3. **Enable Analytics** (optional):
   - Vercel Dashboard → Analytics
   - Enable to track usage

4. **Set Up Monitoring**:
   - Consider adding error tracking (Sentry, etc.)
   - Monitor Neon database usage

