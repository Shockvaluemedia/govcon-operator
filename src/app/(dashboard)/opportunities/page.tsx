"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockOpportunities } from "@/data/mock-opportunities";
import { formatCurrency, formatDate, calculateDaysUntil } from "@/lib/utils";

export default function OpportunitiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [setAsideFilter, setSetAsideFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const filteredOpportunities = mockOpportunities.filter((opp) => {
    const matchesSearch =
      searchQuery === "" ||
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.solicitationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.agency.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAgency = agencyFilter === "all" || opp.agency.includes(agencyFilter);
    const matchesSetAside = setAsideFilter === "all" || opp.setAsideType === setAsideFilter;
    const matchesSource = sourceFilter === "all" || opp.source === sourceFilter;

    return matchesSearch && matchesAgency && matchesSetAside && matchesSource;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunity Discovery</h1>
          <p className="text-sm text-gray-500 mt-1">
            Search and filter government contract opportunities
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredOpportunities.length} opportunities
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title, solicitation number, or agency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Filters:</span>
              </div>
              <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Agency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agencies</SelectItem>
                  <SelectItem value="Defense">Department of Defense</SelectItem>
                  <SelectItem value="Veterans">Veterans Affairs</SelectItem>
                  <SelectItem value="General Services">GSA</SelectItem>
                  <SelectItem value="Health">HHS</SelectItem>
                  <SelectItem value="Energy">DOE</SelectItem>
                  <SelectItem value="Postal">USPS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={setAsideFilter} onValueChange={setSetAsideFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Set-Aside" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Set-Asides</SelectItem>
                  <SelectItem value="Total Small Business">Total Small Business</SelectItem>
                  <SelectItem value="8(a) Business Development">8(a)</SelectItem>
                  <SelectItem value="Service-Disabled Veteran-Owned Small Business">SDVOSB</SelectItem>
                  <SelectItem value="Women-Owned Small Business">WOSB</SelectItem>
                  <SelectItem value="HUBZone">HUBZone</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="SAM.gov">SAM.gov</SelectItem>
                  <SelectItem value="DLA">DLA</SelectItem>
                  <SelectItem value="FPDS">FPDS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Title</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500 hidden md:table-cell">Agency</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500 hidden lg:table-cell">Set-Aside</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">Value</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-500">Match</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-500 hidden sm:table-cell">Risk</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500 hidden lg:table-cell">Due</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opp) => {
                  const daysUntilDue = calculateDaysUntil(opp.dueDate);
                  return (
                    <tr key={opp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <Link href={`/opportunities/${opp.id}`} className="hover:text-primary">
                          <p className="font-medium text-gray-900 line-clamp-1">{opp.title}</p>
                          <p className="text-xs text-gray-500">{opp.solicitationNumber}</p>
                        </Link>
                      </td>
                      <td className="py-3 px-2 hidden md:table-cell">
                        <span className="text-gray-700 text-xs">{opp.agency}</span>
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {opp.setAsideType}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="font-medium text-gray-900">{formatCurrency(opp.estimatedValue)}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant={opp.matchScore >= 80 ? "success" : opp.matchScore >= 60 ? "warning" : "secondary"}
                        >
                          {opp.matchScore}%
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center hidden sm:table-cell">
                        <Badge
                          variant={opp.riskScore >= 50 ? "destructive" : opp.riskScore >= 30 ? "warning" : "success"}
                        >
                          {opp.riskScore >= 50 ? "High" : opp.riskScore >= 30 ? "Med" : "Low"}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell">
                        <div>
                          <p className="text-gray-700 text-xs">{formatDate(opp.dueDate)}</p>
                          <p className={`text-xs ${daysUntilDue <= 14 ? "text-red-600 font-medium" : "text-gray-500"}`}>
                            {daysUntilDue} days
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="info" className="text-xs">{opp.source}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredOpportunities.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No opportunities match your filters.</p>
              <Button variant="ghost" className="mt-2" onClick={() => { setSearchQuery(""); setAgencyFilter("all"); setSetAsideFilter("all"); setSourceFilter("all"); }}>
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
