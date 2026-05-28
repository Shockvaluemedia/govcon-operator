"use client";

import React, { useState } from "react";
import { Plus, Star, ExternalLink, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockSuppliers, mockSupplierQuotes } from "@/data/mock-suppliers";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSuppliers = mockSuppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.productCategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Sourcing</h1>
          <p className="text-sm text-gray-500 mt-1">Manage suppliers and compare quotes</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers ({mockSuppliers.length})</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({mockSupplierQuotes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <div className="space-y-4">
            <Input
              placeholder="Search suppliers by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{supplier.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-medium">{supplier.reliabilityRating}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="w-fit">{supplier.productCategory}</Badge>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Unit Cost</dt>
                        <dd className="font-medium">{formatCurrency(supplier.unitCost)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">MOQ</dt>
                        <dd className="font-medium">{supplier.moq} units</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Lead Time</dt>
                        <dd className="font-medium">{supplier.leadTime}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Shipping Est.</dt>
                        <dd className="font-medium">{formatCurrency(supplier.shippingEstimate)}</dd>
                      </div>
                    </dl>

                    {supplier.notes && (
                      <p className="mt-3 text-xs text-gray-500 italic">{supplier.notes}</p>
                    )}

                    <div className="mt-4 flex items-center gap-2 pt-3 border-t">
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
                    {mockSupplierQuotes.map((quote) => {
                      const supplier = mockSuppliers.find((s) => s.id === quote.supplierId);
                      return (
                        <tr key={quote.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium">{supplier?.name}</td>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
