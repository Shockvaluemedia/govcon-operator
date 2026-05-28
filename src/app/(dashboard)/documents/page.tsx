"use client";

import React, { useState } from "react";
import { Upload, FileText, File, Download, Trash2, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Document, DocumentType } from "@/types";

const mockDocuments: Document[] = [
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
  {
    id: "doc-003",
    name: "SAM.gov Registration Confirmation.pdf",
    type: "certification",
    url: "#",
    size: 156000,
    uploadedBy: "user-001",
    organizationId: "org-001",
    createdAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "doc-004",
    name: "Pacific Office Products - Quote Q2 2026.pdf",
    type: "quote",
    url: "#",
    size: 98000,
    uploadedBy: "user-001",
    organizationId: "org-001",
    opportunityId: "opp-001",
    createdAt: "2026-05-20T00:00:00Z",
  },
  {
    id: "doc-005",
    name: "Past Performance - Commercial Contract ABC Corp.pdf",
    type: "past_performance",
    url: "#",
    size: 312000,
    uploadedBy: "user-001",
    organizationId: "org-001",
    createdAt: "2026-04-01T00:00:00Z",
  },
];

const documentTypeLabels: Record<DocumentType, string> = {
  capability_statement: "Capability Statement",
  business_license: "Business License",
  insurance: "Insurance",
  certification: "Certification",
  quote: "Quote",
  bid_document: "Bid Document",
  past_performance: "Past Performance",
  agency_document: "Agency Document",
  other: "Other",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredDocs = mockDocuments.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const documentTypes = Array.from(new Set(mockDocuments.map((d) => d.type)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload and manage your contracting documents
          </p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-8">
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
            <Upload className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="mt-3 text-sm text-gray-600">
              Drag and drop files here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Supports PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 25MB)
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              Browse Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          {documentTypes.map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(type)}
            >
              {documentTypeLabels[type]}
            </Button>
          ))}
        </div>
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Documents ({filteredDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    {doc.name.endsWith(".pdf") ? (
                      <FileText className="h-5 w-5 text-red-500" />
                    ) : (
                      <File className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {documentTypeLabels[doc.type]}
                      </Badge>
                      <span className="text-xs text-gray-400">{formatFileSize(doc.size)}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Download">
                    <Download className="h-4 w-4 text-gray-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {filteredDocs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-200 mx-auto" />
              <p className="mt-3 text-sm text-gray-500">No documents found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
