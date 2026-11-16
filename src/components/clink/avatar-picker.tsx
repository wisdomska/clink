"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { feedback } from "@/lib/feedback";
import { GENDERS, POSES, TONES, avatarLabel, avatarSrc, parsePose, poseKey } from "@/lib/avatars";

/**
 * Snapchat-style avatar picker: choose your skin tone, then a pose. Every
 * pose comes as a woman and a man. 3D art from Microsoft Fluent Emoji (MIT).
 */
export function AvatarPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (key: string) => void;
}) {
  const current = value ? parsePose(value) : null;
  const [tone, setTone] = useState<string>(current?.tone ?? "m");
  const [g, setG] = useState<string>(current?.g ?? "w");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2" role="radiogroup" aria-label="Skin tone">
          {TONES.map(([t, label, colour]) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tone === t}
              aria-label={label}
              onClick={() => {
                feedback("select");
                setTone(t);
                if (current) onChange(poseKey(current.g, current.pose, t));
              }}
              className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 p-0 before:absolute before:-inset-1.5 before:content-['']"
              style={{ background: colour }}
            >
              {tone === t && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-white">
                  <Check size={12} weight="bold" aria-hidden />
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="bg-s2 flex rounded-full p-1" role="radiogroup" aria-label="Avatar style">
          {GENDERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={g === k}
              onClick={() => setG(k)}
              className={cn(
                "relative h-8 cursor-pointer rounded-full border-0 px-3 text-xs font-bold before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']",
                g === k ? "bg-accent text-on-accent" : "text-muted bg-transparent",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="grid grid-cols-4 gap-2.5 sm:grid-cols-7"
        role="radiogroup"
        aria-label="Avatar"
      >
        {POSES.map(([pose], i) => {
          const key = poseKey(g, pose, tone);
          const on = value === key;
          return (
            <motion.button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={avatarLabel(key)}
              onClick={() => {
                feedback("select");
                onChange(key);
              }}
              initial={{ opacity: 0.01, scale: 0.85 }}
              animate={{ opacity: 1, scale: on ? 1.05 : 1 }}
              // Only the first fade is staggered; selecting one scales it at once.
              transition={{
                duration: 0.14,
                ease: [0.23, 1, 0.32, 1],
                opacity: { delay: Math.min(i, 8) * 0.012, duration: 0.14 },
              }}
              whileTap={{ scale: 0.94, transition: { duration: 0.06 } }}
              className={cn(
                "relative flex aspect-square cursor-pointer items-end justify-center overflow-hidden rounded-[26%] border-0 p-0",
                on ? "bg-accent/25" : "bg-s2 hover:bg-s3",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc(key)}
                alt=""
                loading="lazy"
                draggable={false}
                className="h-[86%] w-[86%] object-contain"
              />
              {on && (
                <span className="bg-accent text-on-accent absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full">
                  <Check size={12} weight="bold" aria-hidden />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
