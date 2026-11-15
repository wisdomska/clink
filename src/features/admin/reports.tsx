"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toast";
import { adminFetch } from "./fetch";
import { usePrompt } from "./ui";

interface R {
  id: string;
  category: string;
  details: string | null;
  status: string;
  priority: string;
  from_after_dark: boolean;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
  reported_user_id: string | null;
  attachments: Array<string | null>;
}

const LABEL: Record<string, string> = {
  image_misuse: "Image misuse",
  harassment: "Harassment",
  minor_safety: "Possible minor (under 18)",
  broken: "Something broke",
  other: "Something else",
};

/** Reports queue: triage, assign, resolve, escalate. Only reporter-attached screenshots are visible. */
export function AdminReports() {
  const prompt = usePrompt();
  const qc = useQueryClient();
  const [status, setStatus] = useState<
    "open" | "triage" | "assigned" | "escalated" | "resolved" | "all"
  >("open");
  const { data } = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () => adminFetch<{ reports: R[] }>(`/api/admin/reports?status=${status}`),
  });
  async function update(id: string, body: Record<string, unknown>) {
    await adminFetch(`/api/admin/reports/${id}`, { method: "PATCH", body });
    toast("Report updated.");
    void qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }
  return (
    <div className="an-screen flex flex-col gap-5">
      <Display size={36}>Reports</Display>
      <div className="max-w-[720px]">
        <Segmented
          label="Status"
          value={status}
          onChange={setStatus}
          options={["open", "triage", "assigned", "escalated", "resolved", "all"].map((v) => ({
            value: v as typeof status,
            label: v[0]!.toUpperCase() + v.slice(1),
          }))}
        />
      </div>
      {(data?.reports ?? []).length === 0 && (
        <p className="text-muted m-0 text-sm">
          No reports with this status. New reports from couples arrive in Open.
        </p>
      )}
      <div
        className={
          (data?.reports ?? []).length
            ? "rounded-card border-line bg-s1 divide-line flex flex-col divide-y overflow-hidden border"
            : "hidden"
        }
      >
        {(data?.reports ?? []).map((r) => (
          <article
            key={r.id}
            className="flex flex-col gap-3 border-l-2 p-4"
            style={{
              borderLeftColor:
                r.category === "minor_safety"
                  ? "var(--danger)"
                  : r.priority === "urgent"
                    ? "var(--warning)"
                    : "transparent",
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{LABEL[r.category]}</span>
              {r.from_after_dark && (
                <span className="border-line text-ember rounded-full border px-2 text-xs font-medium">
                  After Dark
                </span>
              )}
              {r.priority === "urgent" && (
                <span className="border-warning text-warning rounded-full border px-2 text-xs font-medium">
                  Urgent
                </span>
              )}
              <span className="mono text-faint ml-auto text-xs tabular-nums">
                {new Date(r.created_at).toLocaleString("en-GB")}
              </span>
            </div>
            {r.category === "minor_safety" && (
              <p className="text-danger m-0 text-sm">
                Zero tolerance: the reported account was suspended automatically. Preserve evidence
                and follow the legal escalation path in the safety runbook.
              </p>
            )}
            <p className="text-muted m-0 text-sm whitespace-pre-wrap">
              {r.details || "The reporter didn't add any details."}
            </p>
            {r.attachments.filter(Boolean).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {r.attachments.filter(Boolean).map((u, i) => (
                  <a
                    key={i}
                    href={u!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-thumb border-line block h-24 w-24 overflow-hidden border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u!}
                      alt={`Attachment ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              <Button size="xs" variant="ghost" onClick={() => update(r.id, { status: "triage" })}>
                Move to triage
              </Button>
              <Button size="xs" variant="ghost" onClick={() => update(r.id, { assignToMe: true })}>
                Assign to me
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => update(r.id, { status: "escalated" })}
              >
                Escalate
              </Button>
              <Button
                size="xs"
                onClick={async () => {
                  const resolution = await prompt.ask({
                    title: "Resolve this report",
                    label: "Resolution note (kept with the report)",
                  });
                  if (resolution !== null) void update(r.id, { status: "resolved", resolution });
                }}
              >
                Resolve
              </Button>
            </div>
            {r.resolution && <p className="text-faint m-0 text-xs">Resolution: {r.resolution}</p>}
          </article>
        ))}
      </div>
      {prompt.dialog}
    </div>
  );
}
