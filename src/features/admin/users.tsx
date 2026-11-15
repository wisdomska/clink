"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadSimple, MagnifyingGlass } from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { adminFetch } from "./fetch";
import { downloadCsv, useConfirm } from "./ui";

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
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // The search lives in the URL, so reload, Back and shared links keep the view.
  const search = params.get("q") ?? "";
  const [q, setQ] = useState(search);
  const { ask, dialog } = useConfirm();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => adminFetch<{ users: U[] }>(`/api/admin/users?q=${encodeURIComponent(search)}`),
    placeholderData: keepPreviousData,
  });

  const COPY = {
    suspend: {
      title: "Suspend this account?",
      body: "They're signed out everywhere and can't sign back in until you lift it.",
      confirm: "Suspend",
      danger: true,
      reason: "required" as const,
    },
    unsuspend: {
      title: "Lift the suspension?",
      body: "They can sign in again.",
      confirm: "Lift it",
    },
    force_unlink: {
      title: "Force unlink this couple?",
      body: "Both go back to linking. Private media is wiped for both within the hour.",
      confirm: "Force unlink",
      danger: true,
      reason: "required" as const,
    },
    delete: {
      title: "Delete this account?",
      body: "Everything they made is removed. This can't be undone.",
      confirm: "Delete for good",
      danger: true,
      reason: "required" as const,
      typed: "DELETE",
    },
  };

  async function act(u: U, action: keyof typeof COPY) {
    const answer = await ask(COPY[action]);
    if (!answer) return;
    try {
      await adminFetch(`/api/admin/users/${u.id}`, { body: { action, reason: answer.reason } });
      toast.ok("Done. Logged in the audit trail.");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Failed.");
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
          const next = new URLSearchParams(params);
          if (q.trim()) next.set("q", q.trim());
          else next.delete("q");
          router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
        }}
      >
        <MagnifyingGlass size={18} className="text-muted" aria-hidden />
        <input
          aria-label="Search by email or name"
          placeholder="Search by email or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="text-text h-12 flex-1 bg-transparent text-base outline-none focus-visible:shadow-none"
        />
      </form>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted text-sm" role="status">
          {data ? `${data.users.length} ${data.users.length === 1 ? "account" : "accounts"}` : ""}
        </span>
        <Button
          size="xs"
          variant="ghost"
          softDisabled={!data?.users.length}
          onClick={() =>
            data?.users.length &&
            downloadCsv(
              `clink-accounts-${new Date().toISOString().slice(0, 10)}.csv`,
              data.users.map((u) => ({
                name: u.name ?? "",
                email: u.email,
                joined: u.createdAt.slice(0, 10),
                last_sign_in: u.lastSignIn?.slice(0, 10) ?? "",
                linked: u.coupleId ? (u.linkedAt?.slice(0, 10) ?? "yes") : "",
                status: u.deleted
                  ? "deleting"
                  : u.suspended
                    ? "suspended"
                    : u.confirmed
                      ? "active"
                      : "unconfirmed",
                admin: u.admin ? "yes" : "",
              })),
            )
          }
        >
          <DownloadSimple size={16} aria-hidden /> Export CSV
        </Button>
      </div>
      {isLoading ? (
        <div className="an-skel rounded-card bg-s2 h-60" />
      ) : (
        <div
          className="rounded-card border-line overflow-x-auto border transition-opacity duration-200"
          style={{ opacity: isFetching ? 0.6 : 1 }}
        >
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
          {!data?.users.length && (
            <p className="text-muted m-0 px-4 py-8 text-center text-sm">
              {search ? `No accounts match "${search}".` : "No accounts yet."}
            </p>
          )}
        </div>
      )}
      {dialog}
    </div>
  );
}
