# Inform v2

Multi-tenant intake → review → decision platform built by Iterate.ai

## Features

- **Multi-tenant Organizations**: Isolated data per organization with role-based access control
- **Custom Forms**: Bespoke public form pages with configurable schemas
- **Review System**: Configurable rubrics with weighted scoring
- **Visibility Policies**: Control when reviewers can see each other's reviews
- **Audit Logging**: Track all important actions across the platform
- **Security First**: Argon2id password hashing, CSRF protection, rate limiting

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Lucia v3 with session-based authentication
- **UI**: TailwindCSS + shadcn/ui components
- **Queue**: BullMQ + Redis for background jobs
- **Validation**: Zod schemas

## Getting Started

### Prerequisites

- Node.js 20+ and pnpm
- Docker and Docker Compose (for local database)
- PostgreSQL 16 (or use Docker)

### Installation

1. **Clone and install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection string
   - `AUTH_SESSION_SECRET`: Random 32-character string
   - `POSTMARK_API_TOKEN`: For email sending (optional for dev)
   - `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile (optional for dev)
   - `REDIS_URL`: Redis connection string

3. **Start local database**:
   ```bash
   pnpm db:up
   ```

4. **Run database migrations**:
   ```bash
   pnpm db:migrate
   ```

5. **Seed the database**:
   ```bash
   pnpm db:seed
   ```

6. **Start the development server**:
   ```bash
   pnpm dev
   ```

7. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

After seeding, you can log in with:

- **Super Admin**: `admin@iterate.ai` / `changeme123`
- **Org Admin**: `admin@acme.com` / `password123`
- **Reviewer**: `reviewer@acme.com` / `password123`

## Project Structure

```
/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (app)/             # Authenticated app pages
│   ├── api/               # API routes
│   └── forms/             # Public form pages
├── lib/                   # Shared utilities
│   ├── auth.ts           # Lucia auth configuration
│   ├── db.ts             # Prisma client
│   ├── rbac.ts           # Role-based access control
│   ├── visibility.ts     # Visibility policy logic
│   └── zod-schemas.ts    # Request/response schemas
├── components/            # React components
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Prisma schema
│   ├── migrations/       # Database migrations
│   └── seed.ts           # Seed script
└── worker/               # Background job processors
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run tests
- `pnpm db:up` - Start Docker database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with sample data
- `pnpm db:reset` - Reset database (⚠️ destructive)
- `pnpm db:studio` - Open Prisma Studio

## Security Features

- **Password Hashing**: Argon2id with secure parameters
- **Session Management**: HttpOnly cookies with rotation
- **CSRF Protection**: Built-in Next.js protection
- **Input Validation**: Zod schemas on all endpoints
- **SQL Injection Prevention**: Parameterized queries via Prisma
- **XSS Protection**: React's built-in escaping + CSP headers
- **Rate Limiting**: Per-IP and per-user throttling
- **Audit Logging**: All sensitive actions logged

## API Routes

### Public
- `POST /api/public/forms/:orgSlug/:formSlug/submissions` - Submit a form

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/invite` - Invite user (org admin)

### Organizations
- `GET /api/org/:orgId/forms` - List forms
- `POST /api/org/:orgId/forms` - Create form
- `GET /api/org/:orgId/submissions` - List submissions

### Reviews
- `GET /api/submissions/:id/reviews` - Get reviews (with visibility policy)
- `POST /api/submissions/:id/reviews` - Submit/update review

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AUTH_SESSION_SECRET` | Session encryption key (32+ chars) | Yes |
| `POSTMARK_API_TOKEN` | Postmark API token for emails | No |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key | No |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret | No |
| `REDIS_URL` | Redis connection string | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
docker build -t inform-v2 .
docker run -p 3000:3000 inform-v2
```

## License

Proprietary - Iterate.ai

## Support

For support, email support@iterate.ai
