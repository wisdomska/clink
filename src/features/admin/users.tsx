"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { adminFetch } from "./fetch";

interface U {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  createdAt: string;
  lastSignIn: string | null;
  confirmed: boolean;
  suspended: string | null;
  suspendedReason: string | null;
  deleted: string | null;
  admin: boolean;
  coupleId: string | null;
  linkedAt: string | null;
  ageVerified: boolean;
}

export function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => adminFetch<{ users: U[] }>(`/api/admin/users?q=${encodeURIComponent(search)}`),
  });

  async function act(u: U, action: "suspend" | "unsuspend" | "force_unlink" | "delete") {
    const copy = {
      suspend: "Suspend this account? They're signed out everywhere.",
      unsuspend: "Lift the suspension?",
      force_unlink: "Force unlink? Private media is wiped for both within the hour.",
      delete: "Delete this account? This can't be undone.",
    }[action];
    if (!window.confirm(copy)) return;
    const reason =
      action === "suspend"
        ? (window.prompt("Reason (kept in the audit log)") ?? undefined)
        : undefined;
    try {
      await adminFetch(`/api/admin/users/${u.id}`, { body: { action, reason } });
      toast("Done. Logged in the audit trail.");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed.");
    }
  }

  return (
    <div className="an-screen flex flex-col gap-5">
      <Display size={36}>Users and couples</Display>
      <p className="text-muted m-0 text-sm">
        Account status only. Admins can never read messages, letters, capsules, answers or media.
      </p>
      <form
        className="rounded-input border-line bg-s2 focus-within:border-accent flex max-w-[520px] items-center gap-2 border px-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
        }}
      >
        <MagnifyingGlass size={18} className="text-muted" aria-hidden />
        <input
          aria-label="Search by email or name"
          placeholder="Search by email or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="text-text h-12 flex-1 bg-transparent text-base outline-none"
        />
      </form>
      {isLoading ? (
        <div className="an-skel rounded-card bg-s2 h-60" />
      ) : (
        <div className="rounded-card border-line overflow-x-auto border">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-s1 text-muted text-xs">
              <tr>
                {["Account", "Joined", "Couple", "18+", "Status", ""].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((u) => (
                <tr key={u.id} className="border-line border-t align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name ?? "No name yet"}</div>
                    <div className="text-muted">{u.email}</div>
                    {u.admin && <span className="mono text-accent text-[11px]">ADMIN</span>}
                  </td>
                  <td className="mono text-muted px-4 py-3 text-xs">{u.createdAt.slice(0, 10)}</td>
                  <td className="text-muted px-4 py-3 text-xs">
                    {u.coupleId ? `Linked ${u.linkedAt?.slice(0, 10)}` : "Not linked"}
                  </td>
                  <td className="px-4 py-3 text-xs">{u.ageVerified ? "Declared" : "DOB only"}</td>
                  <td className="px-4 py-3 text-xs">
                    {u.deleted ? (
                      <span className="text-danger">Deleting</span>
                    ) : u.suspended ? (
                      <span className="text-warning">Suspended: {u.suspendedReason}</span>
                    ) : u.confirmed ? (
                      "Active"
                    ) : (
                      "Unconfirmed"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {u.suspended ? (
                        <Button size="xs" variant="ghost" onClick={() => act(u, "unsuspend")}>
                          Unsuspend
                        </Button>
                      ) : (
                        <Button size="xs" variant="ghost" onClick={() => act(u, "suspend")}>
                          Suspend
                        </Button>
                      )}
                      {u.coupleId && (
                        <Button size="xs" variant="ghost" onClick={() => act(u, "force_unlink")}>
                          Force unlink
                        </Button>
                      )}
                      {!u.deleted && (
                        <Button size="xs" variant="danger-outline" onClick={() => act(u, "delete")}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
