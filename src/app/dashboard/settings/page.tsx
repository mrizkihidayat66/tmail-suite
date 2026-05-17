"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, RefreshCw, Mail, CheckCircle, XCircle, Globe, Settings2, Eye, EyeOff, KeyRound, AlertTriangle, Terminal, Copy, Check } from "lucide-react";
import { cn, copyToClipboard } from "@/lib/shared/utils";
import type { MeResponse, HealthStatus, AdminUserRow, GmailStatus, DomainRow } from "@/types";
import { useConfirmModal } from "@/hooks/useConfirmModal";

type Tab = "account" | "system" | "users" | "gmail" | "domains" | "config";

function extractPrivateIpInfo(uri: string): { ip: string; port: string } | null {
  try {
    const url = new URL(uri);
    const host = url.hostname;
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    const isPrivate =
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^192\.168\./.test(host);
    return isPrivate ? { ip: host, port } : null;
  } catch {
    return null;
  }
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const confirm = useConfirmModal();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(() => {
    const initial = (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null) as Tab | null;
    const validTabs: Tab[] = ["account", "system", "users", "gmail", "domains", "config"];
    return initial && validTabs.includes(initial) ? initial : "account";
  });

  const switchTab = useCallback((key: Tab) => {
    setTab(key);
    router.replace(`/dashboard/settings?tab=${key}`, { scroll: false });
  }, [router]);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");

  const [newDomain, setNewDomain] = useState("");

  const [configForm, setConfigForm] = useState({
    google_client_id: "",
    google_client_secret: "",
    google_redirect_uri: "",
    gmail_catchall_email: "",
    gmail_poll_interval: "",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [osTab, setOsTab] = useState<"windows" | "linux" | "macos">("windows");

  async function copyCmd(text: string, key: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedCmd(key);
      setTimeout(() => setCopiedCmd(null), 2000);
    }
  }

  useEffect(() => {
    const t = searchParams.get("tab") as Tab | null;
    const validTabs: Tab[] = ["account", "system", "users", "gmail", "domains", "config"];
    if (t && validTabs.includes(t)) setTab(t);
    if (searchParams.get("gmail_connected")) {
      toast.success("Gmail connected successfully!");
      setTab("gmail");
    }
    if (searchParams.get("gmail_error")) {
      toast.error(`Gmail error: ${searchParams.get("gmail_error")}`);
      setTab("gmail");
    }
  }, [searchParams]);

  const { data: me, refetch: refetchMe } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/v1/auth/me").then((r) => r.json()),
  });

  const { data: health } = useQuery<HealthStatus>({
    queryKey: ["health"],
    queryFn: () => fetch("/api/v1/admin/health").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const { data: usersData } = useQuery<{ users: AdminUserRow[] }>({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/v1/admin/users").then((r) => r.json()),
  });

  const { data: gmailStatus, refetch: refetchGmail } = useQuery<GmailStatus>({
    queryKey: ["gmail-status"],
    queryFn: () => fetch("/api/v1/gmail/status").then((r) => r.json()),
  });

  const { data: domainsData, refetch: refetchDomains } = useQuery<{ domains: DomainRow[] }>({
    queryKey: ["admin-domains"],
    queryFn: () => fetch("/api/v1/admin/domains").then((r) => r.json()),
  });

  const { data: configData, refetch: refetchConfig } = useQuery<{ configs: Record<string, string | null> }>({
    queryKey: ["admin-config"],
    queryFn: () => fetch("/api/v1/admin/config").then((r) => r.json()),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (pwForm.next !== pwForm.confirm) throw new Error("Passwords do not match");
      if (pwForm.next.length < 8) throw new Error("Password must be at least 8 characters");
      const res = await fetch(`/api/v1/admin/users/${me?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, password: pwForm.next }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to change password");
      return d;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      setPwForm({ current: "", next: "", confirm: "" });
      refetchMe();
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createUserMutation = useMutation({
    mutationFn: () =>
      fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword, displayName: newDisplayName || undefined }),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created");
      setNewUsername(""); setNewPassword(""); setNewDisplayName("");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("User deactivated"); },
  });

  const cleanupMutation = useMutation({
    mutationFn: () => fetch("/api/v1/admin/cleanup", { method: "POST" }).then((r) => r.json()),
    onSuccess: (d) => toast.success(`Deactivated ${d.deactivated} expired accounts`),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => fetch("/api/v1/gmail/status", { method: "DELETE" }),
    onSuccess: () => { refetchGmail(); toast.success("Gmail disconnected"); },
  });

  const addDomainMutation = useMutation({
    mutationFn: () =>
      fetch("/api/v1/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.toLowerCase().trim() }),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      refetchDomains();
      toast.success(`Domain ${newDomain} added`);
      setNewDomain("");
    },
    onError: () => toast.error("Failed to add domain"),
  });

  const toggleDomainMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/v1/admin/domains/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }).then((r) => r.json()),
    onSuccess: () => { refetchDomains(); toast.success("Domain updated"); },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/admin/domains/${id}`, { method: "DELETE" }),
    onSuccess: () => { refetchDomains(); toast.success("Domain removed"); },
  });

  const saveConfigMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = {};
      if (configForm.google_client_id) payload.google_client_id = configForm.google_client_id;
      if (configForm.google_client_secret) payload.google_client_secret = configForm.google_client_secret;
      if (configForm.google_redirect_uri) payload.google_redirect_uri = configForm.google_redirect_uri;
      if (configForm.gmail_catchall_email) payload.gmail_catchall_email = configForm.gmail_catchall_email;
      if (configForm.gmail_poll_interval) payload.gmail_poll_interval = configForm.gmail_poll_interval;
      return fetch("/api/v1/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
    },
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      refetchConfig();
      toast.success("Configuration saved");
      setConfigForm({ google_client_id: "", google_client_secret: "", google_redirect_uri: "", gmail_catchall_email: "", gmail_poll_interval: "" });
    },
    onError: () => toast.error("Failed to save configuration"),
  });

  const users = usersData?.users ?? [];
  const domains = domainsData?.domains ?? [];
  const configs = configData?.configs ?? {};

  const TABS: { key: Tab; label: string }[] = [
    { key: "account", label: "Account" },
    { key: "system", label: "System" },
    { key: "users", label: "Users" },
    { key: "domains", label: "Domains" },
    { key: "config", label: "Config" },
    { key: "gmail", label: "Gmail" },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="flex border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px",
              tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <div className="space-y-4">
          {me?.mustChangePassword && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800">You are using the default password. Please change it before continuing.</p>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Change Password</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: "current", label: "Current Password", placeholder: "Enter current password" },
                { key: "next", label: "New Password", placeholder: "At least 8 characters" },
                { key: "confirm", label: "Confirm New Password", placeholder: "Repeat new password" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={pwForm[key as keyof typeof pwForm]}
                      onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    />
                    {key === "confirm" && (
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => changePasswordMutation.mutate()}
              disabled={!pwForm.current || !pwForm.next || !pwForm.confirm || changePasswordMutation.isPending}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {changePasswordMutation.isPending ? "Saving…" : "Change Password"}
            </button>
          </div>
        </div>
      )}

      {tab === "system" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Health</h2>
            <div className="space-y-2 text-sm">
              {([["Database", health?.database], ["Gmail", health?.gmail]] as const).map(([lbl, val]) => (
                <div key={lbl} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600">{lbl}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", val === "ok" || val === "connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                    {val ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Maintenance</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Cleanup Expired Accounts</p>
                <p className="text-xs text-gray-500">Deactivate accounts past their TTL</p>
              </div>
              <button
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />Run
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Create Admin User</h2>
            <div className="grid grid-cols-1 gap-3">
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="Display Name (optional)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button
                onClick={() => createUserMutation.mutate()}
                disabled={!newUsername || !newPassword || createUserMutation.isPending}
                className="flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />Create User
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.username}</p>
                      {u.displayName && <p className="text-xs text-gray-400">{u.displayName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Display name"
                              autoFocus
                            />
                            <button
                              onClick={async () => {
                                await fetch(`/api/v1/admin/users/${u.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ displayName: editDisplayName }),
                                });
                                qc.invalidateQueries({ queryKey: ["admin-users"] });
                                toast.success("Updated");
                                setEditingUserId(null);
                              }}
                              className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="p-1.5 rounded hover:bg-gray-50 text-gray-400 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditDisplayName(u.displayName ?? "");
                              }}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => { const ok = await confirm({ title: "Deactivate user", description: `Are you sure you want to deactivate ${u.username}?`, confirmLabel: "Deactivate", variant: "danger" }); if (ok) deleteUserMutation.mutate(u.id); }}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "domains" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Add Domain</h2>
            </div>
            <p className="text-xs text-gray-500">Add domains that your Gmail catch-all is configured to receive. Supports multiple domains via Gmail alias routing.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newDomain && addDomainMutation.mutate()}
                placeholder="example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => addDomainMutation.mutate()}
                disabled={!newDomain || addDomainMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />Add
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {domains.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No domains configured yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Domain</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {domains.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">{d.domain}</td>
                      <td className="px-4 py-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                          {d.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => toggleDomainMutation.mutate({ id: d.id, isActive: !d.isActive })}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                          >
                            {d.isActive ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={async () => { const ok = await confirm({ title: "Remove domain", description: `Are you sure you want to remove domain ${d.domain}?`, confirmLabel: "Remove", variant: "danger" }); if (ok) deleteDomainMutation.mutate(d.id); }}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
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
        </div>
      )}

      {tab === "config" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Google OAuth Configuration</h2>
            </div>
            <p className="text-xs text-gray-500">Get these values from your Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs.</p>

            <div className="space-y-3">
              {[
                { key: "google_client_id", label: "Client ID", placeholder: "your-client-id.apps.googleusercontent.com", type: "text" },
                { key: "google_client_secret", label: "Client Secret", placeholder: "Leave blank to keep existing", type: showSecret ? "text" : "password" },
                { key: "google_redirect_uri", label: "Redirect URI", placeholder: `${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/gmail/callback`, type: "text" },
                { key: "gmail_catchall_email", label: "Catch-all Email", placeholder: "catchall@yourdomain.com", type: "email" },
                { key: "gmail_poll_interval", label: "Poll Interval (seconds)", placeholder: "30", type: "number" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type={type}
                      value={configForm[key as keyof typeof configForm]}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={configs[key] ? (key === "google_client_secret" ? "••••••••" : String(configs[key])) : placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    />
                    {key === "google_client_secret" && (
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  {configs[key] && key !== "google_client_secret" && (
                    <p className="text-xs text-gray-400 mt-0.5">Current: {String(configs[key])}</p>
                  )}
                  {key === "google_redirect_uri" && (() => {
                    const uriToCheck = configForm.google_redirect_uri || (configs.google_redirect_uri ? String(configs.google_redirect_uri) : "");
                    const privateInfo = extractPrivateIpInfo(uriToCheck);
                    if (!privateInfo) return null;
                    const { ip, port } = privateInfo;
                    const localhostUri = uriToCheck.replace(ip, "localhost");

                    const OS_TABS = [
                      { key: "windows", label: "Windows" },
                      { key: "linux", label: "Linux" },
                      { key: "macos", label: "macOS" },
                    ] as const;

                    const cmds: Record<string, { note?: string; add: string; remove: string }> = {
                      windows: {
                        note: "Run as Administrator in Command Prompt or PowerShell.",
                        add: `netsh interface portproxy add v4tov4 listenaddress=127.0.0.1 listenport=${port} connectaddress=${ip} connectport=${port}`,
                        remove: `netsh interface portproxy delete v4tov4 listenaddress=127.0.0.1 listenport=${port}`,
                      },
                      linux: {
                        note: "Requires socat — install with: sudo apt install socat  (Debian/Ubuntu) or  sudo yum install socat  (RHEL/CentOS).",
                        add: `socat TCP-LISTEN:${port},fork TCP:${ip}:${port} &`,
                        remove: `pkill -f "socat TCP-LISTEN:${port}"`,
                      },
                      macos: {
                        note: "Requires socat — install with: brew install socat",
                        add: `socat TCP-LISTEN:${port},fork TCP:${ip}:${port} &`,
                        remove: `pkill -f "socat TCP-LISTEN:${port}"`,
                      },
                    };

                    const current = cmds[osTab];

                    return (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800">
                            Google OAuth does not allow private IP addresses as redirect URIs. Use a public domain, or temporarily forward <code className="bg-amber-100 px-1 rounded">{ip}:{port}</code> to <code className="bg-amber-100 px-1 rounded">localhost:{port}</code> and register <code className="bg-amber-100 px-1 rounded">{localhostUri}</code> in Google Cloud Console instead.
                          </p>
                        </div>

                        <div className="flex gap-1 border-b border-amber-200">
                          {OS_TABS.map((t) => (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setOsTab(t.key)}
                              className={cn(
                                "px-2.5 py-1 text-xs font-medium border-b-2 -mb-px transition-colors",
                                osTab === t.key
                                  ? "border-amber-600 text-amber-800"
                                  : "border-transparent text-amber-600 hover:text-amber-800"
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-1.5">
                          {current.note && (
                            <p className="text-xs text-amber-700 italic">{current.note}</p>
                          )}
                          <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" />
                            Enable port forward:
                          </p>
                          <div className="flex items-center gap-2 bg-gray-900 rounded px-3 py-2">
                            <code className="text-xs text-green-400 flex-1 break-all">{current.add}</code>
                            <button type="button" onClick={() => copyCmd(current.add, "add")} className="flex-shrink-0 text-gray-400 hover:text-white transition-colors">
                              {copiedCmd === "add" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" />
                            Remove port forward when done:
                          </p>
                          <div className="flex items-center gap-2 bg-gray-900 rounded px-3 py-2">
                            <code className="text-xs text-red-400 flex-1 break-all">{current.remove}</code>
                            <button type="button" onClick={() => copyCmd(current.remove, "remove")} className="flex-shrink-0 text-gray-400 hover:text-white transition-colors">
                              {copiedCmd === "remove" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            <button
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saveConfigMutation.isPending ? "Saving…" : "Save Configuration"}
            </button>
          </div>
        </div>
      )}

      {tab === "gmail" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className={cn("p-2 rounded-lg", gmailStatus?.connected ? "bg-green-50" : "bg-gray-50")}>
              <Mail className={cn("w-5 h-5", gmailStatus?.connected ? "text-green-600" : "text-gray-400")} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Gmail Integration</h2>
              <p className="text-xs text-gray-500">
                {gmailStatus?.connected ? `Connected as ${gmailStatus.token?.userEmail}` : "Not connected"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {gmailStatus?.connected
                ? <CheckCircle className="w-5 h-5 text-green-500" />
                : <XCircle className="w-5 h-5 text-gray-300" />}
              <span className={cn("text-sm font-medium", gmailStatus?.connected ? "text-green-600" : "text-gray-400")}>
                {gmailStatus?.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          {!gmailStatus?.connected ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Connect your Gmail catch-all mailbox. Make sure you have configured Google OAuth credentials in the Configuration tab first.
              </p>
              <a
                href="/api/v1/gmail/connect"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Mail className="w-4 h-4" />Connect Gmail
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm space-y-2">
                {([
                  ["Account", gmailStatus.token?.userEmail],
                  ["Token expires", gmailStatus.token?.expiresAt ? new Date(gmailStatus.token.expiresAt).toLocaleString() : "—"],
                  ["Last updated", gmailStatus.token?.updatedAt ? new Date(gmailStatus.token.updatedAt).toLocaleString() : "—"],
                ] as const).map(([lbl, val]) => (
                  <div key={lbl} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500">{lbl}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <a href="/api/v1/gmail/connect" className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  <RefreshCw className="w-4 h-4" />Reconnect
                </a>
                <button
                  onClick={async () => { const ok = await confirm({ title: "Disconnect Gmail", description: "Are you sure you want to disconnect Gmail? Email syncing will stop until reconnected.", confirmLabel: "Disconnect", variant: "warning" }); if (ok) disconnectMutation.mutate(); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                >
                  <XCircle className="w-4 h-4" />Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
