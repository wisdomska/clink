"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Textarea, Input, Label } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toast";
import { adminFetch } from "./fetch";

interface Data {
  flags: Array<{ key: string; enabled: boolean; description: string | null }>;
  announcements: Array<{ id: string; kind: string; body: string; active: boolean; created_at: string }>;
}

/** Feature flags, maintenance banner, announcement to all users. */
export function AdminSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminFetch<Data>("/api/admin/settings") });
  const [kind, setKind] = useState<"announcement" | "maintenance">("announcement");
  const [body, setBody] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-settings"] });
  return (
    <div className="an-screen flex max-w-[760px] flex-col gap-6">
      <Display size={36}>Settings</Display>
      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-lg font-bold">Banner</h2>
        <Segmented label="Kind" value={kind} onChange={setKind} options={[{ value: "announcement", label: "Announcement" }, { value: "maintenance", label: "Maintenance" }]} />
        <Textarea aria-label="Banner text" value={body} maxLength={280} placeholder={kind === "maintenance" ? "Clink is getting a tune-up tonight at 23:00 UTC. Back in 10 minutes." : "New: a stargazing playlist for date night."} onChange={(e) => setBody(e.target.value)} />
        <Button className="self-start" disabled={!body.trim()} onClick={async () => { await adminFetch("/api/admin/settings", { body: { action: "announce", kind, body } }); setBody(""); toast("Live for everyone."); void refresh(); }}>
          Publish
        </Button>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {(data?.announcements ?? []).filter((a) => a.active).map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-input border border-line bg-s1 px-3 py-2 text-sm">
              <span className="mono text-[11px] text-faint">{a.kind.toUpperCase()}</span>
              <span className="flex-1">{a.body}</span>
              <Button size="xs" variant="ghost" onClick={async () => { await adminFetch("/api/admin/settings", { body: { action: "retire", id: a.id } }); void refresh(); }}>
                Take down
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-lg font-bold">Feature flags</h2>
        <div className="overflow-hidden rounded-card border border-line bg-s1">
          {(data?.flags ?? []).map((f, i, arr) => (
            <Toggle key={f.key} label={f.key} sub={f.description ?? undefined} checked={f.enabled} last={i === arr.length - 1} onChange={async (v) => { await adminFetch("/api/admin/settings", { body: { action: "flag", key: f.key, enabled: v, description: f.description ?? undefined } }); void refresh(); }} />
          ))}
          {!data?.flags.length && <p className="m-0 p-4 text-sm text-muted">No flags yet.</p>}
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="flag">New flag key</Label>
            <Input id="flag" value={newFlag} placeholder="watch_party_beta" onChange={(e) => setNewFlag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
          </div>
          <Button size="lg" variant="secondary" disabled={newFlag.length < 2} onClick={async () => { await adminFetch("/api/admin/settings", { body: { action: "flag", key: newFlag, enabled: false } }); setNewFlag(""); void refresh(); }}>
            Add
          </Button>
        </div>
      </section>
    </div>
  );
}
