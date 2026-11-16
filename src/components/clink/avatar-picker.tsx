"use client";
import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { feedback } from "@/lib/feedback";
import {
  DEFAULT_AVATAR,
  MEMOJI_POSES,
  peopleFor,
  type Gender,
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

/** The selected tick. Sits on the tile's edge (outside any clipping) with a ring, so it's never cut off. */
function Badge() {
  return (
    <span className="bg-accent text-on-accent ring-app absolute -top-1 -right-1 z-[1] flex h-6 w-6 items-center justify-center rounded-full ring-2">
      <Check size={13} weight="bold" aria-hidden />
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
  gender = null,
}: {
  value: string | null;
  /** "" means a person is chosen but no pose yet: a pose must be picked. */
  onChange: (key: string) => void;
  gender?: Gender | null;
}) {
  const people = peopleFor(gender);
  const current = parseMemoji(toMemoji(value) ?? "");
  const [personState, setPerson] = useState<string>(
    current?.person ?? parseMemoji(DEFAULT_AVATAR)!.person,
  );
  // If the cast changes (gender switched), fall back to the first person shown.
  const person = people.some(([id]) => id === personState) ? personState : people[0]![0];
  const selected = value ? toMemoji(value) : null;
  const needsPose = !selected || parseMemoji(selected)?.person !== person;
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
          {people.map(([id, label]) => {
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
                  // A new person needs a pose chosen for them.
                  onChange("");
                }}
                className={cn(
                  "relative flex aspect-square min-h-11 cursor-pointer items-center justify-center rounded-full border-2 p-0 transition-colors",
                  on ? "border-accent bg-s3" : "bg-s2 hover:bg-s3 border-transparent",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc(memojiKey(id, "love"))}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="h-[86%] w-[86%] object-contain"
                />
                {on && <Badge />}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p
          className={cn("mb-2 text-xs font-bold", needsPose ? "text-accent" : "text-muted")}
          aria-live="polite"
        >
          {needsPose ? "Pose: pick one to finish your avatar" : "Pose"}
        </p>
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
                  "rounded-input relative flex aspect-square min-h-11 cursor-pointer items-center justify-center border-2 p-0 transition-colors",
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
