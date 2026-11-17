"use client";

import { Toggle } from "@/components/ui/toggle";
import { Segmented } from "@/components/ui/segmented";
import {
  feedback,
  playSound,
  setFeedbackPrefs,
  useFeedbackPrefs,
  type MotionPref,
} from "@/lib/feedback";

/** Per-device feel: sound effects, haptics, and how much things move. */
export function FeelCard() {
  const prefs = useFeedbackPrefs();
  return (
    <>
      <h2 className="m-0 mt-1 text-lg font-bold">Feel</h2>
      <div className="rounded-card border-line bg-s1 overflow-hidden border">
        <Toggle
          label="Sounds"
          sub="Little clinks and pops. Off by default."
          checked={prefs.sound}
          onChange={(v) => {
            setFeedbackPrefs({ sound: v });
            if (v) playSound("clink");
          }}
        />
        <Toggle
          label="Haptics"
          sub="Gentle buzzes on phones that support them."
          checked={prefs.haptics}
          onChange={(v) => {
            setFeedbackPrefs({ haptics: v });
            if (v) feedback("success");
          }}
        />
        <div className="flex flex-col gap-2.5 px-4 py-3.5">
          <span className="text-base font-medium">
            Motion
            <span className="text-faint block text-[13px] font-normal">
              System follows your device. Reduced keeps fades and drops movement.
            </span>
          </span>
          <Segmented<MotionPref>
            label="Motion"
            value={prefs.motion}
            onChange={(v) => setFeedbackPrefs({ motion: v })}
            options={[
              { value: "system", label: "System" },
              { value: "reduce", label: "Reduced" },
              { value: "full", label: "Full" },
            ]}
          />
        </div>
      </div>
    </>
  );
}
