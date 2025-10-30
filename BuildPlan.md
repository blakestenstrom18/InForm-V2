# Inform v2 — Product & Technical Plan (Build Bible)

**Owner:** Iterate.ai
**Date:** October 20, 2025
**Status:** Authoritative v1.0 (MVP scope locked)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Roles, Permissions & Multi‑tenancy](#2-roles-permissions--multi-tenancy)
3. [UX Flows](#3-ux-flows)
4. [Architecture](#4-architecture)
5. [Tech Stack & Dependencies](#5-tech-stack--dependencies)
6. [Local Dev & Environments](#6-local-dev--environments)
7. [Design System & shadcn/ui](#7-design-system--shadcnuI)
8. [Data Model (ERD + Prisma Schema)](#8-data-model-erd--prisma-schema)
9. [Database Migrations, Indexes & RLS](#9-database-migrations-indexes--rls)
10. [Auth, Sessions & RBAC Guards](#10-auth-sessions--rbac-guards)
11. [API Surface (Routes, Types, Contracts)](#11-api-surface-routes-types-contracts)
12. [Visibility Policy Logic](#12-visibility-policy-logic)
13. [Events, Jobs & Aggregates](#13-events-jobs--aggregates)
14. [Security, Privacy & Abuse Prevention](#14-security-privacy--abuse-prevention)
15. [Observability, Logging & Alerts](#15-observability-logging--alerts)
16. [Performance & Scalability](#16-performance--scalability)
17. [Testing Strategy](#17-testing-strategy)
18. [CI/CD & Deploy](#18-cicd--deploy)
19. [Seeding & Sample Data](#19-seeding--sample-data)
20. [Roadmap (MVP → v1.2)](#20-roadmap-mvp--v12)
21. [Appendix A — Example JSON Payloads](#appendix-a--example-json-payloads)
22. [Appendix B — Acceptance Criteria](#appendix-b--acceptance-criteria)

---

## 1) Product Overview

**One‑liner:**
Inform is a multi‑tenant intake → review → decision platform. Iterate builds bespoke public form pages per customer program; org admins and reviewers score submissions using configurable rubrics with controlled visibility.

**Non‑goals (MVP):** SSO, multi‑round reviews, external commenter sharing, attachments (reserved in schema), Salesforce/Airtable sync.

---

## 2) Roles, Permissions & Multi‑tenancy

**Roles**

* **Super Admin (Iterate):** Full cross‑tenant access; org/user management; audit access; impersonation.
* **Org Admin:** Scoped to org. Manage forms, users, policies; view all submissions; grade; export.
* **Reviewer:** Scoped to org. Grade/comment. Can see others’ reviews **only after** they submit their own for that submission (default policy).
* **Viewer (optional):** Read‑only in org.

**Multi‑tenancy**

* Every row carries `orgId`. App‑layer guards + optional Postgres **RLS**.
* Routing: Public form URLs → `https://inform.iterate.ai/{orgSlug}/{formSlug}`.
* Users can belong to multiple orgs via `Membership(role)`.

**Permission matrix (summary)**

* Create Org: Super ✅
* Invite Users: Super (any), Org Admin (own) ✅
* Create/Edit Forms: Super, Org Admin ✅
* Grade: Super (impersonate), Org Admin, Reviewer ✅
* See others’ reviews/comments: gated by **visibility policy**.

---

## 3) UX Flows

**Public Submitter**

1. Land on bespoke form page → form schema loaded (for validation).
2. Complete form (email required), CAPTCHA, submit → confirmation screen.
3. (Optional v1.1) confirmation email.

**Reviewer**

1. Login → “My Queue” (ungraded by me; least‑reviewed first).
2. Open submission → fill rubric; save draft or submit.
3. After submit → instantly see others’ reviews/comments per visibility policy.

**Org Admin**

1. Dashboard metrics: # submissions, # graded, % graded.
2. Submissions table: search/filter/tag, export CSV/Excel.
3. Form settings: grading scale and weights, min reviews, visibility mode, deadlines.
4. User management: invite, roles, revoke.
5. Audit log: scoped to org.

**Super Admin**

* All of the above across tenants + impersonation (visible banner + audit event).

---

## 4) Architecture

* **Next.js (App Router)** — single repo, admin portal + public forms.
* **API Route Handlers** for REST endpoints (typed with Zod).
* **Server Actions** for safe server‑side mutations where suitable.
* **Prisma** ORM → **Postgres** (Neon/Supabase/RDS).
* **Lucia** for sessions (HttpOnly cookies).
* **Redis (BullMQ)** for events/aggregates (Upstash Redis or Redis Cloud).
* **Postmark** (emails). **Cloudflare Turnstile** (CAPTCHA).
* **Sentry** + **OpenTelemetry** (traces/metrics).
* Deploy: **Vercel** (web/API) + **Fly.io** (worker).

**Monorepo Structure (simplified)**

```
/ (repo)
  .env*                  # separate per env
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    app/
      (public)/forms/[orgSlug]/[formSlug]/page.tsx
      (auth)/login/page.tsx
      (app)/dashboard/page.tsx
      (app)/submissions/...
      api/
        public/forms/[orgSlug]/[formSlug]/route.ts
        auth/login/route.ts
        org/[orgId]/...
    lib/
      db.ts              # Prisma client
      auth.ts            # Lucia config
      rbac.ts            # guards
      zod-schemas.ts     # request/response schemas
      visibility.ts
      events.ts
      rate-limit.ts
      feature-flags.ts
    components/          # shadcn components + shared UI
    styles/              # globals.css (Tailwind + shadcn tokens)
  worker/
    index.ts             # BullMQ processors
  docker-compose.yml
  package.json
```

---

## 5) Tech Stack & Dependencies

* **Language:** TypeScript (strict).
* **Web:** Next.js 14+, React 18, App Router, React Server Components, React Query (client fetching), React Hook Form.
* **UI:** TailwindCSS 3+, **shadcn/ui** (Radix primitives, lucide-react icons).
* **Data:** Postgres 16, Prisma 5+.
* **Auth:** Lucia + Argon2id.
* **Queue:** BullMQ + Redis.
* **Email:** Postmark.
* **Anti‑spam:** Cloudflare Turnstile, honeypot, throttles.
* **Observability:** Sentry, OTEL.
* **Testing:** Vitest, Testing Library, Playwright, Testcontainers.

---

## 6) Local Dev & Environments

**Dockerized Postgres**

```yaml
# docker-compose.yml
version: "3.9"
services:
  db:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: inform
      POSTGRES_PASSWORD: inform
      POSTGRES_DB: inform_dev
    volumes:
      - inform_pg_data:/var/lib/postgresql/data
volumes:
  inform_pg_data:
```

**Env Vars**

```
# .env.local (example)
DATABASE_URL=postgres://inform:inform@localhost:5432/inform_dev
AUTH_SESSION_SECRET=replace-me
POSTMARK_API_TOKEN=replace-me
TURNSTILE_SITE_KEY=replace-me
TURNSTILE_SECRET_KEY=replace-me
REDIS_URL=redis://localhost:6379  # or upstash url
```

**Scripts**

```json
{
  "scripts": {
    "db:up": "docker compose up -d db",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset --force",
    "typecheck": "tsc -p . --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

---

## 7) Design System & shadcn/ui

**Install**

```bash
# Tailwind + shadcn/ui init
pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add button input textarea select checkbox label form
pnpm dlx shadcn-ui@latest add dialog drawer dropdown-menu popover tooltip sheet alert
pnpm dlx shadcn-ui@latest add table badge card tabs toast skeleton separator breadcrumb avatar
pnpm add class-variance-authority tailwind-merge lucide-react @radix-ui/react-icons
```

**Tailwind preset:** default + CSS variables for theming.

**Org theming**

* Persist per‑org theme tokens: `primary`, `secondary`, `accent` CSS vars.
* On org‑scoped pages, set `data-theme` attribute to inject variables.
* Allow **page‑level bespoke styling** on public form pages while using underlying shared field components (Input, Textarea, Select).

**Component mapping (core screens)**

* Navigation: `Breadcrumb`, `Tabs`, `DropdownMenu`.
* Tables: `Table` + (TanStack Table integration for datagrid).
* Forms: `Form`, `Input`, `Textarea`, `Select`, `Checkbox` + RHF + Zod resolver.
* Review UI: `Card` + `Tabs` (My Review, Others (locked until submit)).
* Modals: `Dialog` for invites, visibility policy edits.
* Feedback: `Toast` for ops success/failure; `Alert` for policy warnings.

---

## 8) Data Model (ERD + Prisma Schema)

**Guiding principles**

* Multi‑tenant by `orgId`.
* Version immutable definitions: **FormVersion**, **RubricVersion**.
* **Review** immutable after submit; edits create **ReviewRevision**.
* **SubmissionAggregate** stores denormalized counts & composite score.
* **VisibilityPolicy** flexible enum with thresholds.

**Prisma schema (core models)**

> Save as `prisma/schema.prisma`. Migrations will add triggers/rls via SQL.

```prisma
// -------------------------------------
// Prisma Schema for Inform v2
// -------------------------------------
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  org_admin
  reviewer
  viewer
}

enum VisibilityMode {
  REVEAL_AFTER_ME_SUBMIT
  REVEAL_AFTER_MIN_REVIEWS
  NEVER
  AVERAGES_ONLY_UNTIL_LOCK
}

model Organization {
  id        String  @id @default(uuid())
  name      String
  slug      String  @unique
  users     Membership[]
  forms     Form[]
  createdAt DateTime @default(now())

  @@index([slug])
}

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  passwordHash    String
  name            String?
  isSuperAdmin    Boolean  @default(false)
  emailBounceStatus String? // for deliverability
  memberships     Membership[]
  reviews         Review[]
  auditLogs       AuditLog[] @relation("AuditActor")
  createdAt       DateTime @default(now())
  lastLoginAt     DateTime?
}

model Membership {
  id     String @id @default(uuid())
  userId String
  orgId  String
  role   Role

  user User @relation(fields: [userId], references: [id])
  org  Organization @relation(fields: [orgId], references: [id])

  @@unique([userId, orgId])
  @@index([orgId, role])
}

model Form {
  id          String  @id @default(uuid())
  orgId       String
  org         Organization @relation(fields: [orgId], references: [id])
  name        String
  slug        String
  status      String   // draft | open | closed | archived
  openAt      DateTime?
  closeAt     DateTime?
  minReviewsRequired Int @default(1)
  // visibility policy (redundant copy for fast reads)
  visibilityMode VisibilityMode @default(REVEAL_AFTER_ME_SUBMIT)
  visibilityThreshold Int?
  createdAt   DateTime @default(now())

  versions    FormVersion[]
  rubricVersions RubricVersion[]
  submissions Submission[]
  visibilityPolicies VisibilityPolicy[]
  slugHistory SlugHistory[]

  @@unique([orgId, slug])
  @@index([orgId])
}

model SlugHistory {
  id        String @id @default(uuid())
  formId    String
  oldSlug   String
  changedAt DateTime @default(now())
  form      Form @relation(fields: [formId], references: [id])
}

model FormVersion {
  id          String @id @default(uuid())
  formId      String
  form        Form @relation(fields: [formId], references: [id])
  version     Int
  schemaJson  Json
  notes       String?
  publishedAt DateTime?

  @@unique([formId, version])
}

model RubricVersion {
  id          String @id @default(uuid())
  formId      String
  form        Form @relation(fields: [formId], references: [id])
  version     Int
  questionsJson Json   // [{id,label,desc,weight,required}]
  scaleMin    Int      @default(1)
  scaleMax    Int      @default(5)
  scaleStep   Int      @default(1)
  weightsJson Json?
  publishedAt DateTime?

  @@unique([formId, version])
}

model Submission {
  id              String @id @default(uuid())
  orgId           String
  formId          String
  formVersionId   String
  rubricVersionId String
  submitterEmail  String
  submittedAt     DateTime @default(now())
  dataJson        Json
  spamScore       Float    @default(0)
  status          String   // ungraded | partially_graded | fully_graded

  form          Form          @relation(fields: [formId], references: [id])
  formVersion  FormVersion   @relation(fields: [formVersionId], references: [id])
  rubricVersion RubricVersion @relation(fields: [rubricVersionId], references: [id])
  org          Organization   @relation(fields: [orgId], references: [id])
  reviews      Review[]
  attachments  Attachment[]
  tags         SubmissionTag[]
  aggregate    SubmissionAggregate?

  @@index([orgId, formId, submittedAt])
  @@index([submitterEmail])
}

model Attachment {
  id           String @id @default(uuid())
  submissionId String
  url          String
  type         String
  sizeBytes    Int
  createdAt    DateTime @default(now())

  submission Submission @relation(fields: [submissionId], references: [id])
}

model Review {
  id              String   @id @default(uuid())
  submissionId    String
  reviewerUserId  String
  submittedAt     DateTime?
  isSuperseded    Boolean @default(false)

  submission Submission @relation(fields: [submissionId], references: [id])
  reviewer   User       @relation(fields: [reviewerUserId], references: [id])
  revisions  ReviewRevision[]

  @@unique([submissionId, reviewerUserId])
  @@index([submissionId])
}

model ReviewRevision {
  id          String   @id @default(uuid())
  reviewId    String
  createdAt   DateTime @default(now())
  scoresJson  Json     // {questionId: number,...}
  commentText String?

  review Review @relation(fields: [reviewId], references: [id])
}

model VisibilityPolicy {
  id               String @id @default(uuid())
  formId           String
  mode             VisibilityMode
  revealThreshold  Int?
  form             Form @relation(fields: [formId], references: [id])
}

model SubmissionAggregate {
  submissionId   String @id
  reviewsCount   Int    @default(0)
  compositeScore Float? // weighted average
  lastReviewAt   DateTime?

  submission Submission @relation(fields: [submissionId], references: [id])
  @@index([compositeScore])
}

model Tag {
  id     String @id @default(uuid())
  orgId  String
  label  String
  color  String
  org    Organization @relation(fields: [orgId], references: [id])

  @@unique([orgId, label])
}

model SubmissionTag {
  submissionId String
  tagId        String
  submission   Submission @relation(fields: [submissionId], references: [id])
  tag          Tag        @relation(fields: [tagId], references: [id])

  @@id([submissionId, tagId])
}

model AuditLog {
  id           String   @id @default(uuid())
  orgId        String
  actorUserId  String?
  action       String
  targetType   String
  targetId     String?
  metadataJson Json?
  createdAt    DateTime @default(now())

  actor User? @relation("AuditActor", fields: [actorUserId], references: [id])
  org   Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, createdAt])
}

model FeatureFlag {
  id      String  @id @default(uuid())
  key     String
  valueJson Json
  orgId   String?
  formId  String?

  @@index([key])
}

model DomainEvent {
  id          String   @id @default(uuid())
  orgId       String
  type        String   // submission.created, review.submitted, form.published
  payloadJson Json
  occurredAt  DateTime @default(now())
  processedAt DateTime?
  @@index([orgId, type, occurredAt])
}
```

---

## 9) Database Migrations, Indexes & RLS

**Migrations**

* Use Prisma for schema; add **raw SQL** migrations for:

  * RLS policies (optional but recommended).
  * Triggers to maintain `SubmissionAggregate` (or update via worker on review submit).

**RLS (optional, recommended for belt‑and‑suspenders)**
Add once you’re stable with app‑layer guards:

```sql
-- Example: RLS policy using app.current_org_id
ALTER TABLE "Submission" ENABLE ROW LEVEL SECURITY;

CREATE POLICY submission_tenant_isolation
ON "Submission"
USING (orgId = current_setting('app.current_org_id', true));

-- In request lifecycle (per connection):
-- SET LOCAL app.current_org_id = '...';
```

**Aggregates trigger (option A, DB‑level)**

```sql
CREATE OR REPLACE FUNCTION update_submission_aggregate()
RETURNS TRIGGER AS $$
BEGIN
  -- recompute reviewsCount, compositeScore
  UPDATE "SubmissionAggregate" sa
  SET reviewsCount = (SELECT COUNT(*) FROM "Review" r WHERE r."submissionId" = NEW."submissionId" AND r."submittedAt" IS NOT NULL),
      compositeScore = (
        SELECT AVG((rv.scoresJson->>q.key)::NUMERIC)
        FROM "Review" r
        JOIN "ReviewRevision" rv ON rv."reviewId" = r.id
        CROSS JOIN LATERAL jsonb_each_text(rv.scoresJson) q
        WHERE r."submissionId" = NEW."submissionId" AND r."submittedAt" IS NOT NULL
      ),
      lastReviewAt = NOW()
  WHERE sa."submissionId" = NEW."submissionId";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_submit
AFTER UPDATE OF "submittedAt" ON "Review"
FOR EACH ROW
WHEN (NEW."submittedAt" IS NOT NULL)
EXECUTE FUNCTION update_submission_aggregate();
```

*(Alternative: do this logic in the worker on `review.submitted` event — see §13.)*

---

## 10) Auth, Sessions & RBAC Guards

**Strategy:** In‑app auth (email+password) with **Lucia**. Passwords hashed with **Argon2id**. HttpOnly cookie sessions, rotation on use.

**Invite & Reset tokens:** single‑use, hashed, 30‑minute expiry.

**Guards (centralized):**

```ts
// src/lib/rbac.ts
export async function requireAuth(cookies): Promise<{user: User}> { /* lucia validateRequest */ }
export async function requireOrgRole(orgId: string, roles: Role[], user: User) { /* check membership */ }
export function requireSuperAdmin(user: User) { if (!user.isSuperAdmin) throw new Error('403'); }
```

**Org context setting:**
On each org‑scoped API call, resolve `orgId` and set:

* app guard: ensure `membership` exists.
* (If RLS enabled) run `SET LOCAL app.current_org_id = $orgId` on the connection for that request.

---

## 11) API Surface (Routes, Types, Contracts)

**Conventions**

* REST, JSON, typed with **Zod**.
* Cursor pagination (`cursor`, `limit`).
* All org routes are `/api/org/:orgId/...`; server validates membership.

### 11.1 Public

**GET `/api/public/forms/:orgSlug/:formSlug`**
→ Returns public metadata + **published** `FormVersion` and `RubricVersion` (ids + schema subset).

**POST `/api/public/forms/:orgSlug/:formSlug/submissions`**

```ts
// Request (Zod)
const SubmissionCreate = z.object({
  submitterEmail: z.string().email(),
  data: z.record(z.any()),
  honeypot: z.string().optional(), // must be empty
  turnstileToken: z.string()
});

// Response
{ id: string, submittedAt: string }
```

Server:

* Validate Turnstile.
* Select current `published` FormVersion + RubricVersion.
* Insert `Submission` (status `ungraded`).
* Emit `submission.created` event.

### 11.2 Auth

**POST `/api/auth/login`** → start session.
**POST `/api/auth/logout`**.
**POST `/api/auth/invite`** (org admin) → sends invite email.
**POST `/api/auth/accept-invite`** → sets password, links membership.
**POST `/api/auth/reset`** + `/api/auth/reset/confirm`.

### 11.3 Org Admin

**GET `/api/org/:orgId/forms`** (list).
**POST `/api/org/:orgId/forms`** → create (status draft).
**PATCH `/api/forms/:formId`** → edit basics, visibility mode/threshold, minReviews.
**POST `/api/forms/:formId/publish`** → create new `FormVersion` and `RubricVersion` from draft JSON; mark `publishedAt`.
**GET `/api/forms/:formId/submissions?cursor&limit&filters`** → paginated list; supports JSONB filters for common paths.
**GET `/api/submissions/:submissionId`** → submission + my review if any + aggregates; others’ reviews gated by policy.
**GET `/api/forms/:formId/export.csv`** → standard export; streaming.

**Users**

* **GET `/api/org/:orgId/users`**, **POST `/api/org/:orgId/users/invite`**, **PATCH** role, **DELETE** membership.

**Audit**

* **GET `/api/org/:orgId/audit?cursor`**.

### 11.4 Reviewers

**GET `/api/org/:orgId/review-queue?cursor&limit`** → submissions I haven’t graded; least‑reviewed first.
**POST `/api/submissions/:submissionId/reviews`**

```ts
// Body
const ReviewUpsert = z.object({
  scores: z.record(z.number().int()), // {questionId: score}
  commentText: z.string().optional(),
  submit: z.boolean().default(false)
});
```

Server:

* Upsert my `Review` (create if none).
* Always create new `ReviewRevision` (append‑only).
* If `submit=true`, set `submittedAt` now, recompute `SubmissionAggregate`, emit `review.submitted`.

**GET `/api/submissions/:submissionId/reviews`** → returns:

* `myReview` (always if exists),
* `others` **only** if policy unlock is satisfied (see §12).

---

## 12) Visibility Policy Logic

**Policy enum**

* `REVEAL_AFTER_ME_SUBMIT` (default): reviewer must have a submitted review for that submission to see others.
* `REVEAL_AFTER_MIN_REVIEWS`: reveal when submission’s `reviewsCount >= minReviewsRequired`.
* `NEVER`: never reveal others’ reviews/comments (admins can override).
* `AVERAGES_ONLY_UNTIL_LOCK`: show aggregate averages (no raw reviews) until submission reaches min reviews.

**Server enforcement (pseudocode)**

```ts
function canSeeOthers(user, submission, policy): boolean {
  if (user.isSuperAdmin) return true;
  if (!isMemberOf(user, submission.orgId)) return false;

  switch (policy.mode) {
    case 'REVEAL_AFTER_ME_SUBMIT':
      return hasSubmittedReview(user.id, submission.id);
    case 'REVEAL_AFTER_MIN_REVIEWS':
      return submission.aggregate?.reviewsCount >= submission.form.minReviewsRequired;
    case 'NEVER':
      return false;
    case 'AVERAGES_ONLY_UNTIL_LOCK':
      return submission.aggregate?.reviewsCount >= submission.form.minReviewsRequired
        ? true : false;
  }
}
```

---

## 13) Events, Jobs & Aggregates

**Domain events**

* `submission.created` (payload: submissionId, formId, orgId, timestamp)
* `review.submitted` (reviewId, submissionId, orgId, timestamp)
* `form.published` (formId, orgId, versions)

**Event bus**

* Append to `DomainEvent` table synchronously.
* Background **worker** (BullMQ) polls new events, processes:

  * recompute aggregates (if not done by DB trigger),
  * send reviewer/admin notifications (future),
  * fan‑out to webhooks (future).

**Queues**

* `events` → process sequentially per org (job key: `orgId`).
* Retries with exponential backoff; DLQ table on persistent failure.

---

## 14) Security, Privacy & Abuse Prevention

* **Passwords:** Argon2id.
* **Sessions:** HttpOnly, Secure, SameSite=Lax. Rotate on use; revoke on password change.
* **CSRF:** Double‑submit token on state‑changing endpoints (or built‑in framework guard).
* **CORS:** Locked to app origins.
* **Headers:** HSTS, X‑Content‑Type‑Options, Frame‑Options (deny except for form pages if needed).
* **RLS:** Optional but recommended. Always enforce app‑layer org checks.
* **Spam:** Turnstile + honeypot + per‑IP/email throttles; org‑level circuit breaker.
* **PII:** No sensitive categories expected; still encrypt at rest (DB) and in transit (TLS).
* **Impersonation:** Only Super Admin → prominent banner; audit event.
* **Audit:** Log login, invites, role changes, form publishes, review submits, export downloads.

---

## 15) Observability, Logging & Alerts

* **Sentry:** Client + server error capture.
* **OTEL:** Trace key spans (submission, review submit, export, publish).
* **Structured logs:** JSON with orgId, userId (if present), route, latency, status.
* **Alerts:** 5xx rate spikes, latency SLO breach (p95), abnormal throttling, RLS denials.
* **Dashboards:** Submissions/day, reviews/day, average review latency, error rates.

---

## 16) Performance & Scalability

* **Indexes:** See schema notes; JSONB GIN for common fields; composite indexes `(orgId, formId, submittedAt)`.
* **Pagination:** Cursor‑based everywhere.
* **DB Pooling:** Neon pooler or PgBouncer.
* **N+1:** Avoid; collocate aggregation on server.
* **Materialization:** `SubmissionAggregate` for list performance.
* **Caching:** Short‑lived in‑memory cache for public form metadata (60s).

---

## 17) Testing Strategy

* **Unit (Vitest):** guards, policy logic, helpers.
* **Integration (Testcontainers):** Prisma migrations, repository functions, review submit flow updates aggregates.
* **E2E (Playwright):**

  * Public submission → visible in admin list.
  * Reviewer cannot see others → submits → can see others.
  * Org isolation: user from org A cannot view org B submission.
  * Export CSV shape stable.
* **Security tests:** rate limits, CAPTCHA bypass attempts, auth boundary (403s).

---

## 18) CI/CD & Deploy

**CI (GitHub Actions)**

1. `pnpm i && pnpm typecheck && pnpm test`
2. Start Postgres (services) or Testcontainers.
3. `prisma migrate deploy` against ephemeral DB (Neon branch or container).
4. Build Next.js.
5. Playwright E2E (optional per PR).
6. On main: deploy to **Vercel** (web/API); deploy **worker** to **Fly.io**.

**Runtime**

* **Vercel:** Next.js site; API routes stateless; connect to Neon.
* **Fly.io worker:** long‑running BullMQ processors; use Redis + Neon; environment variables mirrored.

**Backups**

* Enable daily snapshots + PITR on managed Postgres.

---

## 19) Seeding & Sample Data

**Seed script (`prisma/seed.ts`)**

* Creates 1 Super Admin from:

  * `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD`
* Creates sample org “Acme”, 1 admin, 1 reviewer.
* Creates 1 draft form with sample schema + rubric.

```ts
// pseudo
await prisma.user.upsert({... isSuperAdmin: true ...})
await prisma.organization.create(...)
await prisma.membership.create(...)
await prisma.form.create(...)
await prisma.formVersion.create({ publishedAt: new Date() })
await prisma.rubricVersion.create({ publishedAt: new Date() })
```

---

## 20) Roadmap (MVP → v1.2)

**MVP (v1.0)**

* Multi‑tenant orgs, email+password auth, invites.
* Bespoke public forms backed by schema; required email; CAPTCHA; throttles.
* Review flow (open pool), configurable scale + weights; internal comments.
* Visibility unlock after submit; policy enum foundation.
* Admin portal: counts, list/detail, basic analytics, exports.
* Audit log; events; aggregates; error tracking.

**v1.1**

* Magic link sign‑in, email verification for submitters.
* Attachments (S3) + AV scan (Lambda/ClamAV).
* Slack notifications; reviewer reminders.
* Saved views/filters; bulk tagging.

**v1.2**

* Advanced dashboards; reviewer consistency metrics.
* Custom domains per org/form.
* 2FA for admins; IP allowlist (optional).
* Webhooks for submissions/reviews.

---

## Appendix A — Example JSON Payloads

**Form metadata (public GET)**

```json
{
  "form": {
    "id": "f_123",
    "name": "Innovation Challenge",
    "status": "open",
    "openAt": "2025-10-01T00:00:00Z",
    "closeAt": "2025-11-01T00:00:00Z"
  },
  "formVersion": { "id": "fv_1", "version": 3 },
  "rubricVersion": {
    "id": "rv_1",
    "version": 2,
    "scale": { "min": 1, "max": 5, "step": 1 },
    "questions": [
      {"id":"q1","label":"Strategic fit","weight":0.4,"required":true},
      {"id":"q2","label":"Feasibility","weight":0.3,"required":true},
      {"id":"q3","label":"Impact","weight":0.3,"required":true}
    ]
  }
}
```

**Submission create (public POST)**

```json
{
  "submitterEmail": "founder@example.com",
  "data": {
    "company": "Example Co",
    "idea": "AI-driven shade finder",
    "website": "https://example.com"
  },
  "turnstileToken": "abc..."
}
```

**Review upsert (reviewer POST)**

```json
{
  "scores": { "q1": 5, "q2": 3, "q3": 4 },
  "commentText": "Strong fit; feasibility medium.",
  "submit": true
}
```

**Submissions list (admin GET)**

```json
{
  "items": [
    {
      "id": "s_1",
      "submittedAt": "2025-10-10T12:00:00Z",
      "submitterEmail": "x@y.com",
      "aggregate": { "reviewsCount": 2, "compositeScore": 4.2 }
    }
  ],
  "nextCursor": "s_1"
}
```

---

## Appendix B — Acceptance Criteria

**Public Submission**

* Given an open form, when a user submits with valid CAPTCHA and email, then a `Submission` is stored with `formVersionId`/`rubricVersionId`, status `ungraded`, and an event `submission.created` is emitted.
* Submissions with honeypot filled or over throttle limits return 429/400.

**Visibility Unlock**

* Reviewer A opening submission before grading: sees **only their input area** and aggregate stats **only** if policy allows; no others’ reviews/comments.
* After Reviewer A submits, they can fetch and view **all other reviews and comments** when policy is `REVEAL_AFTER_ME_SUBMIT`.

**Org Isolation**

* A user not in `orgId` cannot fetch any resource in that org (403).
* Super Admin can impersonate; audit event logged.

**Exports**

* CSV columns are documented and stable across minor releases.

**Audit**

* Form publish, review submit, invite, login are present with actor and timestamp.

---

# Implementation Notes (for the coding agent)

### A) Next.js + shadcn wiring

* Use App Router; colocate route handlers under `src/app/api/...`.
* Install shadcn components as local files; do **not** modify without PRs.
* Use `class-variance-authority` & `tailwind-merge` for variants.
* Use **RHF + Zod** for all forms (admin + review).

### B) Guards & context

* In each org route handler:

  1. `const { user } = await requireAuth(cookies);`
  2. Resolve `orgId` from param → verify membership.
  3. (If RLS) set `SET LOCAL app.current_org_id = $orgId` on the connection (Prisma: `prisma.$executeRaw` at start of request).

### C) Visibility decisions

* Centralize in `src/lib/visibility.ts`.
* Route `/api/submissions/:id/reviews` calls `canSeeOthers(...)` and either returns:

  * `{ myReview, others: [] }` or
  * `{ myReview, others: [...] }`
* If `AVERAGES_ONLY_UNTIL_LOCK`, include `aggregate` and omit `others` until threshold.

### D) Aggregates

* Prefer worker approach for clarity: on `review.submitted`, recompute `SubmissionAggregate` with a single SQL upsert.
* Admin list uses `JOIN SubmissionAggregate` for sort by composite score.

### E) Exports

* Stream CSV (`Content-Disposition: attachment`) with stable columns:
  `submissionId, submittedAt, submitterEmail, compositeScore, reviewsCount, q1, q2, q3, ...`

### F) Theming

* On admin pages, set CSS vars from org theme (stored on `Organization` later if desired).
* Public form pages can import a bespoke stylesheet per form, but **always** post to shared API with schema validation.

---

## Quick Code Snippets

**Auth helper (Lucia)**

```ts
// src/lib/auth.ts
import { lucia } from "lucia";
import { nextjs } from "lucia/middleware";
import { prismaAdapter } from "@lucia-auth/adapter-prisma";

export const auth = lucia({
  adapter: prismaAdapter(prisma),
  middleware: nextjs(),
  env: process.env.NODE_ENV === "production" ? "PROD" : "DEV",
  sessionCookie: { name: "inform_session", attributes: { sameSite: "lax", secure: true, httpOnly: true } }
});
```

**Require auth & role**

```ts
// src/lib/rbac.ts
export async function requireAuth(cookies) {
  const session = await auth.validateRequest(cookies);
  if (!session?.user) throw new Response("Unauthorized", { status: 401 });
  return { user: session.user };
}

export async function requireOrgRole(orgId: string, roles: Role[], user: User) {
  const membership = await prisma.membership.findUnique({ where: { userId_orgId: { userId: user.id, orgId } }});
  if (!membership || !roles.includes(membership.role)) throw new Response("Forbidden", { status: 403 });
  return membership.role;
}
```

**Public submission handler**

```ts
// src/app/api/public/forms/[orgSlug]/[formSlug]/route.ts
import { z } from "zod";
import { validateTurnstile } from "@/lib/turnstile";
import { prisma } from "@/lib/db";

const SubmissionCreate = z.object({
  submitterEmail: z.string().email(),
  data: z.record(z.any()),
  honeypot: z.string().optional(),
  turnstileToken: z.string()
});

export async function POST(req: Request, { params }: { params: { orgSlug: string; formSlug: string } }) {
  const body = await req.json();
  const input = SubmissionCreate.parse(body);

  if (input.honeypot) return new Response("Bad Request", { status: 400 });
  const ok = await validateTurnstile(input.turnstileToken, req.headers.get("cf-connecting-ip"));
  if (!ok) return new Response("Captcha failed", { status: 400 });

  const form = await prisma.form.findFirst({
    where: { slug: params.formSlug, org: { slug: params.orgSlug }, status: "open" },
    include: {
      versions: { where: { publishedAt: { not: null } }, orderBy: { version: "desc" }, take: 1 },
      rubricVersions: { where: { publishedAt: { not: null } }, orderBy: { version: "desc" }, take: 1 }
    }
  });
  if (!form || form.versions.length === 0 || form.rubricVersions.length === 0) return new Response("Not Found", { status: 404 });

  const fv = form.versions[0], rv = form.rubricVersions[0];

  const submission = await prisma.submission.create({
    data: {
      orgId: form.orgId,
      formId: form.id,
      formVersionId: fv.id,
      rubricVersionId: rv.id,
      submitterEmail: input.submitterEmail,
      dataJson: input.data,
      status: "ungraded",
      aggregate: { create: {} }
    },
    include: { aggregate: true }
  });

  await prisma.domainEvent.create({
    data: { orgId: form.orgId, type: "submission.created", payloadJson: { submissionId: submission.id, formId: form.id } }
  });

  return Response.json({ id: submission.id, submittedAt: submission.submittedAt });
}
```

**Reviews fetch with policy**

```ts
// src/app/api/submissions/[submissionId]/reviews/route.ts
import { canSeeOthers } from "@/lib/visibility";

export async function GET(req: Request, { params }: { params: { submissionId: string } }) {
  const { user } = await requireAuth(cookies());
  const submission = await prisma.submission.findUnique({
    where: { id: params.submissionId },
    include: { form: true, aggregate: true }
  });
  if (!submission) throw new Response("Not Found", { status: 404 });
  await requireOrgRole(submission.orgId, ["org_admin", "reviewer", "viewer"], user);

  const myReview = await prisma.review.findUnique({ where: { submissionId_reviewerUserId: { submissionId: submission.id, reviewerUserId: user.id } }, include: { revisions: true }});
  const policy = { mode: submission.form.visibilityMode, threshold: submission.form.visibilityThreshold };

  let others = [];
  if (await canSeeOthers(user, submission, policy)) {
    others = await prisma.review.findMany({
      where: { submissionId: submission.id, NOT: { reviewerUserId: user.id }, submittedAt: { not: null } },
      include: { revisions: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
  }
  return Response.json({ myReview, others, aggregate: submission.aggregate });
}
```
