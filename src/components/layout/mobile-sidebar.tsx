"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X, Building2, LayoutDashboard, Search, Brain, Truck, Calculator, ShieldCheck, Kanban, FileText, MessageSquare, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="relative z-50 lg:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/80" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed inset-0 flex">
        <div className="relative mr-16 flex w-full max-w-xs flex-1">
          <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
              <X className="h-6 w-6 text-white" />
            </Button>
          </div>

          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">GovCon</h1>
                <p className="text-xs text-gray-500 -mt-1">Operator</p>
              </div>
            </div>

            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6",
                          isActive
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive ? "text-blue-700" : "text-gray-400 group-hover:text-blue-600"
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
