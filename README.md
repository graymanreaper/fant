# FANT — Investor & Ledger Web App

A web application migrating the Microsoft Access "Investors / LedgerEntries"
database to a modern stack deployable on Microsoft Azure.

**First feature delivered: the Investor record.** This is the equivalent of the
Access `InvestorEdit` form plus its search, "Print Member" and "Excel Member"
actions.

## Tech stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js (App Router) + React, TypeScript          |
| Database       | Azure SQL Database (SQL Server) via Prisma ORM    |
| Authentication | Microsoft Entra ID (Azure AD) via Auth.js         |
| Excel export   | ExcelJS                                           |
| Hosting        | Azure App Service                                 |

## What's implemented

- **Investor search** (`/investors`) — search by legal name or alternative
  name, the equivalent of the Access `SearchInvestors` button.
- **Investor record** (`/investors/[key]`) — view and edit form laid out as
  requested: identity fields on the left, classification checkboxes on the
  right, `Print Member` / `Excel Member` buttons, and a Notes box underneath.
  A read-only Ledger History table is shown below the form.
- **New member** (`/investors/new`) — the next `InvestorKey` is assigned as
  `max(InvestorKey) + 1`, matching the Access `ChangeBlankKey` routine.
- **Print Member** (`/investors/[key]/print`) — a printable member report.
- **Excel Member** (`/api/investors/[key]/export`) — downloads the investor's
  ledger history as `.xlsx`, mirroring `InvestorHistoryExportQuery` including
  the counterparty column (`GetInvestorsByTransactionKey`).
- **Inactive rule** — a member cannot be marked Inactive while their unit
  balance is non-zero, matching the Access `InactiveCheck` validation.

The `LedgerEntries` editing UI is not part of this first increment.

## Local development

Requires Node.js 20+ and Docker.

```bash
# 1. Install dependencies
npm install

# 2. Start a local SQL Server
docker compose up -d

# 3. Configure environment
cp .env.example .env
#    The default .env values already point at the local SQL Server.

# 4. Create the database, then apply the schema
docker exec fant-db /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'FantLocal!2026' -C -No \
  -Q "IF DB_ID('fant') IS NULL CREATE DATABASE fant;"
npm run db:push

# 5. Load sample data (optional)
npm run db:seed

# 6. Run the app
npm run dev
```

Open http://localhost:3000. With the Entra ID variables left blank, sign-in is
bypassed for local development.

## Deploying to Azure

1. **Azure SQL Database** — create a database, then set `DATABASE_URL` to its
   connection string (see `.env.example`). Run `npm run db:push` once against
   it to create the tables.
2. **Microsoft Entra ID** — register an app in Entra ID. Add the redirect URI
   `https://YOUR-APP.azurewebsites.net/api/auth/callback/microsoft-entra-id`.
   Set `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` and
   `AUTH_MICROSOFT_ENTRA_ID_ISSUER`. Setting these enables the login wall.
3. **Azure App Service** — create a Node.js Web App. Set the app settings
   (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, and the three
   `AUTH_MICROSOFT_ENTRA_ID_*` values). Deploy with `npm run build` as the
   build step and `npm run start` as the start command.

## Project layout

```
prisma/schema.prisma              Investor + LedgerEntry data model
prisma/seed.ts                    Sample data
src/auth.ts                       Auth.js / Entra ID configuration
src/lib/investors.ts              Investor & ledger data access
src/lib/excel.ts                  "Excel Member" workbook builder
src/app/investors/                Search, record, new-member, print pages
src/app/api/investors/            REST endpoints
src/components/InvestorForm.tsx   The editable Investor form
```
