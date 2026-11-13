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
          <Label htmlFor="us">User id</Label>
          <Input
            id="us"
            value={user}
            placeholder="uuid"
            onChange={(e) => setUser(e.target.value.trim())}
          />
        </div>
        <div>
          <Label htmlFor="fr">From</Label>
          <Input id="fr" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
      </div>
      <div className="rounded-card border-line overflow-x-auto border">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-s1 text-muted text-xs">
            <tr>
              {["When", "Event", "Subject", "Actor", "Details"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.events ?? []).map((e) => (
              <tr key={e.id} className="border-line border-t align-top">
                <td className="mono text-muted px-4 py-2 text-xs whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString("en-GB")}
                </td>
                <td className="mono px-4 py-2 text-xs">{e.event}</td>
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
