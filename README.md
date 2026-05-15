# 📧 TMail Suite - Temporary Email Management System

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-290%20passing-brightgreen)]()
[![Docker](https://img.shields.io/badge/Docker-ghcr.io-2496ED?logo=docker&logoColor=white)](https://github.com/mrizkihidayat66/tmail-suite/pkgs/container/tmail-suite)

> Production-ready temporary email management with Gmail integration, API key authentication, and comprehensive REST API.

TMail Suite is a self-hosted temporary email management system built as a single Next.js fullstack application. It connects to a Google Workspace catch-all mailbox via Gmail API and automatically routes incoming emails to the correct temporary accounts — no external mail server required.

Designed for teams and developers who need disposable email addresses at scale: create accounts in bulk, set TTLs, assign labels, and access all incoming mail through a clean dashboard or REST API.

---

## ✨ Features

- 🔐 **Secure Authentication** - Session-based + API key authentication with scope-based permissions
- 📧 **Gmail Integration** - OAuth 2.0 with automatic email sync (configurable interval)
- 🔑 **API Key Management** - Scoped permissions, key rotation, encryption at rest
- 👥 **Multi-Account** - Manage unlimited temporary email accounts with TTLs
- 📊 **Admin Dashboard** - System stats, audit logs, user management, configuration
- 🌐 **REST API** - 42 documented endpoints with OpenAPI/Swagger UI
- 🔒 **Security** - Rate limiting, CSRF protection, scope-based access control
- 🧪 **Well-Tested** - 290 tests (unit, integration, e2e) with 85%+ coverage
- 🚀 **Single Container** - One Docker image, SQLite database, no external dependencies
- 📝 **Audit Logging** - All sensitive operations tracked with actor and timestamp

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm (for local development)
- PostgreSQL 14+ or SQLite (production uses SQLite by default)
- Google Cloud Project (free tier - no credit card required)
- Docker (optional, for containerized deployment)

### Installation

```bash
# Clone repository
git clone https://github.com/mrizkihidayat66/tmail-suite.git
cd tmail-suite

# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Configure environment
cp .env.example .env
# Edit .env with your configuration (see Configuration section)

# Run development server
npm run dev
```

Visit: **http://localhost:3000**

**Default credentials:** `admin` / `changeme123` (you'll be prompted to change on first login)

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tmail"
# Or for SQLite: DATABASE_URL="file:./db/tmail.db"

# Application
APP_URL="http://localhost:3000"
NODE_ENV="development"

# Authentication (generate with: openssl rand -base64 32)
JWT_SECRET="your-secret-key-min-32-chars-CHANGE-THIS"
SESSION_SECRET="your-session-secret-min-32-chars-CHANGE-THIS"

# Encryption for API keys (generate with: openssl rand -base64 32)
ENCRYPTION_KEY="your-encryption-key-32-chars-CHANGE-THIS"

# Google OAuth (see Google Cloud Setup section)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/v1/gmail/callback"

# Optional: Rate Limiting
RATE_LIMIT_LOGIN_MAX=5                    # Max login attempts
RATE_LIMIT_LOGIN_WINDOW_MS=900000         # 15 minutes
RATE_LIMIT_API_MAX=100                    # Max API requests
RATE_LIMIT_API_WINDOW_MS=60000            # 1 minute

# Optional: Email Settings
MAX_ATTACHMENT_SIZE=10485760              # 10MB
EMAIL_BATCH_SIZE=50                       # Emails per batch
GMAIL_POLL_INTERVAL=300                   # 5 minutes (in seconds)

# Optional: Session
SESSION_MAX_AGE_MS=86400000               # 24 hours
SESSION_COOKIE_NAME="token"
```

---


## 📚 API Documentation

### Interactive Documentation

**Scalar API Reference:** http://localhost:3000/api/docs

Modern API documentation with built-in testing capabilities:
- 🎨 **Three-column layout** - Sidebar navigation, documentation, and API client
- 🧪 **Interactive testing** - Send requests directly from the browser (Postman-like)
- 💻 **Code generation** - Copy-paste examples in 20+ languages (cURL, JavaScript, Python, Go, etc.)
- 🔐 **Authentication support** - Configure Bearer tokens and API keys
- 🌙 **Dark mode** - Easy on the eyes
- 🤖 **AI assistant** - Ask questions about endpoints

### Authentication

**Session-based (Web UI):**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

**API Key (Programmatic):**
```bash
curl -H "Authorization: Bearer tm_your_api_key_here" \\
  http://localhost:3000/api/v1/accounts
```

### API Endpoints (42 total)

#### 🔐 Authentication (3 endpoints)
- `POST /api/v1/auth/login` - Login with credentials
- `POST /api/v1/auth/logout` - Logout current session
- `GET /api/v1/auth/me` - Get current user info

#### 👥 Accounts (10 endpoints)
- `GET /api/v1/accounts` - List accounts (paginated, filterable)
- `POST /api/v1/accounts` - Create account
- `GET /api/v1/accounts/:id` - Get account details
- `PATCH /api/v1/accounts/:id` - Update account
- `DELETE /api/v1/accounts/:id` - Delete account
- `POST /api/v1/accounts/bulk` - Bulk create accounts (up to 100)
- `GET /api/v1/accounts/export` - Export accounts (CSV/JSON)
- `POST /api/v1/accounts/:id/reset-password` - Reset password
- `GET /api/v1/accounts/:id/stats` - Account statistics
- `POST /api/v1/accounts/:id/sync` - Trigger Gmail sync

#### 📧 Emails (6 endpoints)
- `GET /api/v1/accounts/:id/emails` - List emails for account
- `GET /api/v1/accounts/:id/emails/:emailId` - Get email details
- `PATCH /api/v1/accounts/:id/emails/:emailId` - Update email (mark read)
- `DELETE /api/v1/accounts/:id/emails/:emailId` - Delete email
- `GET /api/v1/emails/recent` - Recent emails across accounts
- `GET /api/v1/emails/search` - Search emails (full-text)

#### 🔑 API Keys (6 endpoints)
- `GET /api/v1/api-keys` - List API keys
- `POST /api/v1/api-keys` - Create API key with scopes
- `PATCH /api/v1/api-keys/:id` - Update API key metadata
- `DELETE /api/v1/api-keys/:id` - Revoke API key
- `POST /api/v1/api-keys/:id/rotate` - Rotate API key
- `GET /api/v1/api-keys/:id/reveal` - Reveal encrypted key

#### ⚙️ Admin (6 endpoints)
- `GET /api/v1/admin/health` - System health check
- `GET /api/v1/admin/stats` - System statistics
- `GET /api/v1/admin/audit-log` - Audit logs (paginated)
- `POST /api/v1/admin/cleanup` - Cleanup expired accounts
- `POST /api/v1/admin/sync-all` - Sync all Gmail accounts
- `GET /api/v1/admin/config` - Get system config
- `PATCH /api/v1/admin/config` - Update system config

#### 🌐 Domains (5 endpoints)
- `GET /api/v1/domains` - List active domains (public)
- `GET /api/v1/admin/domains` - List all domains (admin)
- `POST /api/v1/admin/domains` - Create domain
- `PATCH /api/v1/admin/domains/:id` - Update domain
- `DELETE /api/v1/admin/domains/:id` - Delete domain

#### 📬 Gmail (4 endpoints)
- `GET /api/v1/gmail/connect` - Initiate OAuth flow
- `GET /api/v1/gmail/callback` - OAuth callback handler
- `GET /api/v1/gmail/status` - Connection status
- `DELETE /api/v1/gmail/status` - Disconnect Gmail

#### 🛠️ Utils (2 endpoints)
- `GET /api/v1/utils/generate-password` - Generate secure passwords
- `GET /api/v1/utils/generate-username` - Generate usernames

### API Scopes

| Scope | Description |
|-------|-------------|
| `*` | Full access (all operations) |
| `accounts:read` | Read account data |
| `accounts:write` | Create/update/delete accounts |
| `emails:read` | Read email data |
| `api-keys:read` | Read API keys |
| `api-keys:write` | Create/update/revoke API keys |
| `admin:*` | Admin operations (stats, config, audit logs) |

### Example: Create Account via API

```bash
curl -X POST http://localhost:3000/api/v1/accounts \\
  -H "Authorization: Bearer tm_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "testuser",
    "domainId": "domain-id-here",
    "password": "SecurePass123!",
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- accounts.test.ts

# Watch mode
npm test -- --watch
```

**Test Coverage:**
- ✅ Unit tests: Core logic, utilities, validators
- ✅ Integration tests: API endpoints, database operations
- ✅ E2E tests: User workflows, security scenarios
- ✅ 290 tests passing, 85%+ coverage

---

## 🚢 Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t tmail-suite .

# Run with docker-compose
docker-compose up -d

# Or run directly
docker run -d \\
  -p 3000:3000 \\
  -v $(pwd)/db:/app/db \\
  -v $(pwd)/.env:/app/.env \\
  --name tmail-suite \\
  tmail-suite
```

### Portainer

```bash
services:
  app:
    image: ghcr.io/mrizkihidayat66/tmail-suite:latest
    container_name: tmail-suite
    restart: unless-stopped
    ports:
      - "8027:8027"
    volumes:
      - data:/root/.tmail-suite
    environment:
      PORT: 8027
      NODE_ENV: production
      DATABASE_URL: "file:/root/.tmail-suite/db/tmail.db"
      ATTACHMENTS_DIR: "/root/.tmail-suite/attachments"
      APP_URL: "http://localhost:8027"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8027/api/v1/domains"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

volumes:
  data:
```

### Manual Deployment

```bash
# Install dependencies
npm ci --production

# Build production
npm run build

# Run database migrations
npx prisma migrate deploy

# Start production server
npm start
```

### Environment Checklist

- [ ] Set strong `JWT_SECRET`, `SESSION_SECRET`, and `ENCRYPTION_KEY`
- [ ] Configure production `DATABASE_URL`
- [ ] Set up Google OAuth with production redirect URI
- [ ] Configure `APP_URL` to your domain
- [ ] Set up SSL/TLS (HTTPS) via reverse proxy (nginx, Caddy)
- [ ] Configure rate limiting for your use case
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Configure backup strategy for database
- [ ] Set up monitoring and alerting
- [ ] Review and adjust `GMAIL_POLL_INTERVAL`

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

### Step 6 — Cloud Identity Free Setup

Tmail Suite only requires one Gmail-enabled Workspace mailbox for the catch-all inbox. Additional users can use **Cloud Identity Free** for Google Sign-In without consuming paid Gmail licenses.

Go to [Google Workspace Admin → Billing → Subscriptions](https://admin.google.com/ac/billing/subscriptions):

1. Click **Buy or upgrade**
2. Enable **Cloud Identity Free**

Go to [Google Workspace Admin → Billing → License settings](https://admin.google.com/ac/billing/licensesettings):

1. Set **Google Workspace Business Starter** auto-assignment to **OFF**

Go to [Google Workspace Admin → Directory → Users](https://admin.google.com/ac/users):

1. Create your users
2. Assign licenses as needed

Recommended setup:

| Account | License |
|---|---|
| catchall@yourdomain.com | Google Workspace Business Starter |
| random1@yourdomain.com | Cloud Identity Free |
| random2@yourdomain.com | Cloud Identity Free |

Notes:
- Cloud Identity Free users can still use **Login with Google**
- Cloud Identity Free users do not receive Gmail inboxes

For automated license provisioning, see the official [Google Admin Licensing API documentation](https://developers.google.com/workspace/admin/licensing/v1/how-tos/products)

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

## 🔒 Security

- ✅ **Authentication**: Session + API key with scope-based access control
- ✅ **Rate Limiting**: Login (5/15min), API (100/min) - configurable
- ✅ **CSRF Protection**: Token validation on state-changing operations
- ✅ **SQL Injection**: Parameterized queries via Prisma ORM
- ✅ **XSS Protection**: Input sanitization, Content Security Policy headers
- ✅ **Encryption**: API keys encrypted at rest (AES-256-GCM)
- ✅ **Audit Logging**: All sensitive operations logged with actor/timestamp
- ✅ **Security Headers**: Helmet.js middleware for HTTP security
- ✅ **Password Hashing**: bcrypt with salt rounds
- ✅ **Session Management**: Secure httpOnly cookies, expiration handling

### Security Best Practices

1. **Change default credentials** immediately after first login
2. **Use strong secrets** for JWT_SECRET, SESSION_SECRET, ENCRYPTION_KEY
3. **Enable HTTPS** in production (use reverse proxy like nginx/Caddy)
4. **Restrict API key scopes** to minimum required permissions
5. **Rotate API keys** regularly (use rotation endpoint)
6. **Monitor audit logs** for suspicious activity
7. **Keep dependencies updated** (`npm audit` regularly)
8. **Backup database** regularly (especially before updates)

---

## 📊 Architecture

### Application Architecture

```
tmail-suite/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/v1/            # REST API endpoints (42 total)
│   │   ├── dashboard/         # Admin dashboard pages
│   │   └── login/             # Login page
│   ├── components/            # React components
│   │   └── layout/            # AppShell, Sidebar
│   ├── lib/
│   │   ├── core/              # Core utilities
│   │   │   ├── auth.ts        # Session management
│   │   │   ├── csrf.ts        # CSRF protection
│   │   │   ├── db.ts          # Prisma client
│   │   │   ├── errors.ts      # Custom error classes
│   │   │   ├── logger.ts      # Structured logging
│   │   │   ├── middleware.ts  # Auth middleware
│   │   │   ├── rate-limit.ts  # Rate limiting
│   │   │   └── response.ts    # Response helpers
│   │   ├── features/          # Feature modules
│   │   │   ├── accounts/      # Account management
│   │   │   ├── admin/         # Admin operations
│   │   │   ├── api-keys/      # API key management
│   │   │   ├── emails/        # Email operations
│   │   │   └── gmail/         # Gmail integration
│   │   │       ├── client.ts  # OAuth & API client
│   │   │       ├── parser.ts  # Email parsing
│   │   │       ├── processor.ts # Email processing
│   │   │       └── scheduler.ts # Background jobs
│   │   └── shared/            # Shared utilities
│   ├── config/                # Configuration
│   │   └── env.ts             # Environment validation
│   └── types/                 # TypeScript types
├── prisma/
│   └── schema.prisma          # Database schema
├── __tests__/                 # Test suites
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
├── instrumentation.ts         # Server startup hook
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Docker Compose config
└── .github/workflows/         # CI/CD pipelines
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React framework |
| Database | SQLite / PostgreSQL | Data persistence via Prisma ORM |
| Authentication | JWT + Sessions | Secure user authentication |
| Gmail API | OAuth 2.0 | Email synchronization |
| Background Jobs | node-cron | Scheduled tasks (polling, cleanup) |
| UI | Tailwind CSS | Utility-first styling |
| API Documentation | Scalar API Reference | Interactive API docs with testing |
| Testing | Jest | Unit, integration, e2e tests |
| Container | Docker | Containerized deployment |
| CI/CD | GitHub Actions | Automated builds and deployments |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow existing code style (ESLint + Prettier)
- Update documentation for API changes
- Keep commits atomic and well-described
- Ensure all tests pass before submitting PR

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Google Gmail API](https://developers.google.com/gmail/api) - Email integration
- [Scalar](https://scalar.com/) - Modern API documentation
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/mrizkihidayat66/tmail-suite/issues)
- 📖 **Documentation**: [API Docs](http://localhost:3000/api/docs)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/mrizkihidayat66/tmail-suite/discussions)

---

## 🗺️ Roadmap

- [ ] Email templates and auto-responders
- [ ] Webhook support for email notifications
- [ ] Multi-language support (i18n)
- [ ] Email forwarding rules
- [ ] Advanced search with filters
- [ ] Email attachments viewer
- [ ] Two-factor authentication (2FA)
- [ ] LDAP/SSO integration
- [ ] Metrics and analytics dashboard
- [ ] Mobile app (React Native)

---

**Made with ❤️ by mrizkihidayat66**

## License

[GPL-3.0](LICENSE) © 2025 tmail-suite contributors
