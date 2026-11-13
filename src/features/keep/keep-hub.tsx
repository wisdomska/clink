"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PencilSimple, Plus, Image as ImageIcon } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Display, Lead, Mono } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label, Textarea, FieldError } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { compressImage } from "@/lib/media/compress";
import { uploadMedia } from "@/lib/media/upload";
import { localParts, zonedToUtc } from "@/lib/time";
import { SealedEnvelope, OpenedEnvelope, Bottle } from "./objects";
import { useKeep, tagDate } from "./data";

const CONDITIONS = [
  "Open when you miss me",
  "Open when you can't sleep",
  "Open when you've had a bad day",
  "Open when you need a laugh",
  "Open when we've just said goodbye",
];

export function KeepHub() {
  const { me, partner, coupleId } = useCouple();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { data, isLoading } = useKeep();
  const [write, setWrite] = useState<null | "letter" | "capsule" | "moment">(() =>
    params.get("write") === "letter" ? "letter" : null,
  );
  const initials =
    `${me.role === "a" ? me.name[0] : partner.name[0]}&${me.role === "a" ? partner.name[0] : me.name[0]}`.toUpperCase();

  const fromThem = data?.letters.filter((l) => l.author_id === partner.id) ?? [];
  const fromMe = data?.letters.filter((l) => l.author_id === me.id) ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["keep", coupleId] });
  const empty =
    !isLoading &&
    data &&
    !data.letters.length &&
    !data.capsules.length &&
    data.timeline.length <= 1 &&
    !data.wall.length;

  return (
    <div className="screen an-screen flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Display size={48} className="mt-2">
            Keep
          </Display>
          <Lead className="mt-1">Things to open later.</Lead>
        </div>
        <Button size="sm" onClick={() => setWrite("letter")}>
          <PencilSimple size={18} aria-hidden />
          Write one
        </Button>
      </div>

      {empty && (
        <div className="rounded-card border-line flex flex-col items-start gap-3 border border-dashed p-5">
          <div className="w-40">
            <SealedEnvelope initials={initials} />
          </div>
          <div className="display text-[28px] leading-[1.05]">Nothing sealed yet.</div>
          <p className="text-muted m-0 text-base">
            Write {partner.name} a letter for a bad day, or bottle something up for next
            Valentine&apos;s.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-5">
          {fromThem.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="ow-h">
              <h2 id="ow-h" className="m-0 text-lg font-bold">
                Open when, from {partner.name}
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {fromThem.map((l, i) => (
                  <Link
                    key={l.id}
                    href={`/keep/letters/${l.id}`}
                    className="press text-text hover:text-text flex flex-col gap-2"
                    style={{ marginTop: i % 2 ? 28 : 0 }}
                  >
                    {l.opened_at ? (
                      <OpenedEnvelope tilt={i % 2 ? 2 : -2} />
                    ) : (
                      <SealedEnvelope initials={initials} tilt={i % 2 ? 2 : -2} />
                    )}
                    <span className="text-base leading-[1.25] font-bold">{l.condition}</span>
                    <Mono>
                      {l.opened_at
                        ? `OPENED ${tagDate(l.opened_at)}`
                        : `SEALED ${tagDate(l.sealed_at)}`}
                    </Mono>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {fromMe.length > 0 && (
            <section className="flex flex-col gap-2" aria-labelledby="mine-h">
              <h2 id="mine-h" className="m-0 text-lg font-bold">
                Sealed by you
              </h2>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {fromMe.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-input border-line bg-s1 flex items-center justify-between gap-3 border px-4 py-3 text-sm"
                  >
                    <span className="font-medium">{l.condition}</span>
                    <Mono className={l.opened_at ? "text-accent" : ""}>
                      {l.opened_at ? "OPENED" : "SEALED"}
                    </Mono>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3" aria-labelledby="cap-h">
            <div className="flex items-center justify-between">
              <h2 id="cap-h" className="m-0 text-lg font-bold">
                Time capsules
              </h2>
              <Button
                variant="text"
                size="xs"
                className="text-accent"
                onClick={() => setWrite("capsule")}
              >
                <Plus size={16} aria-hidden /> Seal one
              </Button>
            </div>
            {data?.capsules.length ? (
              <div className="no-scrollbar flex items-end gap-7 overflow-x-auto px-2 pb-2">
                {data.capsules.map((c, i) => {
                  const ready = new Date(c.unlock_at) <= new Date();
                  return (
                    <Link
                      key={c.id}
                      href={`/keep/capsules/${c.id}`}
                      className="press flex-none pt-2"
                      aria-label={`${c.title}, ${ready ? "ready to open" : `locked until ${tagDate(c.unlock_at)}`}`}
                    >
                      <Bottle
                        ready={ready}
                        tag={ready ? (c.opened_at ? "OPENED" : "READY") : tagDate(c.unlock_at)}
                        size={i % 2 ? "sm" : "md"}
                        tagTilt={i % 2 ? 5 : -6}
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted m-0 text-sm">
                Bottle a note, a voice note or a photo for a future date. Neither of you can open it
                early.
              </p>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-3" aria-labelledby="tl-h">
            <div className="flex items-center justify-between">
              <h2 id="tl-h" className="m-0 text-lg font-bold">
                <Link href="/keep/timeline" className="text-text hover:text-text">
                  Timeline
                </Link>
              </h2>
              <Button
                variant="text"
                size="xs"
                className="text-accent"
                onClick={() => setWrite("moment")}
              >
                <Plus size={16} aria-hidden /> Add a moment
              </Button>
            </div>
            <ol className="border-line m-0 ml-1.5 flex list-none flex-col border-l-[1.5px] p-0">
              {(data?.timeline ?? []).slice(0, 6).map((t, i) => (
                <li
                  key={t.id}
                  className="an-rise relative pb-[18px] pl-5"
                  style={{ ["--i" as string]: i }}
                >
                  <span
                    aria-hidden
                    className="border-accent bg-app absolute top-1 -left-1.5 h-2.5 w-2.5 rounded-full border-[1.5px]"
                  />
                  <Mono>
                    {tagDate(`${t.happened_on}T12:00:00Z`)} · {t.kind === "auto" ? "AUTO" : "ADDED"}
                  </Mono>
                  <div className="mt-0.5 text-base font-medium">{t.title}</div>
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="wall-h">
            <h2 id="wall-h" className="m-0 text-lg font-bold">
              Memory wall
            </h2>
            {data?.wall.length ? (
              <div className="grid grid-cols-[2fr_1fr] grid-rows-[96px_96px] gap-1.5 md:grid-rows-[140px_140px]">
                {data.wall.slice(0, 3).map((m, i) => (
                  <Link
                    key={m.id}
                    href={`/chat/media/${m.id}`}
                    className={`stripe rounded-thumb block overflow-hidden ${i === 0 ? "row-span-2" : ""}`}
                    aria-label="Open photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${m.id}/view`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </Link>
                ))}
                {data.wall.length > 3 && (
                  <div className="col-span-2 grid grid-cols-4 gap-1.5">
                    {data.wall.slice(3, 11).map((m) => (
                      <Link
                        key={m.id}
                        href={`/chat/media/${m.id}`}
                        className="stripe rounded-thumb block aspect-square overflow-hidden"
                        aria-label="Open photo"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/media/${m.id}/view`}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted m-0 flex items-center gap-2 text-sm">
                <ImageIcon size={18} aria-hidden /> Heart a photo in chat and it lands here. Private
                media never does.
              </p>
            )}
          </section>
        </div>
      </div>

      <LetterSheet
        open={write === "letter"}
        onOpenChange={(v) => setWrite(v ? "letter" : null)}
        onDone={refresh}
      />
      <CapsuleSheet
        open={write === "capsule"}
        onOpenChange={(v) => setWrite(v ? "capsule" : null)}
        onDone={refresh}
      />
      <MomentSheet
        open={write === "moment"}
        onOpenChange={(v) => setWrite(v ? "moment" : null)}
        onDone={refresh}
      />
    </div>
  );
}

function LetterSheet({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { partner } = useCouple();
  const [cond, setCond] = useState(CONDITIONS[0]!);
  const [custom, setCustom] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Write an Open When letter" handle>
      <Display as="h2" size={28}>
        For {partner.name}, <em>later</em>
      </Display>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="When should they open it">
        {[...CONDITIONS, "Something else"].map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={cond === c}
            onClick={() => setCond(c)}
            className="press h-10 cursor-pointer rounded-full border px-3.5 text-sm font-medium"
            style={{
              borderColor: cond === c ? "var(--accent)" : "var(--line)",
              background: cond === c ? "var(--accent)" : "transparent",
              color: cond === c ? "var(--on-accent)" : "var(--text)",
            }}
          >
            {c.replace("Open when ", "")}
          </button>
        ))}
      </div>
      {cond === "Something else" && (
        <div>
          <Label htmlFor="cc">Open when...</Label>
          <Input
            id="cc"
            value={custom}
            maxLength={70}
            placeholder="you land at the airport"
            onChange={(e) => setCustom(e.target.value)}
          />
        </div>
      )}
      <Textarea
        aria-label="Your letter"
        className="min-h-[180px]"
        value={body}
        maxLength={6000}
        placeholder="Dear you. If you're reading this..."
        onChange={(e) => setBody(e.target.value)}
      />
      <FieldError>{error}</FieldError>
      <Button
        disabled={!body.trim()}
        onClick={async () => {
          setError(null);
          const condition = cond === "Something else" ? `Open when ${custom.trim()}` : cond;
          const r = await fetch("/api/letters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ condition, body }),
          });
          if (!r.ok) return setError((await r.json()).message);
          setBody("");
          onOpenChange(false);
          onDone();
          toast(`Sealed. ${partner.name} can open it any time.`);
        }}
      >
        Seal it
      </Button>
    </Sheet>
  );
}

function CapsuleSheet({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { me } = useCouple();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tomorrow] = useState(
    () => localParts(new Date(Date.now() + 86400000), me.timezone).dateKey,
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Seal a time capsule" handle>
      <Display as="h2" size={28}>
        Bottle it <em>up</em>
      </Display>
      <div>
        <Label htmlFor="ct">Name it</Label>
        <Input
          id="ct"
          value={title}
          maxLength={60}
          placeholder="Valentine's, sealed"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="cd">Opens on</Label>
        <Input
          id="cd"
          type="date"
          min={tomorrow}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Textarea
        aria-label="What goes inside"
        value={body}
        maxLength={6000}
        placeholder="A prediction, a promise, a list."
        onChange={(e) => setBody(e.target.value)}
      />
      <label className="press border-line bg-s2 flex h-11 cursor-pointer items-center gap-2 self-start rounded-full border px-4 text-sm font-medium">
        <ImageIcon size={18} aria-hidden /> {file ? file.name.slice(0, 24) : "Add a photo"}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <p className="text-faint m-0 text-sm">
        Neither of you can open it before{" "}
        {date
          ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "that date"}
        . Not even you.
      </p>
      <FieldError>{error}</FieldError>
      <Button
        disabled={busy || !title.trim() || !date || (!body.trim() && !file)}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            let mediaId: string | undefined;
            if (file) {
              const img = await compressImage(file);
              mediaId = (
                await uploadMedia(img.blob, { kind: "image", width: img.width, height: img.height })
              ).id;
            }
            const unlockAt = zonedToUtc(date, "09:00", me.timezone).toISOString();
            const r = await fetch("/api/capsules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, unlockAt, body: body || undefined, mediaId }),
            });
            if (!r.ok) return setError((await r.json()).message);
            onOpenChange(false);
            onDone();
            toast("Corked. See you then.");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't seal it.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Cork it
      </Button>
    </Sheet>
  );
}

function MomentSheet({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { me, coupleId } = useCouple();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localParts(new Date(), me.timezone).dateKey);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add a moment" handle>
      <Display as="h2" size={28}>
        Add a <em>moment</em>
      </Display>
      <div>
        <Label htmlFor="mt">What happened</Label>
        <Input
          id="mt"
          value={title}
          maxLength={120}
          placeholder="First time you met my mum"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="md">When</Label>
        <Input
          id="md"
          type="date"
          max={localParts(new Date(), me.timezone).dateKey}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <label className="press border-line bg-s2 flex h-11 cursor-pointer items-center gap-2 self-start rounded-full border px-4 text-sm font-medium">
        <ImageIcon size={18} aria-hidden /> {file ? file.name.slice(0, 24) : "Add a photo"}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <Button
        disabled={busy || !title.trim() || !date}
        onClick={async () => {
          setBusy(true);
          try {
            let mediaId: string | null = null;
            if (file) {
              const img = await compressImage(file);
              mediaId = (
                await uploadMedia(img.blob, { kind: "image", width: img.width, height: img.height })
              ).id;
            }
            const { error } = await supabaseBrowser().from("timeline_entries").insert({
              couple_id: coupleId,
              kind: "manual",
              title: title.trim(),
              happened_on: date,
              media_id: mediaId,
              created_by: me.id,
            });
            if (error) throw error;
            setTitle("");
            onOpenChange(false);
            onDone();
            toast("On the timeline.");
          } catch {
            toast("Couldn't add that.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Add it
      </Button>
    </Sheet>
  );
}
