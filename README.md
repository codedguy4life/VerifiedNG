# VerifiedNG

VerifiedNG is a Nigerian local-services marketplace connecting customers with verified service providers.

## Requirements

- Node.js 24+
- npm
- A MongoDB database for the application
- A separate MongoDB database for automated tests

## Setup from a fresh clone

Clone the repository and enter the project folder:

```bash
git clone https://github.com/codedguy4life/VerifiedNG.git
cd VerifiedNG
```

Install dependencies:

```bash
npm install
```

Create the environment file from the checked-in template:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Open `.env` and provide your own values:

```env
MONGO_URI=your_application_mongodb_connection_string
MONGO_TEST_URI=your_dedicated_test_mongodb_connection_string
JWT_SECRET=your_long_random_jwt_secret
PORT=5000
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password
PROVIDER_INVITE_CODE=your_private_provider_invite_code
FRONTEND_URL=https://codedguy4life.github.io/VerifiedNG
```

`MONGO_TEST_URI` should point to a dedicated test database. The tests create temporary users and must not use a production database.

`PROVIDER_INVITE_CODE` is a server-side gate for provider account creation. Do not commit the real code. The normal registration endpoint always creates customers; the provider registration endpoint assigns the provider role only after the server validates this configured code.

`FRONTEND_URL` is used to build password-reset links. It must point to the frontend that serves `reset-password.html`.

The application validates required runtime environment variables before starting. Empty values or obvious `your_...` placeholder values cause startup to fail with a clear error instead of allowing the server to start and fail on the first request.

To provision a provider on a fresh clone, use the server-controlled provider endpoint with that configured code. Example PowerShell request after `npm start`:

```powershell
$body = @{
  fullName = "Example Provider"
  email = "provider@example.com"
  password = "StrongPass123!"
  phone = "08012345678"
  providerInviteCode = "your_private_provider_invite_code"
  category = "Electrical"
  bio = "Example verified service provider."
  skills = @("Diagnostics")
  state = "Lagos"
  city = "Lagos"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:5000/api/auth/register-provider" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

The server, not the request body, establishes the `provider` role. The normal `/api/auth/register` endpoint always creates a customer.

`.env` is local-only. Never commit it.

## Run the automated tests

From the repository root:

```bash
npm test
```

The test suite uses `MONGO_TEST_URI` from `.env` and verifies authentication and trust-boundary behaviour.

## Start the application

Start the whole application from this repository with:

```bash
npm start
```

Then open:

http://localhost:5000

The Express server serves the VerifiedNG pages and API from the same checkout.

The API health endpoint is:

http://localhost:5000/api/health

## Development mode

For automatic server restarts while coding:

```bash
npm run dev
```

## Local frontend/API behaviour

When the pages are served by `npm start` on `localhost:5000`, the frontend uses the local backend on port 5000.

When the pages are served with VS Code Live Server on `localhost:5500` or `127.0.0.1:5500`, the frontend also uses the local backend on port 5000. It never silently switches local development requests to production.

When the site is served from GitHub Pages or another non-local frontend host, the frontend uses the deployed Render backend.

## Trust boundary

Registration cannot self-assign the provider role. New accounts are customers unless a server-configured provider invite code is validated through the provider-registration endpoint.

Hire requests require an authenticated customer. The server takes the customer's name, phone number, and user ID from the authenticated account instead of trusting those identity fields from the browser.

Provider inbox access is checked against the signed-in user's server-side role and user ID. A provider cannot read another provider's inbox.

Customer-controlled hire-request text is rendered by the dashboard with safe DOM APIs rather than inserted into the DOM as HTML.

Public provider endpoints exclude password, login history, password-reset token, and password-reset expiry fields from their responses.

## Environment files

The repository contains `.env.example` only as a template. Real secrets belong in `.env`, which is ignored by Git.

Never commit:

- MongoDB connection strings
- JWT secrets
- Email passwords or app passwords
- Provider invite codes
- Other environment-specific credentials
