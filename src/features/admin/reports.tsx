"use client";
import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretDown, Clock, UserCircle } from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { adminFetch } from "./fetch";
import { usePrompt } from "./ui";
import {
  AdminPage,
  ExportButton,
  FilterSelect,
  UpdatedAgo,
  hoursSince,
  useListParams,
  useNow,
} from "./list";

interface R {
  id: string;
  category: string;
  details: string | null;
  status: string;
  priority: string;
  from_after_dark: boolean;
  assigned_to: string | null;
  assigned_admin_id: string | null;
  assigned_admin_name: string | null;
  assigned_to_me: boolean;
  assigned_at: string | null;
  status_changed_at: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  reported_user_id: string | null;
  attachments: Array<string | null>;
}
interface Note {
  id: string;
  kind: "note" | "status" | "assign";
  body: string;
  created_at: string;
  by: string | null;
}

const LABEL: Record<string, string> = {
  image_misuse: "Image misuse",
  harassment: "Harassment",
  minor_safety: "Possible minor (under 18)",
  broken: "Something broke",
  other: "Something else",
};
type Status = "open" | "triage" | "assigned" | "escalated" | "resolved" | "all";
type Sort = "priority" | "created" | "updated" | "status" | "category";
const FILTERS = ["status", "category", "urgency", "assigned", "id"];
const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "priority:desc", label: "Urgent first" },
  { value: "created:desc", label: "Newest first" },
  { value: "created:asc", label: "Oldest first" },
  { value: "updated:desc", label: "Recently updated" },
  { value: "category:asc", label: "Category" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function age(hours: number) {
  if (hours < 1) return "under 1 h";
  if (hours < 48) return `${Math.floor(hours)} h`;
  return `${Math.floor(hours / 24)} days`;
}

/** Internal notes and status history for one report. Never shown to the people involved. */
function ReportNotes({ id }: { id: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-report-notes", id],
    queryFn: () => adminFetch<{ notes: Note[] }>(`/api/admin/reports/${id}/notes`),
  });
  return (
    <div className="bg-s2 rounded-input flex flex-col gap-3 p-3">
      {isLoading ? (
        <div className="an-skel bg-s3 h-10 rounded-md" />
      ) : data?.notes.length ? (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {data.notes.map((n) => (
            <li key={n.id} className="flex flex-col gap-0.5 text-sm">
              <span className={n.kind === "note" ? "text-text whitespace-pre-wrap" : "text-muted"}>
                {n.body}
              </span>
              <span className="mono text-faint text-xs tabular-nums">
                {n.by ?? "An admin"} · {when(n.created_at)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted m-0 text-sm">No notes or status changes yet.</p>
      )}
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setBusy(true);
          try {
            await adminFetch(`/api/admin/reports/${id}/notes`, { body: { body: text.trim() } });
            setText("");
            void qc.invalidateQueries({ queryKey: ["admin-report-notes", id] });
          } catch (err) {
            toast.err(err instanceof Error ? err.message : "Couldn't save that note. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={`note-${id}`} className="text-muted text-xs font-medium">
            Internal note
          </label>
          <textarea
            id={`note-${id}`}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            className="rounded-input border-line bg-s1 text-text min-h-11 w-full border p-2.5 text-sm"
          />
        </div>
        <Button
          type="submit"
          size="xs"
          variant="secondary"
          loading={busy}
          softDisabled={!text.trim()}
        >
          Add note
        </Button>
      </form>
    </div>
  );
}

function ReportCard({
  r,
  now,
  onUpdate,
  onResolve,
}: {
  r: R;
  now: number;
  onUpdate: (body: Record<string, unknown>) => void;
  onResolve: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hours = hoursSince(r.created_at, now);
  const stale = r.status !== "resolved" && hours >= 24;
  return (
    <article
      className="flex flex-col gap-3 border-l-2 p-4"
      aria-label={`${LABEL[r.category] ?? r.category} report`}
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
        <span className="font-bold">{LABEL[r.category] ?? r.category}</span>
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
        <span className="border-line text-muted rounded-full border px-2 text-xs font-medium capitalize">
          {r.status}
        </span>
        <span className="mono text-faint ml-auto text-xs tabular-nums">{when(r.created_at)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {r.status !== "resolved" && now > 0 && (
          <span
            className={cn(
              "flex items-center gap-1 font-medium",
              stale ? "text-warning" : "text-muted",
            )}
          >
            <Clock size={14} aria-hidden />
            Open for {age(hours)}
            {stale && <span className="sr-only">, over 24 hours</span>}
          </span>
        )}
        <span className="text-muted flex items-center gap-1">
          <UserCircle size={14} aria-hidden />
          {r.assigned_admin_name
            ? r.assigned_to_me
              ? "Assigned to you"
              : `Assigned to ${r.assigned_admin_name}`
            : "Unassigned"}
        </span>
        {r.status_changed_at && (
          <span className="text-faint">Status changed {when(r.status_changed_at)}</span>
        )}
      </div>
      {r.category === "minor_safety" && (
        <p className="text-danger m-0 text-sm">
          Zero tolerance: the reported account was suspended automatically. Preserve evidence and
          follow the legal escalation path in the safety runbook.
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
              <img src={u!} alt={`Attachment ${i + 1}`} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button size="xs" variant="ghost" onClick={() => onUpdate({ status: "triage" })}>
          Move to triage
        </Button>
        {r.assigned_to_me ? (
          <Button size="xs" variant="ghost" onClick={() => onUpdate({ unassign: true })}>
            Unassign
          </Button>
        ) : (
          <Button size="xs" variant="ghost" onClick={() => onUpdate({ assignToMe: true })}>
            Assign to me
          </Button>
        )}
        <Button size="xs" variant="ghost" onClick={() => onUpdate({ status: "escalated" })}>
          Escalate
        </Button>
        {r.status === "resolved" ? (
          <Button size="xs" variant="ghost" onClick={() => onUpdate({ status: "open" })}>
            Reopen
          </Button>
        ) : (
          <Button size="xs" onClick={onResolve}>
            Resolve
          </Button>
        )}
        <Button
          size="xs"
          variant="text"
          aria-expanded={open}
          aria-controls={`notes-${r.id}`}
          onClick={() => setOpen(!open)}
        >
          Notes and history
          <CaretDown
            size={14}
            aria-hidden
            className={cn("transition-transform", open && "rotate-180")}
          />
        </Button>
      </div>
      {r.resolution && <p className="text-faint m-0 text-xs">Resolution: {r.resolution}</p>}
      {open && (
        <div id={`notes-${r.id}`}>
          <ReportNotes id={r.id} />
        </div>
      )}
    </article>
  );
}

/**
 * Reports queue: filter, sort, triage, assign, add internal notes, resolve,
 * escalate. Refreshes every 30 s while the tab is visible. Only
 * reporter-attached screenshots are visible.
 */
export function AdminReports() {
  const prompt = usePrompt();
  const qc = useQueryClient();
  const now = useNow(30_000);
  const list = useListParams<Sort>({ sort: "priority", dir: "desc" });
  const status = (list.get("status") || "open") as Status;
  // "open" is the default view, so the API always gets an explicit status.
  const qs = list.query(FILTERS, list.get("status") ? {} : { status: "open" });
  const { data, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["admin-reports", qs],
    queryFn: () => adminFetch<{ reports: R[]; total: number }>(`/api/admin/reports?${qs}`),
    placeholderData: keepPreviousData,
    // TanStack pauses this while the tab is hidden.
    refetchInterval: 30_000,
  });
  async function update(id: string, body: Record<string, unknown>) {
    await adminFetch(`/api/admin/reports/${id}`, { method: "PATCH", body });
    toast("Report updated.");
    void qc.invalidateQueries({ queryKey: ["admin-reports"] });
    void qc.invalidateQueries({ queryKey: ["admin-report-notes", id] });
  }
  const reports = data?.reports ?? [];
  const total = data?.total ?? 0;
  return (
    <AdminPage>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Display size={36}>Reports</Display>
        <UpdatedAgo at={dataUpdatedAt} />
      </div>
      <div className="no-scrollbar overflow-x-auto">
        <div className="max-w-[720px] min-w-[560px]">
          <Segmented
            label="Status"
            value={status}
            onChange={(v) => list.set({ status: v === "open" ? null : v, id: null })}
            options={["open", "triage", "assigned", "escalated", "resolved", "all"].map((v) => ({
              value: v as Status,
              label: v[0]!.toUpperCase() + v.slice(1),
            }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <FilterSelect
          id="r-category"
          label="Category"
          value={list.get("category")}
          onChange={(v) => list.set({ category: v })}
          options={[
            { value: "", label: "All categories" },
            ...Object.entries(LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
        <FilterSelect
          id="r-urgency"
          label="Urgency"
          value={list.get("urgency")}
          onChange={(v) => list.set({ urgency: v })}
          options={[
            { value: "", label: "Any urgency" },
            { value: "urgent", label: "Urgent" },
            { value: "normal", label: "Normal" },
          ]}
        />
        <FilterSelect
          id="r-assigned"
          label="Assignee"
          value={list.get("assigned")}
          onChange={(v) => list.set({ assigned: v })}
          options={[
            { value: "", label: "Anyone" },
            { value: "me", label: "Assigned to me" },
          ]}
        />
        <FilterSelect
          id="r-sort"
          label="Sort by"
          value={`${list.sort}:${list.dir}`}
          onChange={(v) => {
            const [sort, dir] = v.split(":");
            list.set({ sort, dir });
          }}
          options={SORT_OPTIONS}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted text-sm">
          {list.get("id") ? (
            <Button size="xs" variant="text" onClick={() => list.set({ id: null })}>
              Showing one report. Show all
            </Button>
          ) : null}
        </span>
        <ExportButton
          url={`/api/admin/reports?${list.query(FILTERS, { format: "csv", ...(list.get("status") ? {} : { status: "open" }) })}`}
          disabled={!total}
        />
      </div>
      {data && reports.length === 0 && (
        <p className="text-muted m-0 text-sm">
          No reports with this status. New reports from couples arrive in Open.
        </p>
      )}
      <div
        className={
          reports.length
            ? "rounded-card border-line bg-s1 divide-line flex flex-col divide-y overflow-hidden border transition-opacity duration-200"
            : "hidden"
        }
        style={{ opacity: isFetching && !dataUpdatedAt ? 0.6 : 1 }}
      >
        {reports.map((r) => (
          <ReportCard
            key={r.id}
            r={r}
            now={now}
            onUpdate={(body) => void update(r.id, body)}
            onResolve={async () => {
              const resolution = await prompt.ask({
                title: "Resolve this report",
                label: "Resolution note (kept with the report)",
              });
              if (resolution !== null) void update(r.id, { status: "resolved", resolution });
            }}
          />
        ))}
      </div>
      {data && (
        <Pagination
          page={list.page}
          size={list.size}
          total={total}
          noun="reports"
          label="Report pages"
          onPage={(page) => list.set({ page })}
          onSize={(size) => list.set({ size })}
        />
      )}
      {prompt.dialog}
    </AdminPage>
  );
}
