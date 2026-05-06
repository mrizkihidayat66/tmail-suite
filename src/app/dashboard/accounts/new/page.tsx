"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, RefreshCw, Eye, EyeOff, Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/shared/utils";

export default function NewAccountPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [ttlHours, setTtlHours] = useState(24);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function genUsername() {
    const r = await fetch("/api/v1/utils/generate-username");
    const d = await r.json();
    setUsername(d.username ?? "");
  }

  async function genPassword() {
    const r = await fetch("/api/v1/utils/generate-password?count=1&length=16");
    const d = await r.json();
    setPassword(d.passwords?.[0] ?? "");
  }

  async function copy(text: string, key: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } else {
      toast.error("Failed to copy — please copy manually");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username || undefined,
          customPassword: password || undefined,
          displayName: displayName || undefined,
          ttlHours,
          label: label || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create account");
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setCreated(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Account Created</h2>
              <p className="text-sm text-gray-500">Save these credentials — password won&apos;t be shown again</p>
            </div>
          </div>

          <div className="space-y-3">
            {([["Email", created.email, "email"], ["Password", created.password, "pw"]] as const).map(
              ([lbl, val, key]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{lbl}</p>
                    <p className="text-sm font-mono font-medium">{val}</p>
                  </div>
                  <button onClick={() => copy(val, key)} className="p-1.5 hover:bg-gray-200 rounded">
                    {copied === key ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                </div>
              )
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => router.push(`/dashboard/accounts/${created.id}`)}
              className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              View Inbox
            </button>
            <button
              onClick={() => { setCreated(null); setUsername(""); setPassword(""); setDisplayName(""); setLabel(""); setNotes(""); }}
              className="flex-1 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Leave blank to auto-generate"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={genUsername} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" title="Auto-generate">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to auto-generate"
                className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button type="button" onClick={genPassword} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" title="Generate password">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. project-x"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">TTL</label>
            <select
              value={ttlHours}
              onChange={(e) => setTtlHours(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={168}>7 days</option>
              <option value={0}>Permanent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors">
            {loading ? "Creating…" : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
