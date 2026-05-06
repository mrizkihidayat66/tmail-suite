"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Zap, Download, Copy, Check, Eye, EyeOff, RefreshCw } from "lucide-react";
import { copyToClipboard } from "@/lib/shared/utils";

const USERNAME_PATTERNS = [
  { value: "random", label: "Random (All)" },
  { value: "en", label: "English" },
  { value: "id", label: "Indonesian" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
];

export default function BulkGeneratePage() {
  const qc = useQueryClient();
  const [count, setCount] = useState(5);
  const [pattern, setPattern] = useState("random");
  const [ttlHours, setTtlHours] = useState(24);
  const [label, setLabel] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");

  const [pwMode, setPwMode] = useState<"random" | "fixed">("random");
  const [pwLength, setPwLength] = useState(16);
  const [pwSymbols, setPwSymbols] = useState(true);
  const [pwNumbers, setPwNumbers] = useState(true);
  const [pwUppercase, setPwUppercase] = useState(true);
  const [fixedPassword, setFixedPassword] = useState("");
  const [showFixedPw, setShowFixedPw] = useState(false);

  const [created, setCreated] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const { data: domainsData } = useQuery<{ domains: any[] }>({
    queryKey: ["domains-public"],
    queryFn: () => fetch("/api/v1/domains").then((r) => r.json()),
  });
  const domains = domainsData?.domains ?? [];

  async function genFixedPassword() {
    const r = await fetch("/api/v1/utils/generate-password?count=1&length=16");
    const d = await r.json();
    setFixedPassword(d.passwords?.[0] ?? "");
  }

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        count,
        ttlHours,
        label: label || undefined,
        domain: selectedDomain || undefined,
        usernamePattern: pattern,
      };
      if (pwMode === "fixed") {
        body.fixedPassword = fixedPassword;
      } else {
        body.passwordOptions = { length: pwLength, includeSymbols: pwSymbols, includeNumbers: pwNumbers, includeUppercase: pwUppercase };
      }
      return fetch("/api/v1/accounts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
    },
    onSuccess: (d) => {
      if (d.error) { toast.error(d.error); return; }
      setCreated(d.accounts ?? []);
      qc.invalidateQueries({ queryKey: ["accounts"] });
      if (d.failures?.length > 0) {
        toast.error(`${d.failures.length} account(s) failed to create`);
      }
      toast.success(`Created ${d.count} accounts`);
    },
    onError: () => toast.error("Failed to generate accounts"),
  });

  function download(fmt: "csv" | "json") {
    const content =
      fmt === "json"
        ? JSON.stringify(created, null, 2)
        : ["email,password,expires_at", ...created.map((a) => `${a.email},${a.password},${a.expiresAt ?? "never"}`)].join("\n");
    const blob = new Blob([content], { type: fmt === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `accounts.${fmt}`; a.click();
    URL.revokeObjectURL(url);
  }

  async function copyAll() {
    const ok = await copyToClipboard(created.map((a) => `${a.email}:${a.password}`).join("\n"));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy — please download instead");
    }
  }

  const canGenerate = pwMode === "random" || (pwMode === "fixed" && fixedPassword.length >= 8);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Bulk Generate</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create multiple accounts at once</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Count</label>
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username Style</label>
            <select value={pattern} onChange={(e) => setPattern(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {USERNAME_PATTERNS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">TTL</label>
            <select value={ttlHours} onChange={(e) => setTtlHours(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={168}>7 days</option>
              <option value={0}>Permanent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Domain</label>
            <select value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Random (any active domain)</option>
              {domains.map((d) => (
                <option key={d.id} value={d.domain}>{d.domain}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Label</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. batch-jan" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Password</p>
          <div className="flex gap-2 mb-3">
            {(["random", "fixed"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPwMode(mode)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  pwMode === mode
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {mode === "random" ? "Random" : "Fixed (same for all)"}
              </button>
            ))}
          </div>

          {pwMode === "random" ? (
            <div className="flex flex-wrap gap-4">
              {([["Symbols", pwSymbols, setPwSymbols], ["Numbers", pwNumbers, setPwNumbers], ["Uppercase", pwUppercase, setPwUppercase]] as const).map(
                ([lbl, val, set]) => (
                  <label key={lbl} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={val} onChange={(e) => (set as any)(e.target.checked)} className="rounded" />
                    {lbl}
                  </label>
                )
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Length:</span>
                <input type="number" min={8} max={64} value={pwLength} onChange={(e) => setPwLength(Number(e.target.value))} className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showFixedPw ? "text" : "password"}
                  value={fixedPassword}
                  onChange={(e) => setFixedPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowFixedPw(!showFixedPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showFixedPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={genFixedPassword}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Generate password"
              >
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !canGenerate}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Zap className="w-4 h-4" />
          {mutation.isPending ? "Generating…" : `Generate ${count} Accounts`}
        </button>
      </div>

      {created.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{created.length} accounts created</h2>
            <div className="flex gap-2">
              <button onClick={copyAll} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                Copy All
              </button>
              <button onClick={() => download("csv")} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                <Download className="w-4 h-4" />CSV
              </button>
              <button onClick={() => download("json")} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                <Download className="w-4 h-4" />JSON
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Password</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {created.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{a.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.password}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                      {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Passwords are only shown once. Download or copy them now.
          </p>
        </div>
      )}
    </div>
  );
}
