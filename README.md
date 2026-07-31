# Nexora Standalone

Nexora is now an independent Next.js commerce application. It has no ChatGPT sign-in, Sites runtime, Cloudflare Worker, or hosted-platform dependency.

## Stack

- Next.js 16 and React 19
- PostgreSQL 17 and Drizzle ORM
- App-owned email/password authentication
- Salted scrypt password hashes
- One-hour signed JWT access cookies
- Rotating, revocable 30-day refresh sessions
- Stripe Checkout and signed/idempotent webhooks
- Local private-file storage for development
- Docker Compose for PostgreSQL and local email inspection

## Requirements

- Node.js 22 or newer
- Docker Desktop
- Git (optional)

## Run locally on Windows

1. Open PowerShell in this folder.
2. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Replace `AUTH_SECRET` in `.env.local` with at least 32 random characters. Generate one with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

4. Start PostgreSQL and the local email inbox:

   ```powershell
   docker compose up -d
   ```

5. Install dependencies and migrate the database:

   ```powershell
   npm install
   npm run db:migrate
   ```

6. Start Nexora:

   ```powershell
   npm run dev
   ```

7. Open `http://localhost:3000/admin/setup` and create the first Super Admin.

The storefront is at `http://localhost:3000`, customer login is `/login`, administrator login is `/admin/login`, and team management is `/admin/team`.

## Authentication design

- Passwords are never stored directly. Each password is salted and hashed with scrypt.
- Five consecutive failed attempts lock an account for 15 minutes.
- Access JWTs are signed with `AUTH_SECRET`, restricted to the Nexora issuer/audience, stored only in HTTP-only cookies, and expire after one hour.
- Refresh tokens are random values. Only their SHA-256 hashes are stored in PostgreSQL.
- Logout, password changes, suspension, and deletion revoke active refresh sessions.
- Super Admin and Sub-Admin permissions are rechecked on the server for every protected API request.
- Sub-Admins can never manage administrators, roles, permissions, payment secrets, or sensitive security settings.

## Team accounts

The Super Admin opens `/admin/team`, chooses **Add Sub-Admin**, and sets:

- Name
- Email
- Initial password
- Allowed administration areas

The Super Admin can later change the password, suspend/reactivate the account, change permissions, or delete access. Password changes revoke the user’s existing sessions.

## Private files

Development files are stored under `storage/private`, which is excluded from Git. Uploads use the protected product-file API and downloads require a valid customer session, active entitlement, and remaining download allowance.

For production, replace the local storage adapter with S3, Cloudflare R2, Backblaze B2, or another private object store. Do not expose the bucket publicly.

## Stripe test mode

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env.local`. Configure Stripe Checkout to send:

- `checkout.session.completed`
- `checkout.session.expired`

to `/api/webhooks/stripe`. Raw card data never reaches Nexora.

## Production and a custom domain

The application can be deployed to any Node.js host with PostgreSQL, such as a VPS, Railway, Render, Fly.io, or a Docker-capable provider.

Production requirements:

1. Managed PostgreSQL with backups and TLS
2. A strong unique `AUTH_SECRET`
3. HTTPS
4. Private object storage
5. Stripe live-mode keys and webhook
6. Transactional email provider
7. `APP_URL=https://your-domain.com`
8. DNS records pointing your domain to the selected host

Run `npm run build` and `npm start` in production. Never commit `.env.local`.
