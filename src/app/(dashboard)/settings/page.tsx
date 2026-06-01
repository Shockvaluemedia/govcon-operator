"use client";

import React from "react";
import { User, Building, Bell, Shield, Plug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and organization settings</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <Input defaultValue="Jane" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <Input defaultValue="Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input defaultValue="jane@company.com" type="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <Input defaultValue="Operator" disabled />
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <Input defaultValue="Acme Government Solutions LLC" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UEI</label>
              <Input defaultValue="ABC123DEF456" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CAGE Code</label>
              <Input defaultValue="1A2B3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NAICS Codes</label>
              <Input defaultValue="424120, 423430, 424690" />
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "New opportunity matches", description: "Get notified when new opportunities match your profile" },
              { label: "Bid deadlines", description: "Reminders before bid submission deadlines" },
              { label: "Compliance reminders", description: "Alerts for expiring registrations or certifications" },
              { label: "Supplier quote updates", description: "Notifications when suppliers respond to quote requests" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "SAM.gov API", status: "Connected", key: "••••••••abcd" },
              { name: "DLA DIBBS", status: "Connected", key: "••••••••efgh" },
              { name: "OpenAI / AWS Bedrock", status: "Mock Mode", key: "Not configured" },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                  <p className="text-xs text-gray-500">API Key: {integration.key}</p>
                </div>
                <Badge variant={integration.status === "Connected" ? "success" : "secondary"}>
                  {integration.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Change Password</label>
            <div className="flex gap-2">
              <Input type="password" placeholder="New password" className="max-w-xs" />
              <Button variant="outline">Update</Button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
