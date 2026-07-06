"use client";

import React, { useState, useMemo } from "react";
import { Calculator, TrendingUp, AlertTriangle, DollarSign, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function MarginCalculatorPage() {
  const [inputs, setInputs] = useState({
    contractPrice: 125000,
    unitCost: 24.99,
    quantity: 500,
    shipping: 2500,
    packaging: 500,
    labor: 3000,
    financingCost: 1500,
    platformFees: 0,
    contingency: 5,
    expectedPaymentDelay: 45,
  });

  const handleChange = (field: string, value: string) => {
    setInputs({ ...inputs, [field]: parseFloat(value) || 0 });
  };

  const calculations = useMemo(() => {
    const totalCOGS = inputs.unitCost * inputs.quantity;
    const totalDirectCosts = totalCOGS + inputs.shipping + inputs.packaging + inputs.labor;
    const totalIndirectCosts = inputs.financingCost + inputs.platformFees;
    const contingencyAmount = (totalDirectCosts + totalIndirectCosts) * (inputs.contingency / 100);
    const totalCosts = totalDirectCosts + totalIndirectCosts + contingencyAmount;

    const grossProfit = inputs.contractPrice - totalCOGS;
    const grossMargin = inputs.contractPrice > 0 ? (grossProfit / inputs.contractPrice) * 100 : 0;

    const netProfit = inputs.contractPrice - totalCosts;
    const netMargin = inputs.contractPrice > 0 ? (netProfit / inputs.contractPrice) * 100 : 0;

    const cashNeededUpfront = totalDirectCosts + totalIndirectCosts;
    const breakEvenPrice = totalCosts;

    // Risk-adjusted profit accounts for payment delay cost of capital
    const dailyCostOfCapital = cashNeededUpfront * 0.0002; // ~7% annual
    const paymentDelayCost = dailyCostOfCapital * inputs.expectedPaymentDelay;
    const riskAdjustedProfit = netProfit - paymentDelayCost;

    let bidRecommendation: "strong_bid" | "moderate_bid" | "weak_bid" | "no_bid";
    if (netMargin >= 20) bidRecommendation = "strong_bid";
    else if (netMargin >= 12) bidRecommendation = "moderate_bid";
    else if (netMargin >= 5) bidRecommendation = "weak_bid";
    else bidRecommendation = "no_bid";

    return {
      totalCOGS,
      totalDirectCosts,
      totalIndirectCosts,
      contingencyAmount,
      totalCosts,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      cashNeededUpfront,
      breakEvenPrice,
      riskAdjustedProfit,
      bidRecommendation,
      paymentDelayCost,
    };
  }, [inputs]);

  const recommendationConfig = {
    strong_bid: { label: "Strong Bid", color: "success" as const, icon: CheckCircle2 },
    moderate_bid: { label: "Moderate Bid", color: "info" as const, icon: TrendingUp },
    weak_bid: { label: "Weak Bid", color: "warning" as const, icon: AlertTriangle },
    no_bid: { label: "No Bid", color: "destructive" as const, icon: AlertTriangle },
  };

  const rec = recommendationConfig[calculations.bidRecommendation];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Margin Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Determine whether an opportunity is profitable before bidding
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Cost Inputs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Price ($)</label>
                <Input
                  type="number"
                  value={inputs.contractPrice}
                  onChange={(e) => handleChange("contractPrice", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputs.unitCost}
                    onChange={(e) => handleChange("unitCost", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <Input
                    type="number"
                    value={inputs.quantity}
                    onChange={(e) => handleChange("quantity", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping ($)</label>
                  <Input
                    type="number"
                    value={inputs.shipping}
                    onChange={(e) => handleChange("shipping", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Packaging ($)</label>
                  <Input
                    type="number"
                    value={inputs.packaging}
                    onChange={(e) => handleChange("packaging", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Labor ($)</label>
                  <Input
                    type="number"
                    value={inputs.labor}
                    onChange={(e) => handleChange("labor", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Financing Cost ($)</label>
                  <Input
                    type="number"
                    value={inputs.financingCost}
                    onChange={(e) => handleChange("financingCost", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fees ($)</label>
                  <Input
                    type="number"
                    value={inputs.platformFees}
                    onChange={(e) => handleChange("platformFees", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contingency (%)</label>
                  <Input
                    type="number"
                    value={inputs.contingency}
                    onChange={(e) => handleChange("contingency", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Payment Delay (days)</label>
                <Input
                  type="number"
                  value={inputs.expectedPaymentDelay}
                  onChange={(e) => handleChange("expectedPaymentDelay", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Recommendation */}
          <Card className={
            calculations.bidRecommendation === "strong_bid" ? "border-green-200" :
            calculations.bidRecommendation === "moderate_bid" ? "border-slate-300" :
            calculations.bidRecommendation === "weak_bid" ? "border-amber-200" :
            "border-red-200"
          }>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <rec.icon className="h-6 w-6" />
                <div>
                  <Badge variant={rec.color} className="text-sm px-3 py-1">
                    {rec.label}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {calculations.bidRecommendation === "strong_bid" && "Healthy margins. This opportunity looks profitable."}
                    {calculations.bidRecommendation === "moderate_bid" && "Acceptable margins. Proceed with cost optimization."}
                    {calculations.bidRecommendation === "weak_bid" && "Thin margins. Consider negotiating costs or passing."}
                    {calculations.bidRecommendation === "no_bid" && "Margins too thin or negative. Not recommended."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">Gross Margin</p>
                <p className={`text-2xl font-bold ${calculations.grossMargin >= 20 ? "text-green-600" : calculations.grossMargin >= 10 ? "text-amber-600" : "text-red-600"}`}>
                  {calculations.grossMargin.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">{formatCurrency(calculations.grossProfit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">Net Margin</p>
                <p className={`text-2xl font-bold ${calculations.netMargin >= 15 ? "text-green-600" : calculations.netMargin >= 5 ? "text-amber-600" : "text-red-600"}`}>
                  {calculations.netMargin.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">{formatCurrency(calculations.netProfit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">Cash Needed Upfront</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(calculations.cashNeededUpfront)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500">Break-Even Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(calculations.breakEvenPrice)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Total COGS (unit × qty)</dt>
                  <dd className="font-medium">{formatCurrency(calculations.totalCOGS)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Shipping</dt>
                  <dd className="font-medium">{formatCurrency(inputs.shipping)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Packaging</dt>
                  <dd className="font-medium">{formatCurrency(inputs.packaging)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Labor</dt>
                  <dd className="font-medium">{formatCurrency(inputs.labor)}</dd>
                </div>
                <div className="flex justify-between py-1 border-t pt-2">
                  <dt className="text-gray-500">Total Direct Costs</dt>
                  <dd className="font-medium">{formatCurrency(calculations.totalDirectCosts)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Financing + Fees</dt>
                  <dd className="font-medium">{formatCurrency(calculations.totalIndirectCosts)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Contingency ({inputs.contingency}%)</dt>
                  <dd className="font-medium">{formatCurrency(calculations.contingencyAmount)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Payment Delay Cost</dt>
                  <dd className="font-medium">{formatCurrency(calculations.paymentDelayCost)}</dd>
                </div>
                <div className="flex justify-between py-2 border-t font-semibold">
                  <dt>Total All-In Costs</dt>
                  <dd>{formatCurrency(calculations.totalCosts)}</dd>
                </div>
                <div className="flex justify-between py-2 border-t">
                  <dt className="font-semibold">Risk-Adjusted Profit</dt>
                  <dd className={`font-bold ${calculations.riskAdjustedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(calculations.riskAdjustedProfit)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
