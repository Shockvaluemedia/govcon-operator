"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would call AWS Cognito forgot password flow
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2">
            <Building2 className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GovCon</h1>
              <p className="text-xs text-gray-500 -mt-1">Operator</p>
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Reset your password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
            <p className="text-sm text-green-800">
              If an account exists with <strong>{email}</strong>, you&apos;ll receive a password
              reset link shortly.
            </p>
            <Link href="/login" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Send Reset Link
            </Button>

            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
