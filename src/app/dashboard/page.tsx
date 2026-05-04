"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import toast from "react-hot-toast";
import { Users, Mail, Key, Activity, RefreshCw } from "lucide-react";
import { formatRelative } from "@/lib/shared/utils";
import type { SystemStats, EmailRow } from "@/types";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value ?? "—"}</div>
    </div>
  );
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data: stats } = useQuery<SystemStats>({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/v1/admin/stats").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const { data: recentData } = useQuery<{ emails: EmailRow[] }>({
    queryKey: ["recent-emails"],
    queryFn: () => fetch("/api/v1/emails/recent?limit=5").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      fetch("/api/v1/admin/sync-all", { method: "POST" }).then((r) => r.json()),
    onSuccess: (d) => {
      toast.success(`Sync done: +${d.processed} emails`);
      qc.invalidateQueries({ queryKey: ["recent-emails"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast.error("Sync failed"),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">System overview</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 text-gray-600 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sync All
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Accounts" value={stats?.totalAccounts} icon={Users} color="blue" />
        <StatCard label="Active Accounts" value={stats?.activeAccounts} icon={Activity} color="green" />
        <StatCard label="Emails (24h)" value={stats?.emailsLast24h} icon={Mail} color="purple" />
        <StatCard label="Active API Keys" value={stats?.activeApiKeys} icon={Key} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Emails</h2>
            <Link href="/dashboard/accounts" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {!recentData?.emails?.length && (
              <p className="text-sm text-gray-400 text-center py-4">No emails yet</p>
            )}
            {recentData?.emails?.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {e.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{e.fromAddress}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatRelative(e.receivedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Gmail</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  stats?.gmailConnected
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {stats?.gmailConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Emails Stored</span>
              <span className="font-medium">{stats?.totalEmails ?? "—"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Expired Accounts</span>
              <span className="font-medium">{stats?.expiredAccounts ?? "—"}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            <Link
              href="/dashboard/accounts/new"
              className="flex-1 text-center text-sm bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
            >
              New Account
            </Link>
            <Link
              href="/dashboard/bulk"
              className="flex-1 text-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors"
            >
              Bulk Generate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
