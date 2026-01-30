# Deployment & Environment Documentation

This document describes the complete deployment architecture, environment setup, and CI/CD pipeline for the Storage & Box Organizer application.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Environments](#environments)
- [Git Branching Strategy](#git-branching-strategy)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environment Variables](#environment-variables)
- [Supabase Configuration](#supabase-configuration)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DEV (Local)              TEST (Self-hosted)         PROD (Vercel)         │
│   ┌──────────┐             ┌──────────┐               ┌──────────┐          │
│   │  Astro   │             │  Docker  │               │  Vercel  │          │
│   │  (Node)  │             │  (Node)  │               │ Serverless│          │
│   └────┬─────┘             └────┬─────┘               └────┬─────┘          │
│        │                        │                          │                │
│        ▼                        ▼                          ▼                │
│   ┌──────────┐             ┌──────────┐               ┌──────────┐          │
│   │ Supabase │             │ Supabase │               │ Supabase │          │
│   │  Local   │             │   TEST   │               │   PROD   │          │
│   │(optional)│             │ (remote) │               │ (remote) │          │
│   └──────────┘             └──────────┘               └──────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | DEV | TEST | PROD |
|-----------|-----|------|------|
| **Runtime** | Astro Dev Server | Docker + Node.js | Vercel Serverless |
| **Adapter** | `@astrojs/node` | `@astrojs/node` | `@astrojs/vercel` |
| **Database** | Local Supabase or Remote | Remote Supabase (TEST) | Remote Supabase (PROD) |
| **URL** | `localhost:3000` | Custom domain/IP | `storagebox.daci.info` |

---

## Environments

### 1. Development (DEV)

**Purpose:** Local development and testing

**Setup:**
```bash
# Start local development server
npm run dev

# Or with remote TEST Supabase
npm run dev:remote
```

**Configuration:**
- Uses `.env` file for local Supabase or `.env.test` for remote
- Astro runs with `@astrojs/node` adapter
- Hot reload enabled
- Console logging with pretty format

**Environment File:** `.env`
```env
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<local-service-role-key>
```

### 2. Test (TEST)

**Purpose:** Pre-production testing on self-hosted server

**Infrastructure:**
- Self-hosted Linux server
- Docker container running Node.js
- Connected to TEST Supabase project

**Deployment Trigger:** Push to `test` branch

**URL:** Configured via `TEST_URL` GitHub variable

**Build Command:**
```bash
npm run build:test  # Sets BUILD_TARGET=node
```

### 3. Production (PROD)

**Purpose:** Live production environment

**Infrastructure:**
- Vercel serverless platform
- Edge functions for optimal performance
- Connected to PROD Supabase project

**Deployment Trigger:** Push to `master` branch

**URL:** `https://storagebox.daci.info`

**Build Command:**
```bash
npm run build:prod  # Sets BUILD_TARGET=vercel
```

---

## Git Branching Strategy

```
master (PROD)  ◄──────────────────────────────────────┐
    │                                                  │
    │ merge                                           │ merge
    ▼                                                  │
test (TEST)    ◄────────────────────────┐              │
    │                                   │              │
    │ merge                            │              │
    ▼                                   │              │
development    ◄── feature branches ───┘              │
                                                       │
Pull Request to master ────────────────────────────────┘
```

### Branch Flow

| Branch | Environment | Auto-Deploy | Notes |
|--------|-------------|-------------|-------|
| `development` | - | No | Active development |
| `test` | TEST | Yes | Push triggers Docker deployment |
| `master` | PROD | Yes | Push triggers Vercel deployment |
| `feature/*` | - | No | Feature branches |
| PR to `master` | Preview | Yes | Vercel preview deployment |

---

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CI/CD PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Push to 'test'          Push to 'master'         PR to 'master'            │
│       │                        │                        │                   │
│       ▼                        ▼                        ▼                   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │ deploy-test │         │deploy-prod  │         │deploy-preview│           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│       │                        │                        │                   │
│       ▼                        ▼                        ▼                   │
│  1. npm ci               1. npm ci               1. npm ci                  │
│  2. build:test           2. vercel pull          2. vercel pull             │
│  3. docker build         3. vercel build --prod  3. vercel build            │
│  4. scp to server        4. vercel deploy --prod 4. vercel deploy           │
│  5. docker compose up                            5. Comment PR URL          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### TEST Deployment Job

1. **Checkout** repository
2. **Setup Node.js** (version from `.nvmrc`)
3. **Install dependencies** (`npm ci`)
4. **Build for TEST** (`BUILD_TARGET=node`)
5. **Build Docker image** with commit SHA tag
6. **SCP** image and docker-compose to server
7. **SSH** and run `docker compose up`

### PROD Deployment Job

1. **Checkout** repository
2. **Setup Node.js** (version from `.nvmrc`)
3. **Install Vercel CLI**
4. **Pull Vercel environment**
5. **Build for Vercel** (`BUILD_TARGET=vercel`)
6. **Deploy** to Vercel production

### Preview Deployment Job (PRs)

1. Same as PROD but deploys to preview URL
2. **Comments** preview URL on the PR

---

## Environment Variables

### GitHub Secrets Required

#### For TEST Deployment
| Secret | Description |
|--------|-------------|
| `TEST_SUPABASE_URL` | TEST Supabase project URL |
| `TEST_SUPABASE_KEY` | TEST Supabase service role key |
| `TEST_SUPABASE_PUBLIC_URL` | TEST Supabase public URL (same as URL) |
| `TEST_SERVER_HOST` | TEST server IP/hostname |
| `TEST_SERVER_USER` | SSH username for TEST server |
| `TEST_SERVER_SSH_KEY` | SSH private key for TEST server |

#### For PROD Deployment
| Secret | Description |
|--------|-------------|
| `PROD_SUPABASE_URL` | PROD Supabase project URL |
| `PROD_SUPABASE_KEY` | PROD Supabase service role key |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### GitHub Variables Required
| Variable | Description |
|----------|-------------|
| `TEST_URL` | Public URL for TEST environment |
| `PROD_URL` | Public URL for PROD (storagebox.daci.info) |

### Vercel Environment Variables

Set via Vercel Dashboard or CLI:

```bash
# Add production environment variables
vercel env add PUBLIC_SUPABASE_URL production
vercel env add PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_KEY production
```

| Variable | Scope | Description |
|----------|-------|-------------|
| `PUBLIC_SUPABASE_URL` | Production | Supabase URL (embedded in client JS) |
| `PUBLIC_SUPABASE_ANON_KEY` | Production | Supabase anon key (embedded in client JS) |
| `SUPABASE_URL` | Production | Supabase URL (server-side) |
| `SUPABASE_KEY` | Production | Supabase service role key (server-side) |

---

## Supabase Configuration

### Projects Structure

| Project | Reference ID | Purpose |
|---------|--------------|---------|
| StorageBox-TEST | `zcrzdvtmueviiajrfhuy` | Testing environment |
| StorageBox-PROD | `wieckrorvuejdjzonhau` | Production environment |

### Required Supabase Settings

#### Authentication > URL Configuration

| Setting | Value |
|---------|-------|
| **Site URL** | `https://storagebox.daci.info` |
| **Redirect URLs** | `https://storagebox.daci.info/auth/callback` |

#### Authentication > Providers > Email

| Setting | Value |
|---------|-------|
| Enable Email Signup | ON |
| Confirm email | ON (recommended) or OFF |
| Secure email change | ON |

### Database Migrations

Push migrations to remote Supabase:

```bash
# Link to project (one-time)
npx supabase link --project-ref <project-ref>

# Push migrations
npx supabase db push
```

---

## Manual Deployment

### Deploy to PROD (Vercel) Manually

```bash
# Ensure you're on master branch
git checkout master

# Deploy to production
vercel --prod

# Or with explicit env vars
vercel --prod --env PUBLIC_SUPABASE_URL=https://xxx.supabase.co
```

### Deploy to TEST Manually

```bash
# Build locally
npm run build:test

# Build Docker image
docker build -t storage-organizer:manual .

# Save and transfer
docker save storage-organizer:manual | gzip > image.tar.gz
scp image.tar.gz docker-compose.test.yml user@test-server:/opt/storage-organizer/

# SSH and deploy
ssh user@test-server
cd /opt/storage-organizer
gunzip -c image.tar.gz | docker load
docker compose -f docker-compose.test.yml down
docker compose -f docker-compose.test.yml up -d
```

---

## Troubleshooting

### Common Issues

#### 1. Blank Page / 500 Error on PROD

**Cause:** Missing or incorrect environment variables

**Solution:**
```bash
# Check Vercel env vars
vercel env ls production

# Add missing vars
vercel env add PUBLIC_SUPABASE_URL production
vercel env add PUBLIC_SUPABASE_ANON_KEY production

# Redeploy
vercel --prod
```

#### 2. Registration Fails with "Load failed"

**Cause:** Wrong Supabase URL (localhost instead of production)

**Check Browser Console for:**
```
Fetch API cannot load http://127.0.0.1:54321/auth/v1/signup
```

**Solution:** Set correct `PUBLIC_SUPABASE_URL` in Vercel and redeploy

#### 3. Logger Error: "EROFS: read-only file system"

**Cause:** File logging attempted on Vercel's read-only filesystem

**Solution:** Logger automatically detects Vercel via `process.env.VERCEL` and disables file logging. Ensure latest code is deployed.

#### 4. Email Confirmation Lands on Wrong Page

**Cause:** Supabase redirect URL not configured

**Solution:**
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Set Redirect URLs: `https://storagebox.daci.info/auth/callback`

#### 5. Docker Container Won't Start on TEST

**Check logs:**
```bash
docker logs storage-organizer-app
```

**Common fixes:**
- Verify `.env` file exists on server
- Check network connectivity to Supabase
- Ensure port 3000 is not in use

### Useful Commands

```bash
# View Vercel deployment logs
vercel logs <deployment-url>

# List recent deployments
vercel ls

# Inspect deployment
vercel inspect <deployment-url>

# View Supabase projects
npx supabase projects list

# Check Supabase API keys
npx supabase projects api-keys --project-ref <ref>

# Push database migrations
npx supabase db push --linked
```

---

## File Structure Reference

```
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── .env                        # Local development (git-ignored)
├── .env.example               # Environment template
├── .env.test                  # TEST environment config
├── astro.config.mjs           # Astro config with dynamic adapter
├── Dockerfile                 # Docker build for TEST
├── docker-compose.test.yml    # Docker compose for TEST
├── package.json               # Build scripts
└── src/
    ├── middleware/
    │   └── index.ts           # Auth middleware
    ├── pages/
    │   ├── index.astro        # Redirects to /auth or /app
    │   └── auth/
    │       ├── index.astro    # Login/Register page
    │       └── callback.astro # Email confirmation handler
    └── lib/
        └── services/
            └── logger.ts      # Winston logger (serverless-aware)
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build for TEST | `npm run build:test` |
| Build for PROD | `npm run build:prod` |
| Deploy to PROD | `vercel --prod` |
| Check Vercel env | `vercel env ls production` |
| Add Vercel env | `vercel env add <NAME> production` |
| Push DB migrations | `npx supabase db push --linked` |
| View PROD logs | `vercel logs <url>` |