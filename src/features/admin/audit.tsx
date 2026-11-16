"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { adminFetch } from "./fetch";
import { AdminPage, ExportButton, FilterDate, FilterSelect, SortTh, useListParams } from "./list";

interface E {
  id: number;
  user_id: string | null;
  actor_id: string | null;
  event: string;
  meta: Record<string, unknown>;
  created_at: string;
}

/** Plain-sentence descriptions for known events; unknown ones fall back to the key. */
const SENTENCES: Record<string, string> = {
  "admin.suspend": "An admin suspended an account",
  "admin.unsuspend": "An admin lifted a suspension",
  "admin.force_unlink": "An admin force-unlinked a couple",
  "admin.delete": "An admin deleted an account",
  "admin.granted": "Admin access was granted",
  "admin.content_create": "An admin added content",
  "admin.content_update": "An admin edited content",
  "admin.report_updated": "An admin updated a report",
  "admin.settings": "An admin changed settings",
  "admin.content_reorder": "An admin reordered content",
  "admin.content_access": "An admin opened a conversation",
  "admin.media_access": "An admin opened a media file",
  "admin.report_note": "An admin added a note to a report",
  "admin.export": "An admin exported a CSV",
  "admin.resend_link": "An admin resent a sign-in link",
  "admin.clear_dark_lockout": "An admin cleared an After Dark PIN lockout",
  "admin.sign_out_all": "An admin signed someone out of every device",
  "admin.account_updated": "An admin changed their login",
  account_deleted: "An account was deleted",
  account_deletion_requested: "Someone asked to delete their account",
  age_blocked: "An under-18 sign-up was blocked",
  age_verification: "Someone signed the 18+ declaration",
  app_pin_set: "Someone turned on their app PIN",
  app_pin_cleared: "Someone turned off their app PIN",
  app_pin_reset: "Someone reset a forgotten app PIN",
  app_pin_wrong: "A wrong app PIN was entered",
  app_pin_lockout: "An app PIN locked after 5 wrong tries",
  couple_linked: "A couple linked",
  couple_unlinked: "A couple unlinked",
  dark_consent_changed: "After Dark tiers changed",
  dark_passkey_added: "An After Dark passkey was added",
  dark_setup: "After Dark was set up",
  dark_unlock: "After Dark was unlocked",
  dark_pin_wrong: "A wrong After Dark PIN was entered",
  dark_lockout: "After Dark locked after 5 wrong tries",
  data_export: "Someone downloaded their data",
  invite_created: "An invite code was created",
  login: "Someone signed in",
  report_submitted: "A report was submitted",
  signout: "Someone signed out",
  signout_all: "Someone signed out of every device",
};
const describe = (event: string) => SENTENCES[event] ?? event;

type Sort = "created" | "event";
const FILTERS = ["event", "actor", "user", "from", "to"];
const EVENT_OPTIONS = [
  { value: "", label: "All events" },
  { value: "admin.", label: "Any admin action" },
  ...Object.entries(SENTENCES)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label)),
];

/** A text filter that applies on Enter or when you leave the field. Keyed on the URL value. */
function TextFilter({
  id,
  label,
  value,
  placeholder,
  onApply,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onApply: (v: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-muted text-xs font-medium">
        {label}
      </label>
      <input
        key={value}
        id={id}
        defaultValue={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onBlur={(e) => e.target.value.trim() !== value && onApply(e.target.value.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") onApply(e.currentTarget.value.trim());
        }}
        className="rounded-input border-line bg-s2 text-text mono h-11 w-full border px-3 text-sm"
      />
    </div>
  );
}

const adminOf = (meta: Record<string, unknown>) =>
  typeof meta?.admin === "string" ? meta.admin : null;

/** Audit log viewer: filters, sortable columns, pages and CSV export. */
export function AdminAudit() {
  const list = useListParams<Sort>({ sort: "created", dir: "desc" });
  const qs = list.query(FILTERS);
  const filtered = FILTERS.some((f) => list.get(f));
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-audit", qs],
    queryFn: () => adminFetch<{ events: E[]; total: number }>(`/api/admin/audit?${qs}`),
    placeholderData: keepPreviousData,
  });
  const total = data?.total ?? 0;
  const sortProps = { sort: list.sort, dir: list.dir, onSort: list.toggleSort };
  const event = list.get("event");
  return (
    <AdminPage width="full">
      <Display size={36}>Audit log</Display>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FilterSelect
          id="ev"
          label="Event type"
          value={EVENT_OPTIONS.some((o) => o.value === event) ? event : ""}
          onChange={(v) => list.set({ event: v })}
          options={EVENT_OPTIONS}
        />
        <TextFilter
          id="ac"
          label="Done by"
          value={list.get("actor")}
          placeholder="Admin email or user ID"
          onApply={(v) => list.set({ actor: v })}
        />
        <TextFilter
          id="us"
          label="User ID"
          value={list.get("user")}
          placeholder="Full user ID"
          onApply={(v) => list.set({ user: v })}
        />
        <FilterDate
          id="fr"
          label="From"
          value={list.get("from")}
          onChange={(v) => list.set({ from: v })}
        />
        <FilterDate
          id="to"
          label="To"
          value={list.get("to")}
          onChange={(v) => list.set({ to: v })}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="text-muted text-sm" role="status">
            {data ? `${total.toLocaleString("en-GB")} ${total === 1 ? "event" : "events"}` : ""}
          </span>
          {filtered && (
            <Button
              size="xs"
              variant="text"
              onClick={() =>
                list.set({ event: null, actor: null, user: null, from: null, to: null })
              }
            >
              <X size={14} aria-hidden /> Clear filters
            </Button>
          )}
        </span>
        <ExportButton
          url={`/api/admin/audit?${list.query(FILTERS, { format: "csv" })}`}
          disabled={!total}
        />
      </div>
      {isLoading ? (
        <div className="an-skel rounded-card bg-s2 h-60" />
      ) : (
        <div
          className="rounded-card border-line bg-s1 overflow-x-auto border transition-opacity duration-200"
          style={{ opacity: isFetching ? 0.6 : 1 }}
          aria-busy={isFetching}
        >
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="text-muted text-xs">
              <tr>
                <SortTh col="created" label="When" {...sortProps} />
                <SortTh col="event" label="Event" firstDir="asc" {...sortProps} />
                <th scope="col" className="px-4 py-3 font-medium">
                  User
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Done by
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {(data?.events ?? []).map((e) => (
                <tr
                  key={e.id}
                  className="border-line hover:bg-s2 border-t align-middle transition-colors"
                >
                  <td className="mono text-muted px-4 py-2 text-xs whitespace-nowrap tabular-nums">
                    {new Date(e.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {describe(e.event)}
                    <span className="mono text-faint block text-[11px]">{e.event}</span>
                  </td>
                  <td className="mono text-muted px-4 py-2 text-xs">
                    {e.user_id ? (
                      <button
                        type="button"
                        title={e.user_id}
                        onClick={() => list.set({ user: e.user_id })}
                        className="hover:text-text cursor-pointer border-0 bg-transparent p-0 underline-offset-4 hover:underline"
                      >
                        {e.user_id.slice(0, 8)}
                      </button>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="mono text-muted px-4 py-2 text-xs break-all">
                    {adminOf(e.meta) ?? e.actor_id?.slice(0, 8) ?? ""}
                  </td>
                  <td className="mono text-faint px-4 py-2 text-xs break-all">
                    {JSON.stringify(e.meta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.events.length && (
            <p className="text-muted m-0 px-4 py-8 text-center text-sm">
              {filtered ? "No events match these filters." : "Nothing logged yet."}
            </p>
          )}
        </div>
      )}
      {data && (
        <Pagination
          page={list.page}
          size={list.size}
          total={total}
          noun="events"
          label="Audit log pages"
          onPage={(page) => list.set({ page })}
          onSize={(size) => list.set({ size })}
        />
      )}
    </AdminPage>
  );
}
