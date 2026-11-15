"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Textarea, Input, Label } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { toast } from "@/components/ui/toast";
import { NavTabs, TabPanel, useTab } from "@/components/ui/nav-tabs";
import { Flag, Megaphone, UserCircle } from "@phosphor-icons/react";
import { AdminAccountForm } from "./account";
import { adminFetch } from "./fetch";

const TABS = [
  { value: "banner", label: "Banner", icon: <Megaphone size={16} weight="fill" aria-hidden /> },
  { value: "flags", label: "Feature flags", icon: <Flag size={16} weight="fill" aria-hidden /> },
  { value: "login", label: "Your login", icon: <UserCircle size={16} weight="fill" aria-hidden /> },
] as const;

interface Data {
  flags: Array<{ key: string; enabled: boolean; description: string | null }>;
  announcements: Array<{
    id: string;
    kind: string;
    body: string;
    active: boolean;
    created_at: string;
  }>;
}

/** Banner for everyone, feature flags, and your own admin login, one tab each. */
export function AdminSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminFetch<Data>("/api/admin/settings"),
  });
  const [kind, setKind] = useState<"announcement" | "maintenance">("announcement");
  const [body, setBody] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-settings"] });
  const tab = useTab(TABS);
  const live = (data?.announcements ?? []).filter((a) => a.active);
  return (
    <div className="an-screen flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Display size={36}>Settings</Display>
        <p className="text-muted m-0 text-sm">
          Talk to every couple at once, switch features on and off, and manage your admin login.
        </p>
      </div>
      <NavTabs
        label="Settings sections"
        tabs={TABS.map((t) =>
          t.value === "banner"
            ? { ...t, count: live.length }
            : t.value === "flags"
              ? { ...t, count: data?.flags.length }
              : t,
        )}
        className="self-start"
      />
      {tab === "banner" && (
        <TabPanel key="banner" className="flex flex-col gap-4">
          <p className="text-muted m-0 text-sm">
            A banner shows at the top of the app for everyone until you take it down. Choose
            Maintenance for downtime notices.
          </p>
          <Segmented
            label="Banner type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "announcement", label: "Announcement" },
              { value: "maintenance", label: "Maintenance" },
            ]}
          />
          <div className="rounded-card border-line overflow-hidden border" aria-hidden>
            <div className="text-faint bg-s1 border-line border-b px-4 py-2 text-xs font-medium">
              Preview
            </div>
            <div
              className={
                kind === "maintenance"
                  ? "bg-warning/15 text-text px-4 py-3 text-sm font-medium"
                  : "bg-accent text-on-accent px-4 py-3 text-sm font-medium"
              }
            >
              {body.trim() || "Your banner text shows here."}
            </div>
          </div>
          <Textarea
            aria-label="Banner text"
            value={body}
            maxLength={280}
            placeholder={
              kind === "maintenance"
                ? "Clink is getting a tune-up tonight at 23:00 UTC. Back in 10 minutes."
                : "New: a stargazing playlist for date night."
            }
            onChange={(e) => setBody(e.target.value)}
          />
          <Button
            className="self-start"
            disabled={!body.trim()}
            onClick={async () => {
              await adminFetch("/api/admin/settings", { body: { action: "announce", kind, body } });
              setBody("");
              toast.ok("Banner is live for everyone.");
              void refresh();
            }}
          >
            Publish banner
          </Button>
          {live.length > 0 && <h2 className="m-0 mt-2 text-base font-bold">Live now</h2>}
          {live.length > 0 && (
            <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
              {live.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="text-faint w-24 flex-none text-xs capitalize">{a.kind}</span>
                  <span className="flex-1">{a.body}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={async () => {
                      await adminFetch("/api/admin/settings", {
                        body: { action: "retire", id: a.id },
                      });
                      void refresh();
                    }}
                  >
                    Take down
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabPanel>
      )}
      {tab === "flags" && (
        <TabPanel key="flags" className="flex flex-col gap-4">
          <p className="text-muted m-0 text-sm">
            Flags switch unfinished features on for everyone, or off again, without a release. New
            flags start off.
          </p>
          <div className="rounded-card border-line bg-s1 overflow-hidden border">
            {(data?.flags ?? []).map((f, i, arr) => (
              <Toggle
                key={f.key}
                label={f.key}
                sub={f.description ?? undefined}
                checked={f.enabled}
                last={i === arr.length - 1}
                onChange={async (v) => {
                  await adminFetch("/api/admin/settings", {
                    body: {
                      action: "flag",
                      key: f.key,
                      enabled: v,
                      description: f.description ?? undefined,
                    },
                  });
                  void refresh();
                }}
              />
            ))}
            {!data?.flags.length && (
              <p className="text-muted m-0 p-4 text-sm">No flags yet. Add one below.</p>
            )}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="flag">New flag key</Label>
              <Input
                id="flag"
                value={newFlag}
                placeholder="watch_party_beta"
                onChange={(e) =>
                  setNewFlag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
              />
            </div>
            <Button
              size="lg"
              variant="secondary"
              disabled={newFlag.length < 2}
              onClick={async () => {
                await adminFetch("/api/admin/settings", {
                  body: { action: "flag", key: newFlag, enabled: false },
                });
                setNewFlag("");
                void refresh();
              }}
            >
              Add flag
            </Button>
          </div>
        </TabPanel>
      )}
      {tab === "login" && (
        <TabPanel key="login" className="rounded-card border-line bg-s1 max-w-[520px] border p-5">
          <AdminAccountForm />
        </TabPanel>
      )}
    </div>
  );
}
