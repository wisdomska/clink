"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fingerprint, Trash } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";

/** ACC-01: register and remove sign-in passkeys for this account. */
export function PasskeyRows() {
  const qc = useQueryClient();
  const supported = typeof window !== "undefined" && "PublicKeyCredential" in window;
  const { data: keys = [] } = useQuery({
    queryKey: ["passkeys"],
    enabled: supported,
    queryFn: async () => {
      const { data, error } = await supabaseBrowser().auth.passkey.list();
      if (error) return [];
      return data ?? [];
    },
  });

  if (!supported) return null;

  const add = async () => {
    const { error } = await supabaseBrowser().auth.registerPasskey();
    if (error) return toast.err("Passkey not added. Try again on this device.");
    toast("Passkey added. Sign in with your face or fingerprint next time.");
    qc.invalidateQueries({ queryKey: ["passkeys"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabaseBrowser().auth.passkey.delete({ passkeyId: id });
    if (error) return toast.err("Couldn't remove that passkey.");
    toast("Passkey removed.");
    qc.invalidateQueries({ queryKey: ["passkeys"] });
  };

  return (
    <>
      {keys.map((k) => (
        <div
          key={k.id}
          className="border-line flex min-h-14 items-center justify-between gap-3 border-b px-4 py-2.5"
        >
          <span className="text-base font-medium">
            {k.friendly_name || "Passkey"}
            <span className="text-faint block text-[13px] font-normal">
              Added {new Date(k.created_at).toLocaleDateString()}
            </span>
          </span>
          <button
            type="button"
            onClick={() => remove(k.id)}
            aria-label={`Remove ${k.friendly_name || "passkey"}`}
            className="press text-muted hover:text-danger flex h-11 w-11 items-center justify-center rounded-full"
          >
            <Trash size={18} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="press border-line text-text hover:text-text flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 border-b bg-transparent px-4 py-2.5 text-left text-base font-medium"
      >
        <span>
          {keys.length ? "Add another passkey" : "Sign in with a passkey"}
          <span className="text-faint block text-[13px] font-normal">
            Face, fingerprint or screen lock. No password needed.
          </span>
        </span>
        <Fingerprint size={20} className="text-faint" aria-hidden />
      </button>
    </>
  );
}
