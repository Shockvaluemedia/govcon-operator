import Link from "next/link";
import {
  Search,
  Brain,
  Truck,
  ShieldCheck,
  Kanban,
  Calculator,
  ArrowRight,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Search,
    title: "Discover Opportunities",
    description:
      "Search federal, state, and local procurement opportunities from SAM.gov, DLA, and more. Filter by NAICS, set-aside, agency, and value.",
  },
  {
    icon: Brain,
    title: "Analyze Bids with AI",
    description:
      "Get plain-language summaries, bid/no-bid recommendations, risk assessments, and compliance requirements extracted automatically.",
  },
  {
    icon: Truck,
    title: "Source Suppliers",
    description:
      "Find, compare, and manage suppliers. Track quotes, lead times, MOQs, and reliability ratings in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Track Compliance",
    description:
      "Monitor your readiness score across SAM registration, certifications, documents, and eligibility requirements.",
  },
  {
    icon: Kanban,
    title: "Manage Execution",
    description:
      "Move opportunities through a structured workflow from discovery to fulfillment with task tracking and team collaboration.",
  },
  {
    icon: Calculator,
    title: "Calculate Margins",
    description:
      "Determine profitability with detailed cost analysis including shipping, labor, financing, and payment delay factors.",
  },
];

const benefits = [
  "Find opportunities matched to your capabilities",
  "Understand complex solicitations in plain language",
  "Know exactly what compliance items you need",
  "Calculate whether a bid is worth pursuing",
  "Track every opportunity through your pipeline",
  "Build a structured procurement business",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <span className="text-xl font-bold text-gray-900">GovCon</span>
                <span className="text-xl font-light text-gray-500 ml-1">Operator</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Your AI Operating System for{" "}
              <span className="text-blue-600">Government Contracting</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Find opportunities, understand requirements, evaluate bids, source suppliers,
              calculate margins, and manage execution — all from one platform built for
              small businesses entering government contracting.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start Assessment <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg">
                  View Dashboard
                </Button>
              </Link>
              <Link href="/ai-analyzer">
                <Button variant="outline" size="lg">
                  Analyze Opportunity
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to win government contracts
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From opportunity discovery to contract fulfillment, GovCon Operator gives you
              the tools and intelligence to compete effectively.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <feature.icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Built for execution, not motivation
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                This isn&apos;t a course platform. GovCon Operator is a professional execution
                system that helps you find, evaluate, and win government contracts with
                structure and intelligence.
              </p>
              <ul className="mt-8 space-y-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Link href="/register">
                  <Button size="lg" className="gap-2">
                    Start Building Your Pipeline <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8">
              <div className="space-y-4">
                <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Compliance Readiness</span>
                    <span className="text-sm font-bold text-blue-600">72%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: "72%" }} />
                  </div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Active Opportunities</span>
                    <span className="text-2xl font-bold text-gray-900">12</span>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Pipeline Value</span>
                    <span className="text-2xl font-bold text-gray-900">$1.2M</span>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">AI Recommendations</span>
                    <span className="text-sm text-green-600 font-medium">3 new actions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to start winning government contracts?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Join small businesses using GovCon Operator to build structured procurement operations.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">GovCon Operator</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2026 GovCon Operator. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
