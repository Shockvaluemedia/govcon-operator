# GovCon Operator

AI-powered government contracting platform for small businesses. Discover opportunities, analyze bids with AI, source suppliers, track compliance, and manage execution workflows.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API Routes (serverless-ready)
- **Database**: PostgreSQL (Prisma ORM, AWS RDS-ready)
- **Auth**: Seeded demo auth in development; AWS Cognito for production
- **Storage**: AWS S3 (mock in development)
- **AI**: OpenAI / AWS Bedrock abstraction layer (mock in development)
- **Integrations**: SAM.gov, DLA, FPDS, USAspending adapters

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start local Postgres, push schema, and seed demo tenant data
docker compose up -d
npm run db:push
npm run db:seed

# Run development server
npm run dev

# Build for production
npm run build

# Run the authenticated database-backed smoke against a running app
SMOKE_BASE_URL=http://127.0.0.1:3000 npm run demo:smoke
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
└── schema.prisma          # Database schema (PostgreSQL)
```

## Readiness

The app supports a seeded local pilot mode. Set `GOVCON_DEMO_AUTH=true`, run the database setup commands above, then sign in as `demo@govcon-operator.com` with any non-empty password.

For production, set `GOVCON_DEMO_AUTH=false` and provide real Cognito, PostgreSQL, S3, AI, and SAM.gov configuration.

The GitHub Actions workflow at `.github/workflows/demo-smoke.yml` runs lint, prepares a seeded PostgreSQL database, builds the app, starts Next.js, and executes the authenticated demo smoke.

Known MVP gaps:
- Visual polish still needs a full `DESIGN.md` token pass across the dashboard and auth surfaces.
- Production Cognito, S3, AI, and SAM.gov modes require real environment configuration.
- Dashboard headline metrics are database-backed; some secondary dashboard panels still use seeded/demo content.

## Features

| Feature | Status |
|---------|--------|
| Landing Page | Demo-ready |
| Auth Pages | Local demo login/register wired to API; Cognito path available for production |
| Main Dashboard | Database-backed headline metrics; secondary panels still demo content |
| Opportunity Discovery | Database-backed catalog and filters; live SAM.gov sync requires configuration |
| Opportunity Detail | Demo-ready |
| AI Bid Analyzer | Provider abstraction with mock default; OpenAI/Bedrock require keys |
| Supplier Sourcing | Database-backed list/create flow with seeded quotes |
| Margin Calculator | Demo-ready calculator UI |
| Compliance Readiness | Demo-ready profile and checklist |
| Bid Workflow Board | Database-backed board with stage updates |
| Document Center | Demo UI and S3 adapter; production storage requires configuration |
| AI Assistant Chat | Mock/default mode; live LLM requires provider configuration |
| Admin Dashboard | Role-gated API and demo-ready UI |
| Settings | Demo-ready |
| API Routes | Demo-ready; production hardening in progress |
| Database Schema | ✅ Prisma schema + seeded local pilot data |
| AI Service Abstraction | Mock/OpenAI/Bedrock provider layer |
| Integration Adapters | Adapter scaffolding; live keys required |

## User Roles

- **Owner** - Full platform access, billing, organization management
- **Admin** - User management, all features
- **Operator** - Core workflow features, opportunity management
- **Coach** - Read access, can add notes and recommendations
- **Viewer** - Read-only access

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth | Get current session user |
| POST | /api/auth | Login |
| GET | /api/opportunities | List opportunities with filters |
| POST | /api/opportunities | Create/import opportunity |
| POST | /api/ai/analyze | Run AI bid analysis |
| GET | /api/suppliers | List suppliers |
| POST | /api/suppliers | Create supplier |
| GET | /api/compliance | Get compliance profile |
| PUT | /api/compliance | Update compliance profile |
| GET | /api/workflows | List workflows |
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
- `generateBidNoBidRecommendation()` - Quick recommendation
- `extractComplianceRequirements()` - Extract requirements from text
- `generateSupplierQuestions()` - Questions to ask suppliers
- `calculateOpportunityFit()` - Match scoring
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
