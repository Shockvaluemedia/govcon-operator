"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Upload, FileText, File, Download, Trash2, FolderOpen, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  mimeType?: string;
  s3Key?: string;
  createdAt: string;
}

const documentTypeLabels: Record<string, string> = {
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
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedType, setSelectedType] = useState<string>("other");
  const [dragOver, setDragOver] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.data || []);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch documents
  useEffect(() => {
    void Promise.resolve().then(fetchDocuments);
  }, [fetchDocuments]);

  // Handle file upload
  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadSuccess(false);

    for (const file of Array.from(files)) {
      try {
        // Step 1: Request presigned URL from our API
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
            type: selectedType,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          alert(`Upload failed: ${error.error}`);
          continue;
        }

        const { uploadUrl, data: docRecord } = await res.json();

        // Step 2: Upload file directly to S3 using presigned URL
        if (uploadUrl && !uploadUrl.includes("placeholder")) {
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
        }

        // Add to local state
        setDocuments((prev) => [docRecord, ...prev]);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } catch (error) {
        console.error("Upload error:", error);
        alert("Upload failed. Please try again.");
      }
    }

    setUploading(false);
  }, [selectedType]);

  // Handle download
  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const res = await fetch(`/api/documents/download?id=${doc.id}`);
      if (res.ok) {
        const { downloadUrl } = await res.json();
        window.open(downloadUrl, "_blank");
      } else {
        // Fallback for mock mode
        alert("Download not available in mock mode. Configure S3 for real file storage.");
      }
    } catch {
      alert("Download failed.");
    }
  };

  // Handle delete
  const handleDelete = async (doc: DocumentRecord) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/documents?id=${doc.id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      }
    } catch {
      alert("Delete failed.");
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload and manage your contracting documents
          </p>
        </div>
        <label htmlFor="file-upload">
          <Button className="gap-2 cursor-pointer" asChild>
            <span>
              <Upload className="h-4 w-4" />
              Upload Document
            </span>
          </Button>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                <p className="mt-3 text-sm text-gray-600">Uploading...</p>
              </div>
            ) : uploadSuccess ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="mt-3 text-sm text-green-600 font-medium">Upload successful!</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="mt-3 text-sm text-gray-600">
                  Drag and drop files here, or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 25MB)
                </p>
                <label htmlFor="file-upload-area">
                  <Button variant="outline" size="sm" className="mt-4 cursor-pointer" asChild>
                    <span>Browse Files</span>
                  </Button>
                  <input
                    id="file-upload-area"
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                </label>
              </>
            )}
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(documentTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Documents ({filteredDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-gray-300 animate-spin mx-auto" />
              <p className="mt-3 text-sm text-gray-500">Loading documents...</p>
            </div>
          ) : (
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
                          {documentTypeLabels[doc.type] || doc.type}
                        </Badge>
                        <span className="text-xs text-gray-400">{formatFileSize(doc.size)}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(doc)}
                      aria-label="Download"
                    >
                      <Download className="h-4 w-4 text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(doc)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && filteredDocs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-200 mx-auto" />
              <p className="mt-3 text-sm text-gray-500">No documents found</p>
              <p className="text-xs text-gray-400 mt-1">Upload your first document to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
