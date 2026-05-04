# Tmail Suite

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io-2496ED?logo=docker&logoColor=white)](https://github.com/mrizkihidayat66/tmail-suite/pkgs/container/tmail-suite)

Tmail Suite is a self-hosted temporary email management system built as a single Next.js fullstack application. It connects to a Google Workspace catch-all mailbox via Gmail API and automatically routes incoming emails to the correct temporary accounts — no external mail server required.

Designed for teams and developers who need disposable email addresses at scale: create accounts in bulk, set TTLs, assign labels, and access all incoming mail through a clean dashboard or REST API. Everything runs in a single Docker container with SQLite as the database, making it trivial to deploy and maintain.

## Features

- **Temporary accounts** — create email accounts with configurable TTLs (or permanent), labels, notes, and custom passwords
- **Automatic inbox** — Gmail is polled every 30 seconds (configurable); new emails appear in the dashboard without any manual refresh
- **Bulk generation** — create up to 100 accounts at once with multiple username styles and password options
- **Multi-domain** — add multiple domains in settings; all route through the same Gmail catch-all via Google Workspace alias routing
- **REST API** — full API with API key authentication for programmatic access and integrations
- **Audit log** — all admin actions are recorded with actor, target, and timestamp
- **Force password change** — default admin credentials trigger a mandatory password change on first login
- **Single container** — one Docker image, one SQLite database, no external services beyond Google Workspace

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | SQLite via Prisma ORM |
| Auth | Session tokens (DB-backed) |
| Gmail | OAuth2 user consent flow |
| Background | node-cron (in-process scheduler) |
| UI | Tailwind CSS + React Query |
| Container | Docker (single image, multi-arch) |
| CI/CD | GitHub Actions → GHCR |

## Project Structure

```
tmail-suite/
├── src/
│   ├── app/
│   │   ├── api/v1/              # REST API routes
│   │   │   ├── accounts/        # account CRUD, bulk, export
│   │   │   ├── admin/           # stats, health, config, users, domains, audit-log
│   │   │   ├── api-keys/        # API key management
│   │   │   ├── auth/            # login, logout, me
│   │   │   ├── domains/         # public domain list
│   │   │   ├── emails/          # recent, search
│   │   │   ├── gmail/           # OAuth connect, callback, status
│   │   │   └── utils/           # username/password generators
│   │   ├── dashboard/           # admin UI pages
│   │   │   ├── accounts/        # account list, detail, new
│   │   │   ├── api-keys/
│   │   │   ├── bulk/
│   │   │   ├── logs/
│   │   │   └── settings/        # system, users, domains, config, gmail tabs
│   │   └── login/
│   ├── lib/
│   │   ├── core/                # auth, bootstrap, config, db, errors, middleware, rate-limit, response
│   │   ├── features/            # accounts, admin, api-keys, emails, gmail (client/parser/processor/scheduler)
│   │   └── shared/              # generators (username/password/api-key), utils
│   ├── components/layout/       # AppShell, Sidebar
│   ├── config/                  # env validation (lazy)
│   └── types/                   # shared TypeScript types
├── prisma/
│   └── schema.prisma
├── instrumentation.ts           # server startup: bootstrap + scheduler
├── Dockerfile                   # multi-stage, standalone output
├── docker-compose.yml
└── .github/workflows/docker.yml # build & push to GHCR on push to main / v* tag
```

## Quick Start

### Option A — Docker with pre-built GHCR image (recommended)

The fastest way to get running. No build step required.

```bash
# 1. Create a working directory
mkdir tmail-suite && cd tmail-suite

# 2. Download the compose file
curl -fsSL https://raw.githubusercontent.com/mrizkihidayat66/tmail-suite/main/docker-compose.yml -o docker-compose.yml

# 3. Create .env
cat > .env << 'EOF'
APP_URL=https://yourdomain.com
DOCKER_IMAGE=ghcr.io/mrizkihidayat66/tmail-suite:latest
EOF

# 4. Pull and start
docker compose pull
docker compose up -d
```

Open `https://yourdomain.com` — login with `admin` / `changeme123`. You will be prompted to change the password immediately.

---

### Option B — Docker build from source

Clone the repo and let Docker build the image locally.

```bash
git clone https://github.com/mrizkihidayat66/tmail-suite.git
cd tmail-suite

cp .env.example .env
# Edit APP_URL in .env if not localhost

docker compose up -d --build
```

---

### Option C — Local development

```bash
git clone https://github.com/mrizkihidayat66/tmail-suite.git
cd tmail-suite

cp .env.example .env
npm install
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Only 3 variables needed — everything else is configured from the panel.

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite file path | `file:./db/tmail.db` |
| `APP_URL` | Public base URL of the app | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` |

> **Docker:** `DATABASE_URL`, `NODE_ENV`, and `ATTACHMENTS_DIR` are already set inside the image. You only need `APP_URL` (and optionally `DOCKER_IMAGE` and `PORT`) in your `.env`.

> **Data persistence:** all data is stored in the `tmail-suite_data` named volume mounted at `/root/.tmail-suite/` inside the container:
> - Database: `/root/.tmail-suite/db/tmail.db`
> - Attachments: `/root/.tmail-suite/attachments/`

## First-time Setup

1. Start the app and login with `admin` / `changeme123`
2. You will be redirected to **Settings → Account** to change the default password
3. Go to **Settings → Domains** — add your domain(s)
4. Go to **Settings → Config** — enter your Google OAuth credentials and catch-all email
5. Go to **Settings → Gmail** — click **Connect Gmail** and authorize
6. Start creating temporary accounts

---

## Google Workspace Setup

Tmail Suite requires a Google Workspace account with a catch-all mailbox. All emails sent to any address at your domain are routed to this mailbox, and Tmail picks them up via Gmail API.

### Step 1 — DNS MX Records

In your DNS panel, **remove any existing MX records** and add:

| Name | Type | Priority | Value |
|---|---|---|---|
| @ | MX | 1 | ASPMX.L.GOOGLE.COM |
| @ | MX | 5 | ALT1.ASPMX.L.GOOGLE.COM |
| @ | MX | 5 | ALT2.ASPMX.L.GOOGLE.COM |
| @ | MX | 10 | ALT3.ASPMX.L.GOOGLE.COM |
| @ | MX | 10 | ALT4.ASPMX.L.GOOGLE.COM |
| @ | TXT | — | `v=spf1 include:_spf.google.com ~all` |
| _dmarc | TXT | — | `v=DMARC1; p=none; rua=mailto:catchall@yourdomain.com` |

Wait 15–60 minutes for DNS propagation before testing.

### Step 2 — DKIM

In [Google Workspace Admin → Apps → Gmail → Authenticate email](https://admin.google.com/ac/apps/gmail/authenticateemail):

1. Click **Generate new record** → **Generate**
2. Copy the TXT record value and add it to your DNS:

| Name | Type | Value |
|---|---|---|
| `google._domainkey` | TXT | `v=DKIM1; k=rsa; p=MIIBI...` |

### Step 3 — Google Cloud OAuth Client

Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials):

1. **Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorized redirect URIs:
   - Production: `https://yourdomain.com/api/v1/gmail/callback`
   - Local dev: `http://localhost:3000/api/v1/gmail/callback`
4. Copy `client_id` and `client_secret` — you will enter these in **Settings → Config**

### Step 4 — Google Workspace Catch-all Routing

Go to [Google Workspace Admin → Apps → Gmail → Routing](https://admin.google.com/ac/apps/gmail/routing):

1. Click **Add Rule** under Default routing
2. Configure:
   - **Email messages to affect:** Inbound, Internal - Receiving
   - **Modify message:**
     - Account types: **All inactive and unrecognized accounts**
     - Add header: `X-Gm-Original-To`
     - **Change envelope recipient:** `your-catchall@yourdomain.com`
   - **Envelope filter:** Pattern match → `.*@yourdomain\.com`
3. Save

This routes all mail sent to `*@yourdomain.com` (that isn't a real Workspace user) to your catch-all mailbox.

### Step 5 — Connect Gmail in Panel

1. Go to **Settings → Config**, enter `client_id`, `client_secret`, and the catch-all email address
2. Go to **Settings → Gmail**, click **Connect Gmail**
3. Authorize with the catch-all mailbox Google account
4. Status should show **Connected**

### Verify

Send a test email to any address at your domain (e.g. `test@yourdomain.com`). It should appear in the catch-all mailbox. Tmail will pick it up on the next poll cycle (default: 30 seconds).

---

## Multi-Domain Support

Add multiple domains in **Settings → Domains**. All domains route through the same Gmail catch-all using Google Workspace alias domain routing. When creating accounts, a domain is picked randomly by default, or you can specify one explicitly.

## Username Styles

| Style | Example outputs |
|---|---|
| Random Word (EN) | `nova4821`, `x_nova_83`, `n0va_42` |
| English | `crystal482`, `3m3rald_99`, `99silver` |
| Indonesian | `bintang7734`, `b1nt4ng_42`, `xbintang83` |
| Chinese (Pinyin) | `mingzhu8821`, `m1ngzhu_42`, `99mingzhu` |
| Japanese (Romaji) | `sakura_341`, `s4kura482`, `xsakura83` |
| Adjective + Noun | `swift_falcon`, `sw1ftfalcon`, `swiftfalcon42` |
| Random Chars | `x7k2mq9p`, `x7k_2mq9` |

---

## API Reference

All endpoints are under `/api/v1/`. Responses are JSON. Errors follow `{ error: string, code: string }`.

### Authentication

Most endpoints require a valid session cookie (`token`) obtained from `POST /api/v1/auth/login`. API keys (prefix `tm_`) can also be used via the `Authorization: Bearer <key>` header where supported.

Unauthenticated requests return `401 Unauthorized`.

---

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Login and receive session cookie |
| `POST` | `/api/v1/auth/logout` | Invalidate current session |
| `GET` | `/api/v1/auth/me` | Get current authenticated user |

**POST /api/v1/auth/login**
```json
{ "username": "admin", "password": "yourpassword" }
```
Returns `{ user, mustChangePassword }` and sets `token` cookie.

---

### Domains

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/domains` | — | List active domains (public) |

---

### Accounts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/accounts` | List accounts |
| `POST` | `/api/v1/accounts` | Create a single account |
| `GET` | `/api/v1/accounts/:id` | Get account by ID |
| `PATCH` | `/api/v1/accounts/:id` | Update account |
| `DELETE` | `/api/v1/accounts/:id` | Soft-delete account |
| `POST` | `/api/v1/accounts/bulk` | Bulk create accounts |
| `GET` | `/api/v1/accounts/export` | Export accounts as CSV or JSON |
| `GET` | `/api/v1/accounts/:id/stats` | Get email stats for account |
| `POST` | `/api/v1/accounts/:id/sync` | Trigger Gmail sync for account |
| `POST` | `/api/v1/accounts/:id/reset-password` | Reset account password |

**GET /api/v1/accounts** — query params:

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page, max 100 (default: 20) |
| `search` | string | Filter by email, label, or notes |
| `label` | string | Filter by exact label |
| `status` | `active` \| `expired` | Filter by status |

**POST /api/v1/accounts** — body:

| Field | Type | Description |
|---|---|---|
| `username` | string? | Custom username (auto-generated if omitted) |
| `customPassword` | string? | Min 8 chars (auto-generated if omitted) |
| `displayName` | string? | Display name |
| `ttlHours` | number | Hours until expiry, 0 = permanent (default: 24) |
| `label` | string? | Label for grouping |
| `notes` | string? | Internal notes |
| `domain` | string? | Specific domain (random active domain if omitted) |
| `usernamePattern` | enum? | `random_word` \| `random_chars` \| `adjective_noun` \| `indonesian` \| `chinese` \| `japanese` \| `english` |

**POST /api/v1/accounts/bulk** — body:

| Field | Type | Description |
|---|---|---|
| `count` | number | Number of accounts, max 100 (default: 1) |
| `ttlHours` | number | TTL in hours (default: 24) |
| `label` | string? | Label for all accounts |
| `domain` | string? | Specific domain |
| `usernamePattern` | enum? | Same options as single create |
| `passwordOptions` | object? | `{ length?, includeSymbols?, includeNumbers?, includeUppercase? }` |

**GET /api/v1/accounts/export** — query params: `fmt` (`csv` or `json`), `label` (filter by label)

**PATCH /api/v1/accounts/:id** — body: `{ displayName?, label?, notes?, ttlHours?, isActive? }`

---

### Emails

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/accounts/:id/emails` | List emails for account |
| `GET` | `/api/v1/accounts/:id/emails/:emailId` | Get email detail (marks as read) |
| `PATCH` | `/api/v1/accounts/:id/emails/:emailId` | Mark email read/unread |
| `DELETE` | `/api/v1/accounts/:id/emails/:emailId` | Delete email |
| `GET` | `/api/v1/emails/recent` | List most recent emails across all accounts |
| `GET` | `/api/v1/emails/search` | Search emails by subject, body, or sender |

**GET /api/v1/accounts/:id/emails** — query params: `page`, `limit` (max 100), `unread` (boolean), `subject`, `from`

**PATCH /api/v1/accounts/:id/emails/:emailId** — body: `{ seen: boolean }`

**GET /api/v1/emails/recent** — query params: `limit` (max 100, default: 20)

**GET /api/v1/emails/search** — query params: `q` (required), `accountId` (optional), `limit` (max 200, default: 50)

---

### API Keys

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/api-keys` | List all API keys |
| `POST` | `/api/v1/api-keys` | Create a new API key |
| `PATCH` | `/api/v1/api-keys/:id` | Update key name, description, or active status |
| `DELETE` | `/api/v1/api-keys/:id` | Revoke API key |
| `POST` | `/api/v1/api-keys/:id/rotate` | Rotate key (revoke old, create new) |

**POST /api/v1/api-keys** — body:

| Field | Type | Description |
|---|---|---|
| `name` | string | Key name, max 100 chars |
| `description` | string? | Optional description |
| `scopes` | string[] | Permission scopes (default: `["*"]`) |
| `expiresAt` | ISO datetime? | Optional expiry |

Returns `{ ...key, key: "tm_..." }` — the raw key is only shown once.

---

### Admin

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/stats` | System-wide statistics |
| `GET` | `/api/v1/admin/health` | Health check (database + Gmail status) |
| `GET` | `/api/v1/admin/config` | Get app configuration (sensitive values masked) |
| `PATCH` | `/api/v1/admin/config` | Update app configuration |
| `POST` | `/api/v1/admin/sync-all` | Trigger Gmail sync for all accounts |
| `POST` | `/api/v1/admin/cleanup` | Deactivate all expired accounts |
| `GET` | `/api/v1/admin/audit-log` | List audit log entries |
| `GET` | `/api/v1/admin/users` | List admin users |
| `POST` | `/api/v1/admin/users` | Create admin user |
| `PATCH` | `/api/v1/admin/users/:id` | Update user (displayName, password, isActive) |
| `DELETE` | `/api/v1/admin/users/:id` | Deactivate admin user |
| `GET` | `/api/v1/admin/domains` | List all domains |
| `POST` | `/api/v1/admin/domains` | Add a domain |
| `PATCH` | `/api/v1/admin/domains/:id` | Update domain (domain name, isActive) |
| `DELETE` | `/api/v1/admin/domains/:id` | Remove a domain |

**PATCH /api/v1/admin/config** — body (all fields optional):

| Field | Description |
|---|---|
| `google_client_id` | Google OAuth client ID |
| `google_client_secret` | Google OAuth client secret |
| `google_redirect_uri` | OAuth redirect URI |
| `gmail_catchall_email` | Catch-all mailbox address |
| `gmail_poll_interval` | Poll interval in seconds (min: 10, max: 3600) |

**GET /api/v1/admin/audit-log** — query params: `page`, `limit` (max 200), `action`, `actorType`

---

### Gmail

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/gmail/connect` | Redirect to Google OAuth consent screen |
| `GET` | `/api/v1/gmail/callback` | OAuth callback (handled by Google redirect) |
| `GET` | `/api/v1/gmail/status` | Get Gmail connection status and token info |
| `DELETE` | `/api/v1/gmail/status` | Disconnect Gmail (delete stored token) |

---

### Utils

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/utils/generate-username` | Generate a random username |
| `GET` | `/api/v1/utils/generate-password` | Generate random password(s) |

**GET /api/v1/utils/generate-username** — query params: `pattern` (enum, same as account create)

**GET /api/v1/utils/generate-password** — query params: `count` (max 20), `length` (8–64), `includeSymbols`, `includeNumbers`, `includeUppercase`

---

## Production Operations

### Updating to a new version

```bash
docker compose pull
docker compose up -d
```

Data in the `tmail-suite_data` volume is preserved across updates.

### Logs

```bash
docker logs -f tmail-suite
```

### Backup & Restore

```bash
# Backup — database and attachments
docker run --rm \
  -v tmail-suite_tmail-suite_data:/root/.tmail-suite \
  alpine tar czf - /root/.tmail-suite > backup.tar.gz

# Restore
cat backup.tar.gz | docker run --rm -i \
  -v tmail-suite_tmail-suite_data:/root/.tmail-suite \
  alpine tar xzf - -C /
```

### Version pinning

```bash
# Specific release
DOCKER_IMAGE=ghcr.io/mrizkihidayat66/tmail-suite:v1.0.0 docker compose up -d

# Specific commit SHA
DOCKER_IMAGE=ghcr.io/mrizkihidayat66/tmail-suite:sha-abc1234 docker compose up -d
```

Available tags: `latest`, branch name (e.g. `main`), semver (e.g. `v1.0.0`, `v1.0`), short SHA (e.g. `sha-abc1234`).

---

## CI/CD

Every push to `main` or a `v*` tag triggers GitHub Actions to build and push a multi-arch image (`linux/amd64` + `linux/arm64`) to GHCR automatically.

```bash
# Tag and push a release
git tag v1.0.0
git push origin v1.0.0
```

The workflow file is at `.github/workflows/docker.yml`.

## License

[GPL-3.0](LICENSE) © 2025 tmail-suite contributors
