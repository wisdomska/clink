"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bug } from "@phosphor-icons/react";
import { Display, Lead } from "@/components/ui/heading";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { adminFetch } from "./fetch";
import { AdminPage } from "./list";

interface Row {
  id: number;
  source: "client" | "server";
  message: string;
  stack: string | null;
  path: string | null;
  release: string | null;
  user_agent: string | null;
  count: number;
  first_at: string;
  last_at: string;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** What broke, where and how often, from Clink's own error log (After Dark and admin never appear). */
export function AdminErrors() {
  const [source, setSource] = useState<"all" | "client" | "server">("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-errors", source],
    queryFn: () =>
      adminFetch<{ errors: Row[]; today: number }>(
        `/api/admin/errors${source === "all" ? "" : `?source=${source}`}`,
      ),
    refetchInterval: 60_000,
  });
  const rows = data?.errors ?? [];
  return (
    <AdminPage>
      <header className="flex flex-col gap-2">
        <Display>Errors</Display>
        <Lead>
          What broke in the last 30 days, newest first. The same error on the same day is one row
          with a count. Nothing from After Dark or admin is ever recorded.
        </Lead>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Where"
          options={[
            { value: "all", label: "All" },
            { value: "client", label: "In the app" },
            { value: "server", label: "On the server" },
          ]}
          value={source}
          onChange={setSource}
        />
        {data && (
          <span className="mono text-muted text-sm" role="status">
            {data.today} in the last 24 hours
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="an-skel rounded-card bg-s2 h-40" />
      ) : rows.length === 0 ? (
        <EmptyState
          art={<Bug size={40} className="text-faint" aria-hidden />}
          title="Nothing broken."
        >
          When something goes wrong in the app or on the server, it shows up here.
        </EmptyState>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((r) => (
            <li key={r.id} className="rounded-card border-line bg-s1 border p-4">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={
                      r.source === "server"
                        ? "mono rounded-flap bg-[var(--ember)]/15 px-1.5 text-xs text-[var(--ember)]"
                        : "mono rounded-flap bg-s3 text-muted px-1.5 text-xs"
                    }
                  >
                    {r.source === "server" ? "server" : "app"}
                  </span>
                  <span className="min-w-0 flex-1 font-bold break-words">{r.message}</span>
                  <span className="mono text-muted text-xs">
                    ×{r.count} · last {when(r.last_at)}
                  </span>
                </summary>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <div className="text-muted flex flex-wrap gap-x-4 gap-y-1">
                    {r.path && <span className="mono">{r.path}</span>}
                    {r.release && <span className="mono">build {r.release}</span>}
                    <span>first {when(r.first_at)}</span>
                  </div>
                  {r.user_agent && <div className="text-faint text-xs">{r.user_agent}</div>}
                  {r.stack && (
                    <pre className="rounded-input bg-s2 mono m-0 max-h-72 overflow-auto p-3 text-xs whitespace-pre-wrap">
                      {r.stack}
                    </pre>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
