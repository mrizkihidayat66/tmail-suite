"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Trash2, Code, AlignLeft, FileText } from "lucide-react";
import { formatDateTime, cn } from "@/lib/shared/utils";
import { parseJsonSafe } from "@/lib/shared/utils";
import { useConfirmModal } from "@/hooks/useConfirmModal";

export default function EmailDetailPage() {
  const { id, emailId } = useParams<{ id: string; emailId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirmModal();
  const [view, setView] = useState<"html" | "text" | "headers">("html");

  const { data: email, isLoading } = useQuery<any>({
    queryKey: ["email", id, emailId],
    queryFn: () => fetch(`/api/v1/accounts/${id}/emails/${emailId}`).then((r) => r.json()),
  });

  useEffect(() => {
    if (email && !email.error) {
      qc.invalidateQueries({ queryKey: ["emails", id] });
    }
  }, [email, id, qc]);

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/v1/accounts/${id}/emails/${emailId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Email deleted");
      qc.invalidateQueries({ queryKey: ["emails", id] });
      router.push(`/dashboard/accounts/${id}`);
    },
  });

  if (isLoading) return <div className="text-sm text-gray-400 p-8">Loading…</div>;
  if (!email || email.error) return <div className="text-sm text-red-500 p-8">Email not found</div>;

  const headers = parseJsonSafe<Record<string, string>>(
    typeof email.rawHeaders === "string" ? email.rawHeaders : JSON.stringify(email.rawHeaders),
    {}
  );

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{email.subject || "(no subject)"}</h1>
        </div>
        <button
          onClick={async () => { const ok = await confirm({ title: "Delete email", description: "Are you sure you want to delete this email? This action cannot be undone.", confirmLabel: "Delete", variant: "danger" }); if (ok) deleteMutation.mutate(); }}
          className="p-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 text-sm">
        {([
          ["From", email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress],
          ["To", email.toAddress],
          ["Date", formatDateTime(email.receivedAt)],
        ] as const).map(([lbl, val]) => (
          <div key={lbl} className="flex gap-2">
            <span className="text-gray-500 w-12 flex-shrink-0">{lbl}</span>
            <span className="font-medium">{val}</span>
          </div>
        ))}

        {email.attachments?.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((a: any) => (
                <a
                  key={a.id}
                  href={`/api/v1/accounts/${id}/emails/${emailId}/attachments/${a.id}/download`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {a.filename}
                  {a.sizeBytes && (
                    <span className="text-gray-400">({Math.round(a.sizeBytes / 1024)}KB)</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex gap-1 p-2 border-b border-gray-200 bg-gray-50">
          {([
            ["html", Code, "HTML"],
            ["text", AlignLeft, "Plain Text"],
            ["headers", FileText, "Headers"],
          ] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                view === v ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {view === "html" && email.bodyHtml ? (
            <iframe
              srcDoc={email.bodyHtml}
              className="w-full min-h-96 border-0"
              sandbox="allow-same-origin"
              title="Email content"
            />
          ) : view === "html" ? (
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{email.bodyText || "(empty)"}</pre>
          ) : view === "text" ? (
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{email.bodyText || "(empty)"}</pre>
          ) : (
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono overflow-x-auto">
              {JSON.stringify(headers, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
