# Environment Variables Setup Guide

## Quick Start

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the **REQUIRED** variables (see below)

3. Start Docker services:
   ```bash
   pnpm db:up
   ```

4. Run migrations:
   ```bash
   pnpm db:migrate
   ```

5. Seed database:
   ```bash
   pnpm db:seed
   ```

## Required Variables

### 1. DATABASE_URL
**Required for:** Database connection

For local development with docker-compose (using port 5433 to avoid conflicts):
```
DATABASE_URL="postgres://inform:inform@localhost:5433/inform_dev"
```

**Note:** Port 5433 is used because port 5432 may already be in use by another PostgreSQL instance.

### 2. AUTH_SESSION_SECRET
**Required for:** Session management (Lucia auth)

Generate a secure random string (minimum 32 characters):
```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

Example:
```
AUTH_SESSION_SECRET="your-generated-secret-key-here-min-32-chars"
```

### 3. REDIS_URL
**Required for:** Rate limiting and background jobs

For local development with docker-compose (using port 6380 to avoid conflicts):
```
REDIS_URL="redis://localhost:6380"
```

**Note:** Port 6380 is used because port 6379 may already be in use.

## Optional Variables (Can leave empty for development)

### Email (Postmark)
- `POSTMARK_API_TOKEN` - Leave empty for dev (emails won't be sent)
- `POSTMARK_FROM_EMAIL` - Leave empty for dev

### Cloudflare Turnstile CAPTCHA
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Leave empty for dev (CAPTCHA will be skipped)
- `TURNSTILE_SECRET_KEY` - Leave empty for dev

**Note:** The app will work without these in development mode. CAPTCHA validation is automatically skipped if keys aren't configured.

### Seed Data
- `SEED_SUPERADMIN_EMAIL` - Default: "admin@iterate.ai"
- `SEED_SUPERADMIN_PASSWORD` - Default: "changeme123"

These are only used when running `pnpm db:seed`.

### Application URL
- `NEXT_PUBLIC_APP_URL` - Default: "http://localhost:3000"

## Complete .env File Example

```bash
# Required
DATABASE_URL="postgres://inform:inform@localhost:5433/inform_dev"
AUTH_SESSION_SECRET="your-generated-secret-key-here-min-32-chars"
REDIS_URL="redis://localhost:6380"

# Optional (can leave empty)
POSTMARK_API_TOKEN=""
POSTMARK_FROM_EMAIL=""
NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""
SEED_SUPERADMIN_EMAIL="admin@iterate.ai"
SEED_SUPERADMIN_PASSWORD="changeme123"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Verification Steps

After setting up your `.env` file:

1. **Start Docker services:**
   ```bash
   pnpm db:up
   ```
   Wait a few seconds for services to start.

2. **Test database connection:**
   ```bash
   pnpm db:migrate
   ```
   Should create migrations successfully.

3. **Seed database:**
   ```bash
   pnpm db:seed
   ```
   Should create sample data.

4. **Start dev server:**
   ```bash
   pnpm dev
   ```
   Should start without errors.

5. **Test login:**
   - Go to http://localhost:3000/login
   - Use credentials from seed: `admin@iterate.ai` / `changeme123` (or your custom seed credentials)

## Troubleshooting

### Port 5432/5433 already in use
If you get "port is already allocated" error:
- Another PostgreSQL instance is running
- Stop it or use a different port in docker-compose.yml
- Or use the existing PostgreSQL instance (update DATABASE_URL)

### Redis connection failed
- Make sure Redis container is running: `docker ps`
- Check Redis logs: `docker logs inform-v2-redis-1`

### AUTH_SESSION_SECRET errors
- Must be at least 32 characters
- Generate a new one if unsure

### Database connection errors
- Verify DATABASE_URL format matches: `postgres://USER:PASSWORD@HOST:PORT/DATABASE`
- Check docker-compose.yml matches your .env credentials (note: internal port is 5432, external is 5433)
- Ensure PostgreSQL container is running: `docker ps`
