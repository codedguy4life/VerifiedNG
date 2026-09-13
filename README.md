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
```

`MONGO_TEST_URI` should point to a dedicated test database. The tests create temporary users and must not use a production database.

`PROVIDER_INVITE_CODE` is a server-side gate for provider account creation. Do not commit the real code. The normal registration endpoint always creates customers; the provider registration endpoint assigns the provider role only after the server validates this configured code.

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

When the pages are served by `npm start` on `localhost:5000`, the frontend uses that same local server for API requests.

When the site is served from GitHub Pages or another frontend host, the frontend uses the deployed Render backend.

Using VS Code Live Server on port 5500 is not the supported full-application startup path for this ticket. Use `npm start` so the pages and API come from the same checkout.

## Trust boundary

Registration cannot self-assign the provider role. New accounts are customers unless a server-configured provider invite code is validated through the provider-registration endpoint.

Hire requests require an authenticated customer. The server takes the customer's name, phone number, and user ID from the authenticated account instead of trusting those identity fields from the browser.

Provider inbox access is checked against the signed-in user's server-side role and user ID. A provider cannot read another provider's inbox.

Customer-controlled hire-request text is rendered by the dashboard with safe DOM APIs rather than inserted into the DOM as HTML.

## Environment files

The repository contains `.env.example` only as a template. Real secrets belong in `.env`, which is ignored by Git.

Never commit:

- MongoDB connection strings
- JWT secrets
- Email passwords or app passwords
- Provider invite codes
- Other environment-specific credentials
