"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Display } from "@/components/ui/heading";
import { Input, Label } from "@/components/ui/field";
import { adminFetch } from "./fetch";

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

/** Audit log viewer with filters. */
export function AdminAudit() {
  const [event, setEvent] = useState("");
  const [user, setUser] = useState("");
  const [from, setFrom] = useState("");
  const qs = new URLSearchParams({
    ...(event && { event }),
    ...(user && { user }),
    ...(from && { from }),
  }).toString();
  const { data } = useQuery({
    queryKey: ["admin-audit", qs],
    queryFn: () => adminFetch<{ events: E[] }>(`/api/admin/audit?${qs}`),
  });
  return (
    <div className="an-screen flex flex-col gap-5">
      <Display size={36}>Audit log</Display>
      <div className="grid max-w-[860px] gap-2 sm:grid-cols-3">
        <div>
          <Label htmlFor="ev">Event starts with</Label>
          <Input
            id="ev"
            value={event}
            placeholder="admin."
            onChange={(e) => setEvent(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="us">User ID</Label>
          <Input
            id="us"
            value={user}
            placeholder="Full user ID"
            onChange={(e) => setUser(e.target.value.trim())}
          />
        </div>
        <div>
          <Label htmlFor="fr">From</Label>
          <Input id="fr" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
      </div>
      <div className="rounded-card border-line bg-s1 overflow-x-auto border">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="text-muted text-xs">
            <tr>
              {["When", "Event", "User", "Done by", "Details"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.events ?? []).map((e) => (
              <tr
                key={e.id}
                className="border-line hover:bg-s2 border-t align-top transition-colors"
              >
                <td className="mono text-muted px-4 py-2 text-xs whitespace-nowrap tabular-nums">
                  {new Date(e.created_at).toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-2 text-sm">
                  {describe(e.event)}
                  <span className="mono text-faint block text-[11px]">{e.event}</span>
                </td>
                <td className="mono text-muted px-4 py-2 text-xs">
                  {e.user_id?.slice(0, 8) ?? ""}
                </td>
                <td className="mono text-muted px-4 py-2 text-xs">
                  {e.actor_id?.slice(0, 8) ?? ""}
                </td>
                <td className="mono text-faint px-4 py-2 text-xs break-all">
                  {JSON.stringify(e.meta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
