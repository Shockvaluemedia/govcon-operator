import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDownloadPresignedUrl } from "@/services/s3-service";

// GET /api/documents/download?id=xxx - Get presigned download URL
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = request.nextUrl.searchParams.get("id");
    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: user.organizationId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!document.s3Key) {
      return NextResponse.json({ error: "Document has no associated file" }, { status: 404 });
    }

    const downloadUrl = await getDownloadPresignedUrl({
      key: document.s3Key,
      filename: document.name,
      expiresIn: 300, // 5 minutes
    });

    return NextResponse.json({ downloadUrl, filename: document.name });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
