"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Plus, Zap, Search, Trash2, Eye, RotateCcw,
  ChevronLeft, ChevronRight, Download, Tag, Clock,
  CheckSquare, Square, Filter,
} from "lucide-react";
import { formatRelative, formatDateTime, cn } from "@/lib/shared/utils";
import { useConfirmModal } from "@/hooks/useConfirmModal";

function StatusBadge({ account }: { account: any }) {
  const now = new Date();
  const exp = account.expiresAt ? new Date(account.expiresAt) : null;
  const expired = exp && exp < now;
  const soon = exp && !expired && exp < new Date(now.getTime() + 86_400_000);

  if (!account.isActive || expired)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Expired</span>;
  if (soon)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Expiring Soon</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>;
}

export default function AccountsPage() {
  const qc = useQueryClient();
  const confirm = useConfirmModal();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "expired">("");
  const [labelFilter, setLabelFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLabel, setBulkLabel] = useState("");
  const [showBulkLabel, setShowBulkLabel] = useState(false);
  const [showBulkTtl, setShowBulkTtl] = useState(false);
  const [bulkTtl, setBulkTtl] = useState(24);

  const { data, isLoading } = useQuery<{ accounts: any[]; total: number }>({
    queryKey: ["accounts", page, search, limit, statusFilter, labelFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (labelFilter) params.set("label", labelFilter);
      return fetch(`/api/v1/accounts?${params.toString()}`).then((r) => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Account deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/v1/accounts/${id}/reset-password`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (d) => toast.success(`New password: ${d.password}`, { duration: 10_000 }),
    onError: () => toast.error("Failed to reset password"),
  });

  const accounts = data?.accounts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const allIds = accounts.map((a) => a.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); allIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelected((prev) => new Set([...prev, ...allIds]));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function bulkDelete() {
    const ok = await confirm({
      title: "Delete accounts",
      description: `Are you sure you want to delete ${selected.size} account(s)? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    const ids = [...selected];
    await Promise.all(ids.map((id) => fetch(`/api/v1/accounts/${id}`, { method: "DELETE" })));
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["accounts"] });
    toast.success(`Deleted ${ids.length} accounts`);
  }

  async function bulkSetLabel() {
    const ids = [...selected];
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/v1/accounts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: bulkLabel || null }),
        })
      )
    );
    setSelected(new Set()); setShowBulkLabel(false); setBulkLabel("");
    qc.invalidateQueries({ queryKey: ["accounts"] });
    toast.success("Label updated");
  }

  async function bulkExtendTtl() {
    const ids = [...selected];
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/v1/accounts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ttlHours: bulkTtl }),
        })
      )
    );
    setSelected(new Set()); setShowBulkTtl(false);
    qc.invalidateQueries({ queryKey: ["accounts"] });
    toast.success("TTL updated");
  }

  function exportSelected(fmt: "csv" | "json") {
    const rows = accounts.filter((a) => selected.has(a.id));
    const content =
      fmt === "json"
        ? JSON.stringify(rows, null, 2)
        : [
            "email,username,label,is_active,expires_at,email_count",
            ...rows.map((r) =>
              `${r.email},${r.username},${r.label ?? ""},${r.isActive},${r.expiresAt ?? ""},${r.emailCount}`
            ),
          ].join("\n");
    const blob = new Blob([content], { type: fmt === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `accounts.${fmt}`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div id="accounts-page" className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 id="accounts-title" className="text-xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        <div className="flex gap-2">
          <Link id="bulk-link" href="/dashboard/bulk" className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
            <Zap className="w-4 h-4" />Bulk
          </Link>
          <Link id="new-account-button" href="/dashboard/accounts/new" className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" />New Account
          </Link>
        </div>
      </div>

      <form
        id="search-form"
        onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); setSelected(new Set()); }}
        className="flex gap-2"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="search-input"
            name="search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search email, label, notes…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button id="search-submit" type="submit" className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
          Search
        </button>
      </form>

      {/* Filters toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as "" | "active" | "expired"); setPage(1); setSelected(new Set()); }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
        <input
          id="label-filter"
          type="text"
          value={labelFilter}
          onChange={(e) => { setLabelFilter(e.target.value); setPage(1); setSelected(new Set()); }}
          placeholder="Filter by label…"
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
        />
        <div className="ml-auto flex items-center gap-1.5 text-sm text-gray-500">
          <span>Show:</span>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); setSelected(new Set()); }}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>items</span>
        </div>
        {(statusFilter || labelFilter) && (
          <button
            onClick={() => { setStatusFilter(""); setLabelFilter(""); setPage(1); setSelected(new Set()); }}
            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Clear filters
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div id="bulk-actions-bar" className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl flex-wrap">
          <span className="text-sm font-medium text-blue-800">{selected.size} selected</span>
          <div className="flex gap-2 flex-wrap">
            <button id="bulk-set-label-button" onClick={() => setShowBulkLabel(!showBulkLabel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50">
              <Tag className="w-3.5 h-3.5" />Set Label
            </button>
            <button id="bulk-extend-ttl-button" onClick={() => setShowBulkTtl(!showBulkTtl)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50">
              <Clock className="w-3.5 h-3.5" />Extend TTL
            </button>
            <button id="bulk-export-csv-button" onClick={() => exportSelected("csv")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50">
              <Download className="w-3.5 h-3.5" />CSV
            </button>
            <button id="bulk-export-json-button" onClick={() => exportSelected("json")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50">
              <Download className="w-3.5 h-3.5" />JSON
            </button>
            <button id="bulk-delete-button" onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100">
              <Trash2 className="w-3.5 h-3.5" />Delete
            </button>
            <button id="bulk-clear-selection" onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>
          {showBulkLabel && (
            <div className="flex items-center gap-2 w-full mt-1">
              <input
                id="bulk-label-input"
                name="bulkLabel"
                type="text"
                value={bulkLabel}
                onChange={(e) => setBulkLabel(e.target.value)}
                placeholder="Label (empty to clear)"
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
              <button onClick={bulkSetLabel} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Apply</button>
            </div>
          )}
          {showBulkTtl && (
            <div className="flex items-center gap-2 w-full mt-1">
              <select
                value={bulkTtl}
                onChange={(e) => setBulkTtl(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>+1 hour</option>
                <option value={6}>+6 hours</option>
                <option value={24}>+24 hours</option>
                <option value={48}>+48 hours</option>
                <option value={168}>+7 days</option>
                <option value={0}>Permanent</option>
              </select>
              <button onClick={bulkExtendTtl} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Apply</button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No accounts.{" "}
            <Link href="/dashboard/accounts/new" className="text-blue-600 hover:underline">Create one</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                    {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Label</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Emails</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Created</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Expires</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((a) => (
                <tr key={a.id} className={cn("hover:bg-gray-50 transition-colors", selected.has(a.id) && "bg-blue-50")}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleOne(a.id)} className="text-gray-400 hover:text-blue-600">
                      {selected.has(a.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[200px]">{a.email}</div>
                    {a.displayName && <div className="text-xs text-gray-400">{a.displayName}</div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {a.label
                      ? <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{a.label}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge account={a} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{a.emailCount}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{formatRelative(a.createdAt)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {a.expiresAt ? formatDateTime(a.expiresAt) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/dashboard/accounts/${a.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" title="View inbox">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => resetMutation.mutate(a.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700" title="Reset password">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Delete account",
                            description: `Are you sure you want to delete ${a.email}? This action cannot be undone.`,
                            confirmLabel: "Delete",
                            variant: "danger",
                          });
                          if (ok) deleteMutation.mutate(a.id);
                        }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
