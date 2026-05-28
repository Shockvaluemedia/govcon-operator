import { NextRequest, NextResponse } from "next/server";

// Mock documents data
const documents = [
  {
    id: "doc-001",
    name: "Business License - State of Virginia.pdf",
    type: "business_license",
    url: "#",
    size: 245000,
    uploadedBy: "user-001",
    organizationId: "org-001",
    createdAt: "2026-04-15T00:00:00Z",
  },
  {
    id: "doc-002",
    name: "General Liability Insurance Certificate.pdf",
    type: "insurance",
    url: "#",
    size: 189000,
    uploadedBy: "user-001",
    organizationId: "org-001",
    createdAt: "2026-03-20T00:00:00Z",
  },
];

// GET /api/documents - List documents
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");

  let results = [...documents];

  if (type) {
    results = results.filter((doc) => doc.type === type);
  }

  return NextResponse.json({ data: results });
}

// POST /api/documents - Upload document metadata
// In production, this would generate a presigned S3 URL for upload
export async function POST(request: NextRequest) {
  const body = await request.json();

  const newDocument = {
    id: `doc-${Date.now()}`,
    ...body,
    uploadedBy: "user-001",
    organizationId: "org-001",
    createdAt: new Date().toISOString(),
  };

  // In production:
  // 1. Generate presigned S3 URL
  // 2. Return URL to client for direct upload
  // 3. Save metadata to database

  return NextResponse.json({
    data: newDocument,
    uploadUrl: "https://s3.amazonaws.com/govcon-documents/presigned-url-placeholder",
  }, { status: 201 });
}
