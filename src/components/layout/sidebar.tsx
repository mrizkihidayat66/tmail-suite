"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Zap, Key, ScrollText, Settings, LogOut, Mail,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/accounts", label: "Accounts", icon: Users },
  { href: "/dashboard/bulk", label: "Bulk Generate", icon: Zap },
  { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <nav id="sidebar" className="flex flex-col h-full bg-white border-r border-gray-200">
      <div id="sidebar-header" className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-200 flex-shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 truncate">Tmail Suite</span>
      </div>

      <div id="sidebar-nav" className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div id="sidebar-footer" className="p-3 border-t border-gray-200 flex-shrink-0">
        <button
          id="logout-button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </nav>
  );
}
