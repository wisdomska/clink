"use client";
import { useEffect, useState } from "react";
import { Check, Plus, X, CaretRight, EnvelopeSimple, LockKey } from "@phosphor-icons/react";
import Link from "next/link";
import { useCouple } from "@/features/couple/context";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Hint } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { emailSchema } from "@/lib/validation";
import {
  addAnother,
  forget,
  MAX_ACCOUNTS,
  rememberCurrent,
  savedAccounts,
  switchTo,
  type SavedAccount,
} from "@/lib/accounts";

const rowCls =
  "press border-line text-text hover:text-text flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 border-b bg-transparent px-4 py-2.5 text-left text-base font-medium";

/** Email, password and the accounts saved on this device. */
export function AccountRows() {
  const { me } = useCouple();
  const profile = { name: me.name, photoUrl: me.avatarUrl };
  const [list, setList] = useState<SavedAccount[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [openSwitch, setOpenSwitch] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    rememberCurrent(profile).then((cur) => {
      setCurrentId(cur?.id ?? null);
      setEmail(cur?.email ?? "");
      setList(savedAccounts());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.name, me.avatarUrl]);

  const others = list.filter((a) => a.id !== currentId);

  return (
    <>
      <button type="button" className={rowCls} onClick={() => setOpenEmail(true)}>
        <span className="flex min-w-0 items-center gap-3">
          <EnvelopeSimple size={20} className="text-muted flex-none" aria-hidden />
          <span className="min-w-0">
            Email
            <span className="text-faint block truncate text-[13px] font-normal">{email}</span>
          </span>
        </span>
        <CaretRight size={18} className="text-faint" aria-hidden />
      </button>
      <Link href="/account/password?next=/settings" className={rowCls}>
        <span className="flex items-center gap-3">
          <LockKey size={20} className="text-muted" aria-hidden />
          Password
        </span>
        <CaretRight size={18} className="text-faint" aria-hidden />
      </Link>
      <button type="button" className={rowCls} onClick={() => setOpenSwitch(true)}>
        Switch account
        <span className="text-faint flex items-center gap-1 text-sm font-normal">
          {others.length > 0 ? `${others.length + 1} on this device` : "Add one"}
          <CaretRight size={18} aria-hidden />
        </span>
      </button>

      <Sheet open={openSwitch} onOpenChange={setOpenSwitch} title="Accounts on this device" handle>
        <p className="text-muted m-0 mb-3 text-sm">
          Stay signed in to more than one Clink account and hop between them. Each account still has
          its own one partner.
        </p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {list.map((a) => {
            const current = a.id === currentId;
            return (
              <li key={a.id} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={current || busyId !== null}
                  onClick={async () => {
                    setBusyId(a.id);
                    const ok = await switchTo(a.id, profile);
                    if (!ok) setBusyId(null);
                  }}
                  className="press hover:bg-s2 flex min-h-16 flex-1 cursor-pointer items-center gap-3 rounded-2xl bg-transparent px-2 text-left disabled:cursor-default"
                >
                  <Avatar name={a.name} side="me" size={44} ring={0} photoUrl={a.photoUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.name}</span>
                    <span className="text-faint block truncate text-[13px]">{a.email}</span>
                  </span>
                  {current ? (
                    <Check size={20} weight="bold" className="text-accent" aria-label="Signed in" />
                  ) : busyId === a.id ? (
                    <Spinner size={20} label="Switching" />
                  ) : null}
                </button>
                {!current && (
                  <button
                    type="button"
                    aria-label={`Remove ${a.email} from this device`}
                    onClick={() => {
                      forget(a.id);
                      setList(savedAccounts());
                    }}
                    className="press text-faint hover:text-danger flex h-11 w-11 cursor-pointer items-center justify-center rounded-full"
                  >
                    <X size={18} aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {list.length < MAX_ACCOUNTS && (
          <Button
            variant="secondary"
            className="mt-4 w-full"
            loading={busyId === "add"}
            onClick={async () => {
              setBusyId("add");
              await addAnother(profile);
            }}
          >
            <Plus size={18} aria-hidden />
            Add another account
          </Button>
        )}
      </Sheet>

      <EmailSheet open={openEmail} onOpenChange={setOpenEmail} current={email} />
    </>
  );
}

function EmailSheet({
  open,
  onOpenChange,
  current,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Change email" handle>
      {sent ? (
        <p className="text-muted m-0">
          Check both inboxes. Tap the link in each one ({current} and {value}) and your new email is
          set.
        </p>
      ) : (
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            if (!emailSchema.safeParse(value).success)
              return setError("That email looks off. Missing a dot somewhere?");
            if (value.toLowerCase() === current.toLowerCase())
              return setError("That's already your email.");
            setBusy(true);
            const { error: err } = await supabaseBrowser().auth.updateUser(
              { email: value },
              { emailRedirectTo: `${window.location.origin}/auth/callback?next=/settings` },
            );
            setBusy(false);
            if (err)
              return setError(
                err.status === 429
                  ? "Too many emails just now. Give it a minute."
                  : err.message.includes("already")
                    ? "Another account already uses that email."
                    : "We couldn't send the confirmation. Try again in a moment.",
              );
            setSent(true);
            toast.ok("Confirmation sent.");
          }}
        >
          <Label htmlFor="new-email">New email</Label>
          <Input
            id="new-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            invalid={Boolean(error)}
          />
          <FieldError>{error}</FieldError>
          <Hint>We&apos;ll email both addresses to confirm it&apos;s really you.</Hint>
          <Button type="submit" loading={busy} className="mt-4 w-full">
            Send confirmation
          </Button>
        </form>
      )}
    </Sheet>
  );
}
