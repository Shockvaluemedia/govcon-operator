# GovCon Operator

AI-powered government contracting platform for small businesses. Discover opportunities, analyze bids with AI, source suppliers, track compliance, and manage execution workflows.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API Routes (serverless-ready)
- **Database**: PostgreSQL (Prisma ORM, AWS RDS-ready)
- **Auth**: Seeded demo auth in development; AWS Cognito for production
- **Storage**: AWS S3 (mock in development)
- **AI**: Mock default with OpenAI live path; Bedrock-ready provider seam
- **Integrations**: SAM.gov, DLA, FPDS, USAspending adapters

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start local Postgres, apply reviewed migrations, and seed demo tenant data
docker compose up -d
npm run db:deploy
npm run db:status
npm run db:drift:check
npm run db:seed

# Run development server
npm run dev

# Build for production
npm run build

# Run the authenticated database-backed smoke against a running app
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run demo:smoke

# Rehearse a non-destructive logical backup and isolated restore
npm run db:recovery:rehearse
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register, forgot-password)
│   ├── (dashboard)/       # Dashboard pages with sidebar layout
│   │   ├── dashboard/     # Main dashboard
│   │   ├── opportunities/ # Opportunity discovery & detail
│   │   ├── ai-analyzer/   # AI bid analysis tool
│   │   ├── suppliers/     # Supplier sourcing & quotes
│   │   ├── calculator/    # Margin calculator
│   │   ├── compliance/    # Compliance readiness checklist
│   │   ├── workflows/     # Kanban bid workflow board
│   │   ├── documents/     # Document center
│   │   ├── ai-assistant/  # AI chat assistant
│   │   ├── admin/         # Admin dashboard
│   │   └── settings/      # User & org settings
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   └── layout/            # Layout components (sidebar, topbar)
├── data/                  # Mock data for development
├── lib/                   # Utility functions
├── services/              # AI service & integration adapters
└── types/                 # TypeScript type definitions

prisma/
├── schema.prisma          # Database schema (PostgreSQL)
└── migrations/            # Immutable reviewed migration history
```

## Readiness

The app supports a seeded local pilot mode. Set `GOVCON_DEMO_AUTH=true`, run the database setup commands above, then sign in as `demo@govcon-operator.com` with any non-empty password. The test-only `GOVCON_DEMO_AUTH_ALLOW_PRODUCTION_BUILD=true` flag is required when a CI or local proof runs the optimized build with `next start`; never enable it on a public deployment.

For production, set `GOVCON_DEMO_AUTH=false` and `GOVCON_STRICT_DATA=true`, then provide real Cognito, PostgreSQL, S3, AI, and SAM.gov configuration. The Cognito flow currently expects an app client without a client secret.

The GitHub Actions workflow at `.github/workflows/demo-smoke.yml` runs lint and authorization-policy tests, deploys reviewed migrations to a fresh PostgreSQL database, checks status and drift, seeds synthetic data, rehearses backup/restore, builds the app, starts Next.js, and executes the authenticated demo smoke.

Database deployment, one-time baseline, rollback, and restore procedures are in [the database migration and recovery runbook](docs/database-migration-recovery.md). The latest bounded evidence is recorded in [the 2026-09-05 migration and recovery report](docs/migration-recovery-evidence-2026-09-05.md).

Known MVP gaps:
- Visual polish still needs a full `DESIGN.md` token pass across the dashboard and auth surfaces.
- Production Cognito, S3, AI, and SAM.gov modes require real environment configuration.
- SAM.gov saved searches run in no-key mode locally; add `SAM_GOV_API_KEY` for live solicitation imports.
- Proposal drafts are generated, persisted as opportunity notes, and exportable as Markdown; DOCX/PDF export is not built yet.
- Production is Constitution `NO-GO` until AWS infrastructure, production backup/restore evidence, observability, rate limits, AI data governance, and live deployment evidence exist. See [the current Constitution audit](docs/constitution-audit-2026-07-14.md).

## Features

| Feature | Status |
|---------|--------|
| Landing Page | Demo-ready |
| Auth Pages | Local demo login/register wired to API; Cognito path available for production |
| Main Dashboard | Database-backed metrics, risks, due tasks, supplier quotes, and compliance summary |
| Opportunity Discovery | Database-backed catalog, saved searches, and SAM.gov sync trigger; live imports require `SAM_GOV_API_KEY` |
| Opportunity Detail | Database-backed detail with AI analysis, saved proposal drafts, and Markdown export |
| AI Bid Analyzer | Provider abstraction with mock default; OpenAI requires keys |
| Supplier Sourcing | Database-backed list/create flow with seeded quotes |
| Margin Calculator | Demo-ready calculator UI |
| Compliance Readiness | Demo-ready profile and checklist |
| Bid Workflow Board | Database-backed command board with stage updates, AI proof, quote status, draft status, and next actions |
| Document Center | Demo UI and S3 adapter; production storage requires configuration |
| AI Assistant Chat | Mock/default mode; live LLM requires provider configuration |
| Admin Dashboard | Role-gated API and demo-ready UI |
| Settings | Demo-ready |
| API Routes | Verified sessions plus server-side product-action roles; production hardening remains in progress |
| Database Schema | Reviewed Prisma migration, drift gate, seeded pilot data, and synthetic backup/restore rehearsal |
| AI Service Abstraction | Mock/OpenAI/Bedrock provider layer |
| Integration Adapters | Adapter scaffolding; live keys required |

## User Roles

- **Owner** - Full organization and administrative authority
- **Admin** - Full delegated organization and administrative authority
- **Operator** - Day-to-day opportunity, supplier, compliance, document, and workflow operations
- **Coach** - Authenticated read access, AI assistance, and personal opportunity/search curation
- **Viewer** - Authenticated read-only access

The server-enforced endpoint matrix and tenant rules are documented in [the API authorization policy](docs/api-authorization-policy.md).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth | Legacy authenticated session check |
| POST | /api/auth/login | Login and set HTTP-only session cookies |
| GET | /api/opportunities | List opportunities with filters |
| GET | /api/opportunities/[id] | Get opportunity detail |
| POST | /api/opportunities | Create/import opportunity |
| GET | /api/opportunities/searches | List saved SAM.gov searches |
| POST | /api/opportunities/searches | Create or update saved search |
| DELETE | /api/opportunities/searches | Delete saved search |
| POST | /api/opportunities/sync | Sync opportunities from SAM.gov |
| POST | /api/ai/analyze | Run AI bid analysis |
| POST | /api/ai/proposal-draft | Generate first-pass proposal draft |
| GET | /api/notes | List organization-visible notes and saved proposal drafts |
| GET | /api/suppliers | List suppliers |
| POST | /api/suppliers | Create supplier |
| GET | /api/compliance | Get compliance profile |
| PUT | /api/compliance | Update compliance profile |
| GET | /api/workflows | List workflows with task, analysis, quote, and proposal-draft proof |
| POST | /api/workflows | Create workflow |
| PATCH | /api/workflows | Update workflow stage |
| GET | /api/documents | List documents |
| POST | /api/documents | Upload document |
| GET | /api/dashboard | Get dashboard metrics |
| GET | /api/admin | Get admin data |

## AI Service

The AI service supports multiple providers through an abstraction layer:

- **Mock** (default for development) - Returns realistic mock responses
- **OpenAI** - GPT-4 integration
- **AWS Bedrock** - Claude or other models

AI Functions:
- `summarizeOpportunity()` - Plain-language opportunity summary
- `analyzeBidRisk()` - Full bid/no-bid analysis
- `generateProposalDraft()` - First-pass proposal response draft
- `generateBidNoBidRecommendation()` - Quick recommendation
- `extractComplianceRequirements()` - Extract requirements from text
- `generateSupplierQuestions()` - Questions to ask suppliers
- `explainGovConTerm()` - Term definitions
- `generateNextSteps()` - Stage-appropriate next actions
- `summarizeUploadedDocument()` - Document summarization
- `chat()` - General assistant chat

## Integration Adapters

Placeholder adapters ready for real API integration:

- **SAM.gov** - Federal opportunity search
- **DLA DIBBS** - Defense Logistics Agency bids
- **FPDS** - Federal procurement history
- **USAspending** - Award/spending data
- **State/Local** - State procurement portals

## Deployment

Designed for AWS deployment:
- Next.js on AWS Amplify or Vercel
- PostgreSQL on AWS RDS
- Documents on AWS S3
- Auth via AWS Cognito
- Background jobs via AWS Lambda
- Scheduled sync via AWS EventBridge

## License

Proprietary - All rights reserved.
