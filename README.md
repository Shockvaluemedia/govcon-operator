# GovCon Operator

AI-powered government contracting platform for small businesses. Discover opportunities, analyze bids with AI, source suppliers, track compliance, and manage execution workflows.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API Routes (serverless-ready)
- **Database**: PostgreSQL (Prisma ORM, AWS RDS-ready)
- **Auth**: AWS Cognito (mock in development)
- **Storage**: AWS S3 (mock in development)
- **AI**: OpenAI / AWS Bedrock abstraction layer (mock in development)
- **Integrations**: SAM.gov, DLA, FPDS, USAspending adapters

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build
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

## Features

| Feature | Status |
|---------|--------|
| Landing Page | ✅ Complete |
| Auth Pages | ✅ Complete |
| Main Dashboard | ✅ Complete |
| Opportunity Discovery | ✅ Complete |
| Opportunity Detail | ✅ Complete |
| AI Bid Analyzer | ✅ Complete |
| Supplier Sourcing | ✅ Complete |
| Margin Calculator | ✅ Complete |
| Compliance Readiness | ✅ Complete |
| Bid Workflow Board | ✅ Complete |
| Document Center | ✅ Complete |
| AI Assistant Chat | ✅ Complete |
| Admin Dashboard | ✅ Complete |
| Settings | ✅ Complete |
| API Routes | ✅ Complete |
| Database Schema | ✅ Complete |
| AI Service Abstraction | ✅ Complete |
| Integration Adapters | ✅ Complete |

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
