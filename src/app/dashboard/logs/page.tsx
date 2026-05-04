"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime, cn } from "@/lib/shared/utils";

const ACTION_COLORS: Record<string, string> = {
  "account.create": "bg-green-100 text-green-700",
  "account.delete": "bg-red-100 text-red-700",
  "account.bulk_create": "bg-blue-100 text-blue-700",
  "api_key.create": "bg-purple-100 text-purple-700",
  "api_key.revoke": "bg-orange-100 text-orange-700",
};

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [actorType, setActorType] = useState("");

  const { data, isLoading } = useQuery<{ logs: any[]; total: number }>({
    queryKey: ["audit-logs", page, action, actorType],
    queryFn: () =>
      fetch(`/api/v1/admin/audit-log?page=${page}&limit=50${action ? `&action=${action}` : ""}${actorType ? `&actorType=${actorType}` : ""}`).then((r) => r.json()),
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} entries</p>
      </div>

      <div className="flex gap-2">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Actions</option>
          {["account.create", "account.delete", "account.bulk_create", "api_key.create", "api_key.revoke"].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={actorType}
          onChange={(e) => { setActorType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Actors</option>
          <option value="admin">Admin</option>
          <option value="api_key">API Key</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No logs found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Target</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", log.actorType === "admin" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700")}>
                      {log.actorType}
                    </span>
                    <span className="ml-1.5 text-xs text-gray-600">{log.actorName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700")}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500 truncate max-w-[200px]">
                    {log.targetName ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400 font-mono">
                    {log.ipAddress ?? "—"}
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
