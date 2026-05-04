"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Trash2, RotateCcw, Copy, Check, X } from "lucide-react";
import { formatRelative, cn } from "@/lib/shared/utils";
import { parseJsonSafe } from "@/lib/shared/utils";

const SCOPE_OPTIONS = [
  { value: "*", label: "Full Access" },
  { value: "accounts:read", label: "Accounts Read" },
  { value: "accounts:write", label: "Accounts Write" },
  { value: "emails:read", label: "Emails Read" },
];

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scopes, setScopes] = useState(["*"]);

  const { data } = useQuery<{ apiKeys: any[] }>({
    queryKey: ["api-keys"],
    queryFn: () => fetch("/api/v1/api-keys").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, scopes }),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKey(d.key);
      setShowCreate(false);
      setName(""); setDescription(""); setScopes(["*"]);
    },
    onError: () => toast.error("Failed to create key"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["api-keys"] }); toast.success("Key revoked"); },
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/api-keys/${id}/rotate`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["api-keys"] }); setNewKey(d.key); toast.success("Key rotated"); },
  });

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleScope(s: string) {
    if (s === "*") { setScopes(["*"]); return; }
    const filtered = scopes.filter((x) => x !== "*");
    setScopes(filtered.includes(s) ? filtered.filter((x) => x !== s) : [...filtered, s]);
  }

  const keys = data?.apiKeys ?? [];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-500 mt-0.5">{keys.length} keys</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />New Key
        </button>
      </div>

      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800 mb-2">
            New API key — copy it now, it won&apos;t be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white border border-green-200 rounded px-3 py-2 text-green-900 break-all">
              {newKey}
            </code>
            <button onClick={copyKey} className="p-2 bg-green-100 hover:bg-green-200 rounded-lg flex-shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4 text-green-700" />}
            </button>
            <button onClick={() => setNewKey(null)} className="p-2 hover:bg-green-100 rounded-lg flex-shrink-0">
              <X className="w-4 h-4 text-green-700" />
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Create API Key</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CI/CD Pipeline" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleScope(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                    scopes.includes(opt.value)
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending} className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors">
              {createMutation.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No API keys yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Prefix</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Last Used</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{k.name}</p>
                    {k.description && <p className="text-xs text-gray-400">{k.description}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{k.keyPrefix}…</code>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {k.lastUsedAt ? formatRelative(k.lastUsedAt) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", k.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      {k.isActive ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { if (confirm("Rotate this key? The old key will be invalidated.")) rotateMutation.mutate(k.id); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Rotate">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm("Revoke this key?")) revokeMutation.mutate(k.id); }} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Revoke">
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
    </div>
  );
}
