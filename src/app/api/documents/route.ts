import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUploadPresignedUrl, generateDocumentKey } from "@/services/s3-service";
import type { Prisma } from "@prisma/client";

// GET /api/documents - List documents for the user's organization
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const opportunityId = searchParams.get("opportunityId");
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (user) {
      const where: Prisma.DocumentWhereInput = { organizationId: user.organizationId };
      if (type) where.type = type;
      if (opportunityId) where.opportunityId = opportunityId;

      const documents = await prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ data: documents });
    }

    return NextResponse.json({ data: [] });
  } catch (error) {
    console.warn("Documents fetch error:", error);
    return NextResponse.json({ data: [], meta: { source: "error" } });
  }
}

// POST /api/documents - Request upload URL and create document record
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { filename, contentType, size, type, opportunityId } = body;

    if (!filename || !contentType || !type) {
      return NextResponse.json(
        { error: "filename, contentType, and type are required" },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    if (size && size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 25MB limit" },
        { status: 400 }
      );
    }

    // Validate content type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "File type not allowed. Supported: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG" },
        { status: 400 }
      );
    }

    // Generate S3 key
    const s3Key = generateDocumentKey({
      organizationId: user.organizationId,
      documentType: type,
      filename,
    });

    // Get presigned upload URL
    let uploadUrl = "";
    try {
      const presigned = await getUploadPresignedUrl({
        key: s3Key,
        contentType,
        contentLength: size,
      });
      uploadUrl = presigned.uploadUrl;
    } catch (s3Error) {
      console.warn("S3 presigned URL generation failed (S3 may not be configured):", s3Error);
      // In development without S3, return a placeholder
      uploadUrl = `http://localhost:3000/api/documents/upload-placeholder?key=${s3Key}`;
    }

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        name: filename,
        type,
        url: uploadUrl,
        size: size || 0,
        mimeType: contentType,
        s3Key,
        uploadedBy: user.id,
        organizationId: user.organizationId,
        opportunityId: opportunityId || null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "document_uploaded",
        entityType: "document",
        entityId: document.id,
        details: { filename, type, size },
      },
    });

    return NextResponse.json(
      {
        data: document,
        uploadUrl,
        instructions: "PUT the file to the uploadUrl with the correct Content-Type header.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents - Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 });
    }

    // Verify ownership
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: user.organizationId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete from S3 if key exists
    if (document.s3Key) {
      try {
        const { deleteS3Object } = await import("@/services/s3-service");
        await deleteS3Object(document.s3Key);
      } catch {
        console.warn("S3 delete failed, continuing with DB delete");
      }
    }

    // Delete from database
    await prisma.document.delete({ where: { id: documentId } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "document_deleted",
        entityType: "document",
        entityId: documentId,
        details: { filename: document.name },
      },
    });

    return NextResponse.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
