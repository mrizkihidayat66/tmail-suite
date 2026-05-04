"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Copy, Check, RefreshCw, Trash2, RotateCcw, Search } from "lucide-react";
import { formatRelative, formatDateTime, cn } from "@/lib/shared/utils";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"inbox" | "stats" | "settings">("inbox");
  const [copied, setCopied] = useState<string | null>(null);
  const [emailPage, setEmailPage] = useState(1);
  const [emailSearch, setEmailSearch] = useState("");

  const { data: account, isLoading } = useQuery<any>({
    queryKey: ["account", id],
    queryFn: () => fetch(`/api/v1/accounts/${id}`).then((r) => r.json()),
  });

  const { data: emailsData } = useQuery<any>({
    queryKey: ["emails", id, emailPage, emailSearch],
    queryFn: () =>
      fetch(`/api/v1/accounts/${id}/emails?page=${emailPage}&limit=20${emailSearch ? `&subject=${encodeURIComponent(emailSearch)}` : ""}`).then((r) => r.json()),
    enabled: tab === "inbox",
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["account-stats", id],
    queryFn: () => fetch(`/api/v1/accounts/${id}/stats`).then((r) => r.json()),
    enabled: tab === "stats",
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/v1/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Account deleted"); router.push("/dashboard/accounts"); },
  });

  const resetMutation = useMutation({
    mutationFn: () => fetch(`/api/v1/accounts/${id}/reset-password`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (d) => toast.success(`New password: ${d.password}`, { duration: 10_000 }),
  });

  const syncMutation = useMutation({
    mutationFn: () => fetch(`/api/v1/accounts/${id}/sync`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (d) => {
      toast.success(`Sync done: +${d.processed} emails`);
      qc.invalidateQueries({ queryKey: ["emails", id] });
      qc.invalidateQueries({ queryKey: ["account", id] });
    },
  });

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (isLoading) return <div className="text-sm text-gray-400 p-8">Loading…</div>;
  if (!account || account.error) return <div className="text-sm text-red-500 p-8">Account not found</div>;

  const emails: any[] = emailsData?.emails ?? [];
  const unreadCount: number = emailsData?.unreadCount ?? 0;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{account.email}</h1>
          <p className="text-sm text-gray-500">{account.emailCount} emails · {account.label ?? "no label"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600" title="Sync now">
            <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
          </button>
          <button onClick={() => resetMutation.mutate()} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600" title="Reset password">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => { if (confirm(`Delete ${account.email}?`)) deleteMutation.mutate(); }} className="p-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Email</p>
            <p className="text-sm font-mono">{account.email}</p>
          </div>
          <button onClick={() => copy(account.email, "email")} className="p-1.5 hover:bg-gray-200 rounded">
            {copied === "email" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Expires</p>
            <p className="text-sm">{account.expiresAt ? formatDateTime(account.expiresAt) : "Never"}</p>
          </div>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", account.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
            {account.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(["inbox", "stats", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px",
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t}
            {t === "inbox" && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "inbox" && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              placeholder="Search emails…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {emails.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No emails yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {emails.map((e: any) => (
                  <Link
                    key={e.id}
                    href={`/dashboard/accounts/${id}/email/${e.id}`}
                    className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", !e.isRead ? "bg-blue-500" : "bg-transparent")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm truncate", !e.isRead ? "font-semibold text-gray-900" : "text-gray-700")}>
                          {e.subject || "(no subject)"}
                        </p>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatRelative(e.receivedAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{e.fromAddress}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "stats" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {([
            ["Total Emails", stats.total],
            ["Unread", stats.unread],
            ["Last 24h", stats.last24h],
            ["Last 7 days", stats.last7d],
            ["Last Email", stats.lastEmailAt ? formatRelative(stats.lastEmailAt) : "Never"],
            ["Last Synced", stats.lastSyncedAt ? formatRelative(stats.lastSyncedAt) : "Never"],
          ] as const).map(([lbl, val]) => (
            <div key={lbl} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{lbl}</p>
              <p className="text-xl font-bold text-gray-900">{val}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            {([
              ["Username", account.username],
              ["TTL", account.ttlHours === 0 ? "Permanent" : `${account.ttlHours}h`],
              ["Created", formatDateTime(account.createdAt)],
              ["Last Synced", account.lastSyncedAt ? formatRelative(account.lastSyncedAt) : "Never"],
            ] as const).map(([lbl, val]) => (
              <div key={lbl}>
                <p className="text-gray-500 mb-1">{lbl}</p>
                <p className="font-medium">{val}</p>
              </div>
            ))}
          </div>
          {account.notes && (
            <div>
              <p className="text-gray-500 mb-1">Notes</p>
              <p className="bg-gray-50 rounded-lg p-3">{account.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
