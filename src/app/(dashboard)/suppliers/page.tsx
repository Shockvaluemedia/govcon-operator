"use client";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Plus, Star, ExternalLink, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Supplier, SupplierQuote } from "@/types";

type ApiSupplierQuote = Omit<SupplierQuote, "unitPrice" | "totalPrice"> & {
  unitPrice: number | string;
  totalPrice: number | string;
};

type ApiSupplier = Omit<Supplier, "unitCost" | "shippingEstimate" | "reliabilityRating"> & {
  unitCost: number | string | null;
  shippingEstimate: number | string | null;
  reliabilityRating: number | string | null;
  quotes?: ApiSupplierQuote[];
};

interface SuppliersResponse {
  data?: ApiSupplier[];
  error?: string;
  meta?: {
    source?: string;
    total?: number;
  };
}

interface SupplierWithQuotes extends Supplier {
  quotes: SupplierQuote[];
}

interface SupplierCreateResponse {
  data?: ApiSupplier;
  error?: string;
}

interface SupplierFormState {
  name: string;
  productCategory: string;
  unitCost: string;
  moq: string;
  leadTime: string;
  shippingEstimate: string;
  reliabilityRating: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

const emptySupplierForm: SupplierFormState = {
  name: "",
  productCategory: "",
  unitCost: "",
  moq: "",
  leadTime: "",
  shippingEstimate: "",
  reliabilityRating: "4.0",
  website: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

function trimmedOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function intOrNull(value: string) {
  const numericValue = numberOrNull(value);
  return numericValue === null ? null : Math.trunc(numericValue);
}

function normalizeQuote(quote: ApiSupplierQuote): SupplierQuote {
  return {
    ...quote,
    unitPrice: Number(quote.unitPrice || 0),
    totalPrice: Number(quote.totalPrice || 0),
  };
}

function normalizeSupplier(supplier: ApiSupplier): SupplierWithQuotes {
  return {
    ...supplier,
    leadTime: supplier.leadTime || "Not specified",
    unitCost: Number(supplier.unitCost || 0),
    moq: Number(supplier.moq || 0),
    shippingEstimate: Number(supplier.shippingEstimate || 0),
    reliabilityRating: Number(supplier.reliabilityRating || 0),
    quotes: (supplier.quotes || []).map(normalizeQuote),
  };
}

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierWithQuotes[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(() => ({ ...emptySupplierForm }));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const fetchSuppliers = useCallback(async (searchValue: string, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    const trimmedSearch = searchValue.trim();

    if (trimmedSearch) {
      params.set("search", trimmedSearch);
    }

    const queryString = params.toString();

    const response = await fetch(`/api/suppliers${queryString ? `?${queryString}` : ""}`, {
      headers: { "x-govcon-data-mode": "database" },
      signal,
    });
    const payload = (await response.json()) as SuppliersResponse;

    if (!response.ok) {
      throw new Error(payload.error || "Failed to load suppliers");
    }

    return payload;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSupplierList() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchSuppliers(deferredSearchQuery, controller.signal);

        setSuppliers((payload.data || []).map(normalizeSupplier));
        setSource(payload.meta?.source || null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuppliers([]);
        setSource(null);
        setError(err instanceof Error ? err.message : "Failed to load suppliers");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadSupplierList();

    return () => controller.abort();
  }, [deferredSearchQuery, fetchSuppliers]);

  const supplierQuotes = useMemo(() => {
    return suppliers.flatMap((supplier) =>
      supplier.quotes.map((quote) => ({
        ...quote,
        supplierName: supplier.name,
      }))
    );
  }, [suppliers]);

  function updateSupplierForm<K extends keyof SupplierFormState>(
    field: K,
    value: SupplierFormState[K]
  ) {
    setSupplierForm((current) => ({ ...current, [field]: value }));
  }

  function resetCreateForm() {
    setSupplierForm({ ...emptySupplierForm });
    setCreateError(null);
  }

  async function handleCreateSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const name = supplierForm.name.trim();
    const productCategory = supplierForm.productCategory.trim();

    if (!name || !productCategory) {
      setCreateError("Supplier name and product category are required.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-govcon-data-mode": "database",
        },
        body: JSON.stringify({
          name,
          productCategory,
          website: trimmedOrNull(supplierForm.website),
          contactName: trimmedOrNull(supplierForm.contactName),
          contactEmail: trimmedOrNull(supplierForm.contactEmail),
          contactPhone: trimmedOrNull(supplierForm.contactPhone),
          leadTime: trimmedOrNull(supplierForm.leadTime),
          unitCost: numberOrNull(supplierForm.unitCost),
          moq: intOrNull(supplierForm.moq),
          shippingEstimate: numberOrNull(supplierForm.shippingEstimate),
          reliabilityRating: numberOrNull(supplierForm.reliabilityRating),
          notes: trimmedOrNull(supplierForm.notes),
        }),
      });
      const payload = (await response.json()) as SupplierCreateResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Failed to create supplier");
      }

      setSearchQuery("");
      resetCreateForm();
      setShowCreateForm(false);
      setCreateSuccess(`Added ${payload.data.name}`);
      const suppliersPayload = await fetchSuppliers("");
      setSuppliers((suppliersPayload.data || []).map(normalizeSupplier));
      setSource(suppliersPayload.meta?.source || null);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create supplier");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Sourcing</h1>
          <p className="text-sm text-gray-500 mt-1">Manage suppliers and compare quotes</p>
        </div>
        <Button
          type="button"
          className="w-full gap-2 sm:w-auto"
          aria-expanded={showCreateForm}
          onClick={() => {
            setShowCreateForm((isOpen) => !isOpen);
            setCreateError(null);
            setCreateSuccess(null);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {createSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-green-800">{createSuccess}</p>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleCreateSupplier}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Supplier name</span>
                  <Input
                    required
                    value={supplierForm.name}
                    onChange={(event) => updateSupplierForm("name", event.target.value)}
                    placeholder="Acme Distribution"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Product category</span>
                  <Input
                    required
                    value={supplierForm.productCategory}
                    onChange={(event) => updateSupplierForm("productCategory", event.target.value)}
                    placeholder="IT Hardware"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Lead time</span>
                  <Input
                    value={supplierForm.leadTime}
                    onChange={(event) => updateSupplierForm("leadTime", event.target.value)}
                    placeholder="5-7 business days"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Unit cost</span>
                  <Input
                    min="0"
                    step="0.01"
                    type="number"
                    value={supplierForm.unitCost}
                    onChange={(event) => updateSupplierForm("unitCost", event.target.value)}
                    placeholder="125.00"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>MOQ</span>
                  <Input
                    min="0"
                    step="1"
                    type="number"
                    value={supplierForm.moq}
                    onChange={(event) => updateSupplierForm("moq", event.target.value)}
                    placeholder="100"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Shipping estimate</span>
                  <Input
                    min="0"
                    step="0.01"
                    type="number"
                    value={supplierForm.shippingEstimate}
                    onChange={(event) => updateSupplierForm("shippingEstimate", event.target.value)}
                    placeholder="350.00"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Reliability rating</span>
                  <Input
                    max="5"
                    min="0"
                    step="0.1"
                    type="number"
                    value={supplierForm.reliabilityRating}
                    onChange={(event) => updateSupplierForm("reliabilityRating", event.target.value)}
                    placeholder="4.0"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Website</span>
                  <Input
                    value={supplierForm.website}
                    onChange={(event) => updateSupplierForm("website", event.target.value)}
                    placeholder="https://example.com"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Contact name</span>
                  <Input
                    value={supplierForm.contactName}
                    onChange={(event) => updateSupplierForm("contactName", event.target.value)}
                    placeholder="Jordan Lee"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Contact email</span>
                  <Input
                    type="email"
                    value={supplierForm.contactEmail}
                    onChange={(event) => updateSupplierForm("contactEmail", event.target.value)}
                    placeholder="sales@example.com"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  <span>Contact phone</span>
                  <Input
                    value={supplierForm.contactPhone}
                    onChange={(event) => updateSupplierForm("contactPhone", event.target.value)}
                    placeholder="(555) 010-1234"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700 md:col-span-2">
                  <span>Notes</span>
                  <Textarea
                    value={supplierForm.notes}
                    onChange={(event) => updateSupplierForm("notes", event.target.value)}
                    placeholder="TAA-compliant lines, delivery caveats, past performance, or pricing notes."
                  />
                </label>
              </div>

              {createError && (
                <p className="text-sm font-medium text-red-600" role="alert">
                  {createError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={creating}
                  onClick={() => {
                    resetCreateForm();
                    setShowCreateForm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Saving..." : "Save Supplier"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="suppliers" className="min-w-0 space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="suppliers">Suppliers ({loading ? "..." : suppliers.length})</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({loading ? "..." : supplierQuotes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="min-w-0">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                placeholder="Search suppliers by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-w-0 sm:max-w-md"
              />
              <Badge variant={source === "database" ? "success" : "secondary"} className="w-fit">
                {loading ? "Loading..." : `${suppliers.length} suppliers`}
              </Badge>
            </div>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-red-700">Unable to load suppliers</p>
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                </CardContent>
              </Card>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((supplier) => (
                <Card key={supplier.id} className="min-w-0 transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <CardTitle className="min-w-0 text-base leading-snug">{supplier.name}</CardTitle>
                      <div className="flex shrink-0 items-center gap-1">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-medium">{supplier.reliabilityRating}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="w-fit">{supplier.productCategory}</Badge>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
                        <dt className="whitespace-nowrap text-gray-500">Unit Cost</dt>
                        <dd className="text-right font-medium">{formatCurrency(supplier.unitCost)}</dd>
                      </div>
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
                        <dt className="whitespace-nowrap text-gray-500">MOQ</dt>
                        <dd className="text-right font-medium">{supplier.moq} units</dd>
                      </div>
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
                        <dt className="whitespace-nowrap text-gray-500">Lead Time</dt>
                        <dd className="text-right font-medium">{supplier.leadTime}</dd>
                      </div>
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
                        <dt className="whitespace-nowrap text-gray-500">Shipping Est.</dt>
                        <dd className="text-right font-medium">{formatCurrency(supplier.shippingEstimate)}</dd>
                      </div>
                    </dl>

                    {supplier.notes && (
                      <p className="mt-3 text-xs text-gray-500 italic">{supplier.notes}</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                      {supplier.website && (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs">
                          <ExternalLink className="h-3 w-3" /> Website
                        </Button>
                      )}
                      {supplier.contactEmail && (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs">
                          <Mail className="h-3 w-3" /> Email
                        </Button>
                      )}
                      {supplier.contactPhone && (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs">
                          <Phone className="h-3 w-3" /> Call
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-gray-500">Loading suppliers...</p>
                </CardContent>
              </Card>
            )}

            {!loading && suppliers.length === 0 && !error && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No suppliers match your search.</p>
                  <Button variant="ghost" className="mt-2" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supplier Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Supplier</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Product</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Unit Price</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Qty</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Total</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Lead Time</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Valid Until</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierQuotes.map((quote) => {
                      return (
                        <tr key={quote.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">{quote.supplierName}</td>
                          <td className="py-3 px-2 text-gray-700">{quote.productDescription}</td>
                          <td className="py-3 px-2 text-right">{formatCurrency(quote.unitPrice)}</td>
                          <td className="py-3 px-2 text-right">{quote.quantity}</td>
                          <td className="py-3 px-2 text-right font-medium">{formatCurrency(quote.totalPrice)}</td>
                          <td className="py-3 px-2 text-gray-700">{quote.leadTime}</td>
                          <td className="py-3 px-2 text-gray-700">{formatDate(quote.validUntil)}</td>
                          <td className="py-3 px-2 text-center">
                            <Badge
                              variant={
                                quote.status === "accepted" ? "success" :
                                quote.status === "pending" ? "warning" :
                                quote.status === "rejected" ? "destructive" : "info"
                              }
                            >
                              {quote.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {loading && (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-500">Loading quotes...</p>
                </div>
              )}
              {!loading && supplierQuotes.length === 0 && !error && (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No supplier quotes available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
