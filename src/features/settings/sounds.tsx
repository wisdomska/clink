"use client";
import { useSyncExternalStore } from "react";
import { Play } from "@phosphor-icons/react";
import { Toggle } from "@/components/ui/toggle";
import {
  hangupToneOn,
  messageToneOn,
  previewTone,
  setHangupTone,
  setMessageTone,
} from "@/lib/tones";

function PlayButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="press border-line bg-s2 text-text hover:bg-s3 flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border"
    >
      <Play size={16} weight="fill" aria-hidden />
    </button>
  );
}

/** Every sound Clink makes, each with a preview, and a switch where it's optional. */
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const changed = () => listeners.forEach((l) => l());

/** Every sound Clink makes, each with a preview, and a switch where it's optional. */
export function SoundsCard() {
  // Saved on this device; the server render assumes "on", then the real value shows.
  const message = useSyncExternalStore(subscribe, messageToneOn, () => true);
  const hangup = useSyncExternalStore(subscribe, hangupToneOn, () => true);
  const setMessage = (v: boolean) => {
    setMessageTone(v);
    changed();
  };
  const setHangup = (v: boolean) => {
    setHangupTone(v);
    changed();
  };
  return (
    <section aria-labelledby="sounds-h" className="flex flex-col gap-2">
      <h3 id="sounds-h" className="m-0 text-lg font-bold">
        Sounds
      </h3>
      <div className="rounded-card border-line bg-s1 overflow-hidden border">
        <div className="border-line flex min-h-14 items-center gap-3 border-b px-4 py-2.5">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-medium">Ringtone</span>
            <span className="text-muted text-sm">Calls always ring, so you never miss one.</span>
          </div>
          <PlayButton label="Play the ringtone" onClick={() => previewTone("ringtone")} />
        </div>
        <div className="border-line flex items-center gap-1 border-b pr-4">
          <div className="min-w-0 flex-1">
            <Toggle
              label="Message tone"
              sub="A soft chime when a message arrives while Clink is open."
              checked={message}
              onChange={(v) => {
                setMessage(v);
                if (v) previewTone("message");
              }}
              last
            />
          </div>
          <PlayButton label="Play the message tone" onClick={() => previewTone("message")} />
        </div>
        <div className="flex items-center gap-1 pr-4">
          <div className="min-w-0 flex-1">
            <Toggle
              label="Hang-up sound"
              sub="Three soft notes when a call ends."
              checked={hangup}
              onChange={(v) => {
                setHangup(v);
                if (v) previewTone("hangup");
              }}
              last
            />
          </div>
          <PlayButton label="Play the hang-up sound" onClick={() => previewTone("hangup")} />
        </div>
      </div>
    </section>
  );
}
