"use client";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Display } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "@/components/ui/toast";
import { adminFetch } from "./fetch";
import { useConfirm } from "./ui";
import { AdminPage, ExportButton, FilterDate, FilterSelect, SortTh, useListParams } from "./list";
import { timeAgo } from "@/lib/time";
import { ageOn } from "@/lib/age";

const dobLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

interface U {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  createdAt: string;
  lastSignIn: string | null;
  lastActive: string | null;
  dob: string | null;
  confirmed: boolean;
  suspended: string | null;
  suspendedReason: string | null;
  deleted: string | null;
  admin: boolean;
  coupleId: string | null;
  linkedAt: string | null;
  ageVerified: boolean;
  status: "active" | "suspended" | "deleting" | "unconfirmed";
}
type Sort = "joined" | "email" | "name" | "last_sign_in";
const FILTERS = ["q", "status", "linked", "from", "to"];

/** Search box: submits on Enter. Keyed on the URL value so it follows Back and the command palette. */
function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  return (
    <form
      key={value}
      role="search"
      className="rounded-input border-line bg-s2 focus-within:border-accent flex w-full max-w-[520px] items-center gap-2 border px-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(String(new FormData(e.currentTarget).get("q") ?? "").trim());
      }}
    >
      <MagnifyingGlass size={18} className="text-muted flex-none" aria-hidden />
      <input
        name="q"
        type="search"
        data-admin-search
        aria-label="Search by email or name"
        placeholder="Search by email or name"
        defaultValue={value}
        className="text-text h-12 min-w-0 flex-1 bg-transparent text-base outline-none focus-visible:shadow-none"
      />
    </form>
  );
}

export function AdminUsers() {
  const qc = useQueryClient();
  const list = useListParams<Sort>({ sort: "joined", dir: "desc" });
  const search = list.get("q");
  const filtered = FILTERS.some((f) => list.get(f));
  const qs = list.query(FILTERS);
  const { ask, dialog } = useConfirm();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", qs],
    queryFn: () =>
      adminFetch<{ users: U[]; total: number; page: number; size: number }>(
        `/api/admin/users?${qs}`,
      ),
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
      title: "Lift this suspension?",
      body: "They can sign in again straight away.",
      confirm: "Lift suspension",
    },
    force_unlink: {
      title: "Force unlink this couple?",
      body: "Both people are unlinked and go back to the linking screen. Private media is wiped for both within an hour.",
      confirm: "Force unlink",
      danger: true,
      reason: "required" as const,
    },
    delete: {
      title: "Delete this account?",
      body: "Their account and everything they made are removed. This can't be undone.",
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
      toast.ok("Saved. Added to the audit log.");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.err(e instanceof Error ? e.message : "Couldn't do that. Try again.");
    }
  }

  const total = data?.total ?? 0;
  const sortProps = { sort: list.sort, dir: list.dir, onSort: list.toggleSort };

  return (
    <AdminPage>
      <Display size={36}>Users and couples</Display>
      <p className="text-muted m-0 text-sm">
        Open a person to see their full profile. Reading a conversation needs a reason, and every
        look is logged.
      </p>
      <SearchBox value={search} onSearch={(q) => list.set({ q })} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <FilterSelect
          id="f-status"
          label="Status"
          value={list.get("status")}
          onChange={(v) => list.set({ status: v })}
          options={[
            { value: "", label: "Any status" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
            { value: "deleting", label: "Deleting" },
            { value: "unconfirmed", label: "Unconfirmed" },
          ]}
        />
        <FilterSelect
          id="f-linked"
          label="Couple"
          value={list.get("linked")}
          onChange={(v) => list.set({ linked: v })}
          options={[
            { value: "", label: "Linked or not" },
            { value: "linked", label: "Linked" },
            { value: "unlinked", label: "Not linked" },
          ]}
        />
        <FilterDate
          id="f-from"
          label="Joined from"
          value={list.get("from")}
          onChange={(v) => list.set({ from: v })}
        />
        <FilterDate
          id="f-to"
          label="Joined to"
          value={list.get("to")}
          onChange={(v) => list.set({ to: v })}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="text-muted text-sm" role="status">
            {data ? `${total} ${total === 1 ? "account" : "accounts"}` : ""}
          </span>
          {filtered && (
            <Button
              size="xs"
              variant="text"
              onClick={() =>
                list.set({ q: null, status: null, linked: null, from: null, to: null })
              }
            >
              <X size={14} aria-hidden /> Clear filters
            </Button>
          )}
        </span>
        <ExportButton
          url={`/api/admin/users?${list.query(FILTERS, { format: "csv" })}`}
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
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="text-muted text-xs">
              <tr>
                <SortTh col="name" label="Account" firstDir="asc" {...sortProps} />
                <SortTh col="joined" label="Joined" {...sortProps} />
                <SortTh col="last_sign_in" label="Last active" {...sortProps} />
                <th scope="col" className="px-4 py-3 font-medium">
                  Couple
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Date of birth
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((u) => (
                <tr
                  key={u.id}
                  className="border-line hover:bg-s2 border-t align-middle transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-text hover:text-accent font-medium underline-offset-4 hover:underline"
                    >
                      {u.name ?? "No name yet"}
                    </Link>
                    <div className="text-muted">{u.email}</div>
                    {u.admin && (
                      <span className="border-line-strong text-muted mt-1 inline-block rounded-full border px-2 text-xs font-medium">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="mono text-muted px-4 py-3 text-xs">{u.createdAt.slice(0, 10)}</td>
                  <td
                    className="text-muted px-4 py-3 text-xs whitespace-nowrap"
                    title={
                      u.lastActive ? new Date(u.lastActive).toLocaleString("en-GB") : undefined
                    }
                  >
                    {timeAgo(u.lastActive)}
                  </td>
                  <td className="text-muted px-4 py-3 text-xs">
                    {u.coupleId ? `Linked ${u.linkedAt?.slice(0, 10) ?? ""}` : "Not linked"}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {u.dob ? (
                      <>
                        <span className="text-text">{dobLabel(u.dob)}</span>
                        <span className="text-faint block">
                          Age {ageOn(new Date(`${u.dob}T00:00:00`), new Date())}
                          {u.ageVerified ? " · declared 18+" : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-faint">Not given yet</span>
                    )}
                  </td>
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
                          Lift suspension
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
              {search
                ? `No accounts match "${search}". Try part of an email or name.`
                : filtered
                  ? "No accounts match these filters."
                  : "No accounts yet. People show up here once they sign up."}
            </p>
          )}
        </div>
      )}
      {data && (
        <Pagination
          page={list.page}
          size={list.size}
          total={total}
          noun="accounts"
          label="Account pages"
          onPage={(page) => list.set({ page })}
          onSize={(size) => list.set({ size })}
        />
      )}
      {dialog}
    </AdminPage>
  );
}
