"use client";
import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { feedback } from "@/lib/feedback";
import {
  DEFAULT_AVATAR,
  MEMOJI_POSES,
  PEOPLE,
  avatarSrc,
  memojiKey,
  parseMemoji,
  toMemoji,
} from "@/lib/avatars";

/** Arrow keys move and select within a radio group, as native radios do. */
function onArrows(e: React.KeyboardEvent<HTMLDivElement>, cols: number) {
  const step =
    e.key === "ArrowRight"
      ? 1
      : e.key === "ArrowLeft"
        ? -1
        : e.key === "ArrowDown"
          ? cols
          : e.key === "ArrowUp"
            ? -cols
            : 0;
  if (!step && e.key !== "Home" && e.key !== "End") return;
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const i = radios.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  e.preventDefault();
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? radios.length - 1
        : (i + step + radios.length) % radios.length;
  radios[next]?.focus();
  radios[next]?.click();
}

function Badge() {
  return (
    <span className="bg-accent text-on-accent absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full">
      <Check size={12} weight="bold" aria-hidden />
    </span>
  );
}

/**
 * Memoji avatar picker: choose the person, then the pose. Selected =
 * accent border and a check badge.
 */
export function AvatarPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (key: string) => void;
}) {
  const current = parseMemoji(toMemoji(value) ?? "");
  const [person, setPerson] = useState<string>(
    current?.person ?? parseMemoji(DEFAULT_AVATAR)!.person,
  );
  const selected = toMemoji(value);
  const poseInRow = MEMOJI_POSES.some(([p]) => selected === memojiKey(person, p));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-muted mb-2 text-xs font-bold">Person</p>
        <div
          role="radiogroup"
          aria-label="Person"
          className="grid grid-cols-5 gap-2 sm:grid-cols-10"
          onKeyDown={(e) =>
            onArrows(
              e,
              getComputedStyle(e.currentTarget).gridTemplateColumns.split(" ").length || 5,
            )
          }
        >
          {PEOPLE.map(([id, label]) => {
            const on = person === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={label}
                tabIndex={on ? 0 : -1}
                onClick={() => {
                  if (person === id) return;
                  feedback("select");
                  setPerson(id);
                  // Keep the pose, swap the person.
                  if (current) onChange(memojiKey(id, current.pose));
                }}
                className={cn(
                  "relative flex aspect-square min-h-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 p-0 transition-colors",
                  on ? "border-accent bg-s3" : "bg-s2 hover:bg-s3 border-transparent",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc(memojiKey(id, "love"))}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="h-full w-full scale-110 object-contain"
                />
                {on && <Badge />}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-muted mb-2 text-xs font-bold">Pose</p>
        <div
          role="radiogroup"
          aria-label="Pose"
          className="grid grid-cols-4 gap-2 sm:grid-cols-6"
          onKeyDown={(e) => {
            const cols = getComputedStyle(e.currentTarget).gridTemplateColumns.split(" ").length;
            onArrows(e, cols || 4);
          }}
        >
          {MEMOJI_POSES.map(([pose, label], i) => {
            const key = memojiKey(person, pose);
            const on = selected === key;
            // Roving tab stop: the selected pose, else the first.
            const focusable = on || (!poseInRow && i === 0);
            return (
              <button
                key={pose}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={label}
                tabIndex={focusable ? 0 : -1}
                onClick={() => {
                  feedback("select");
                  onChange(key);
                }}
                className={cn(
                  "rounded-input relative flex aspect-square min-h-11 cursor-pointer items-center justify-center overflow-hidden border-2 p-0 transition-colors",
                  on ? "border-accent bg-s3" : "bg-s2 hover:bg-s3 border-transparent",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc(key)}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="h-[88%] w-[88%] object-contain"
                />
                {on && <Badge />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
