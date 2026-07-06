"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  Brain,
  Truck,
  Calculator,
  ShieldCheck,
  Kanban,
  FileText,
  MessageSquare,
  Settings,
  Users,
  Building2,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Opportunities", href: "/opportunities", icon: Search },
  { name: "AI Analyzer", href: "/ai-analyzer", icon: Brain },
  { name: "Supplier Sourcing", href: "/suppliers", icon: Truck },
  { name: "Margin Calculator", href: "/calculator", icon: Calculator },
  { name: "Compliance", href: "/compliance", icon: ShieldCheck },
  { name: "Workflows", href: "/workflows", icon: Kanban },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "AI Assistant", href: "/ai-assistant", icon: MessageSquare },
  { name: "Admin", href: "/admin", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">GovCon</h1>
            <p className="text-xs text-gray-500 -mt-1">Operator</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-primary" : "text-gray-400 group-hover:text-primary"
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <span className="text-sm font-medium text-primary">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Jane Doe</p>
              <p className="text-xs text-gray-500 truncate">Operator</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
