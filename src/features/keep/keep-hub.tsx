"use client";
import { useState } from "react";
import Link from "@/components/ui/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PencilSimple, Plus, Image as ImageIcon, Microphone, Stop, X } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Display, Lead, Mono } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Input, Label, Textarea, FieldError } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { compressImage } from "@/lib/media/compress";
import { uploadMedia } from "@/lib/media/upload";
import { prepareVideo } from "@/lib/media/video";
import { VoiceRecorder, type Recording } from "@/lib/media/recorder";
import { localParts, zonedToUtc } from "@/lib/time";
import {
  LoadMore,
  SkeletonRows,
  editList,
  flatItems,
  prependTo,
  rollback,
  useScrollRestore,
} from "@/features/plans/infinite";
import { SealedEnvelope, OpenedEnvelope, Bottle } from "./objects";
import {
  useKeep,
  useLetters,
  useCapsules,
  lettersKey,
  capsulesKey,
  timelineKey,
  tagDate,
  type CapsuleRow,
  type LetterRow,
  type TimelineRow,
} from "./data";
import { DateField } from "@/components/ui/pickers";
import { PageBar } from "@/components/clink/page-bar";
import { EmptyState } from "@/components/ui/empty-state";

const CONDITIONS = [
  "Open when you miss me",
  "Open when you can't sleep",
  "Open when you've had a bad day",
  "Open when you need a laugh",
  "Open when we've just said goodbye",
];

type Write = null | "letter" | "capsule" | "moment";
const isTemp = (id: string) => id.startsWith("temp-");

/** Envelope cards while a page of letters loads: same grid, same proportions. */
function EnvelopeSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden className="flex flex-col gap-2">
          <div className="an-skel rounded-thumb bg-s2 aspect-[3/2] w-full" />
          <div className="an-skel bg-s2 h-4 w-4/5 rounded-full" />
          <div className="an-skel bg-s2 h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </>
  );
}

function BottleSkeleton({ count = 2 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="an-skel rounded-thumb bg-s2 h-[150px] w-[72px] flex-none self-end"
        />
      ))}
    </>
  );
}

export function KeepHub() {
  const { me, partner, coupleId } = useCouple();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { data, isLoading } = useKeep();
  const fromThemQ = useLetters("partner");
  const fromMeQ = useLetters("me");
  const capsulesQ = useCapsules();
  const [write, setWrite] = useState<Write>(() => {
    const w = params.get("write");
    return w === "letter" || w === "capsule" || w === "moment" ? w : null;
  });
  const initials =
    `${me.role === "a" ? me.name[0] : partner.name[0]}&${me.role === "a" ? partner.name[0] : me.name[0]}`.toUpperCase();

  const fromThem = flatItems(fromThemQ.data);
  const fromMe = flatItems(fromMeQ.data);
  const capsules = flatItems(capsulesQ.data);
  const listsReady = fromThemQ.isSuccess && fromMeQ.isSuccess && capsulesQ.isSuccess;
  useScrollRestore("keep-hub", listsReady && !isLoading);
  const refresh = () => qc.invalidateQueries({ queryKey: ["keep", coupleId] });
  const empty =
    !isLoading &&
    data &&
    listsReady &&
    !fromThem.length &&
    !fromMe.length &&
    !capsules.length &&
    data.timeline.length <= 1 &&
    !data.wall.length;
  const [now] = useState(() => Date.now());

  return (
    <div className="screen an-screen flex flex-col gap-5">
      <PageBar
        title="Keep"
        actions={
          <Button size="sm" onClick={() => setWrite("letter")}>
            <PencilSimple size={18} aria-hidden />
            Write one
          </Button>
        }
      />
      <Lead className="-mt-2">Things to open later.</Lead>

      {empty && (
        <EmptyState
          art={
            <div className="w-40">
              <SealedEnvelope initials={initials} tilt={0} />
            </div>
          }
          title="Nothing sealed yet."
          actions={
            <>
              <Button size="sm" onClick={() => setWrite("letter")}>
                <PencilSimple size={18} aria-hidden /> Write a letter
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setWrite("capsule")}>
                <Plus size={18} aria-hidden /> Seal a capsule
              </Button>
            </>
          }
        >
          Write {partner.name} a letter for a bad day, or bottle something up for next
          Valentine&apos;s.
        </EmptyState>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {fromThemQ.isPending && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4" aria-hidden>
              <EnvelopeSkeleton count={2} />
            </div>
          )}
          {fromThem.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="ow-h">
              <h2 id="ow-h" className="m-0 text-lg font-bold">
                Open when, from {partner.name}
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
                {fromThem.map((l) => (
                  <Link
                    key={l.id}
                    href={`/keep/letters/${l.id}`}
                    className="press text-text hover:text-text flex flex-col gap-2"
                  >
                    {l.opened_at ? (
                      <OpenedEnvelope tilt={0} />
                    ) : (
                      <SealedEnvelope initials={initials} tilt={0} />
                    )}
                    <span className="text-base leading-[1.25] font-bold">{l.condition}</span>
                    <Mono>
                      {l.opened_at
                        ? `OPENED ${tagDate(l.opened_at)}`
                        : `SEALED ${tagDate(l.sealed_at)}`}
                    </Mono>
                  </Link>
                ))}
                {fromThemQ.isFetchingNextPage && <EnvelopeSkeleton />}
              </div>
              <LoadMore query={fromThemQ} label="More letters" />
            </section>
          )}
          {fromMe.length > 0 && (
            <section className="flex flex-col gap-2" aria-labelledby="mine-h">
              <h2 id="mine-h" className="m-0 text-lg font-bold">
                Sealed by you
              </h2>
              <ul className="rounded-card border-line bg-s1 divide-line m-0 flex list-none flex-col divide-y overflow-hidden border p-0">
                {fromMe.map((l) => (
                  <li
                    key={l.id}
                    aria-busy={isTemp(l.id) || undefined}
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="font-medium">{l.condition}</span>
                    <Mono
                      className={l.opened_at ? "text-accent" : isTemp(l.id) ? "text-faint" : ""}
                    >
                      {l.opened_at ? "OPENED" : isTemp(l.id) ? "SEALING" : "SEALED"}
                    </Mono>
                  </li>
                ))}
              </ul>
              <LoadMore
                query={fromMeQ}
                skeleton={<SkeletonRows count={2} />}
                label="More letters"
              />
            </section>
          )}

          <section className="flex flex-col gap-3" aria-labelledby="cap-h">
            <div className="flex items-center justify-between">
              <h2 id="cap-h" className="m-0 text-lg font-bold">
                Time capsules
              </h2>
              <Button
                variant="text"
                size="sm"
                className="text-accent"
                onClick={() => setWrite("capsule")}
              >
                <Plus size={16} aria-hidden /> Seal one
              </Button>
            </div>
            {capsulesQ.isPending ? (
              <div className="flex items-end gap-7 px-2 pb-2" aria-hidden>
                <BottleSkeleton count={3} />
              </div>
            ) : capsules.length ? (
              <div className="no-scrollbar flex items-end gap-7 overflow-x-auto px-2 pb-2">
                {capsules.map((c, i) => {
                  const ready = new Date(c.unlock_at).getTime() <= now;
                  const bottle = (
                    <Bottle
                      ready={ready}
                      tag={ready ? (c.opened_at ? "OPENED" : "READY") : tagDate(c.unlock_at)}
                      size={i % 2 ? "sm" : "md"}
                      tagTilt={i % 2 ? 5 : -6}
                    />
                  );
                  return isTemp(c.id) ? (
                    <div key={c.id} aria-busy className="flex-none pt-2 opacity-70">
                      {bottle}
                    </div>
                  ) : (
                    <Link
                      key={c.id}
                      href={`/keep/capsules/${c.id}`}
                      className="press flex-none pt-2"
                      aria-label={`${c.title}, ${ready ? "ready to open" : `locked until ${tagDate(c.unlock_at)}`}`}
                    >
                      {bottle}
                    </Link>
                  );
                })}
                <LoadMore query={capsulesQ} horizontal skeleton={<BottleSkeleton />} label="More" />
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2">
                <p className="text-muted m-0 text-sm">
                  Bottle a note, a voice note or a photo for a future date. Neither of you can open
                  it early.
                </p>
              </div>
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
                size="sm"
                className="text-accent"
                onClick={() => setWrite("moment")}
              >
                <Plus size={16} aria-hidden /> Add a moment
              </Button>
            </div>
            {isLoading ? (
              <div aria-hidden className="flex flex-col gap-4 pl-5">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="an-skel bg-s2 h-3 w-28 rounded-full" />
                    <div className="an-skel bg-s2 h-4 w-3/5 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
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
                      {tagDate(`${t.happened_on}T12:00:00Z`)} ·{" "}
                      {t.kind === "auto" ? "AUTO" : "ADDED"}
                    </Mono>
                    <div className="mt-0.5 text-base font-medium">{t.title}</div>
                  </li>
                ))}
              </ol>
            )}
            {(data?.timeline.length ?? 0) >= 6 && (
              <Link
                href="/keep/timeline"
                className="text-accent hover:text-accent flex min-h-11 items-center self-start text-sm font-bold"
              >
                See the whole timeline
              </Link>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="wall-h">
            <h2 id="wall-h" className="m-0 text-lg font-bold">
              Memory wall
            </h2>
            {data?.wall.length ? (
              <div className="grid grid-cols-[2fr_1fr] grid-rows-[96px_96px] gap-1.5 md:grid-rows-[140px_140px] 2xl:grid-rows-[190px_190px]">
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
                <ImageIcon size={18} aria-hidden /> Heart a photo in chat, or add one to Keep, and
                it lands here. Private media never does.
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
  const { me, partner, coupleId } = useCouple();
  const qc = useQueryClient();
  const [cond, setCond] = useState(CONDITIONS[0]!);
  const [custom, setCustom] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Write an Open when letter" handle>
      <Display as="h2" size={28}>
        For {partner.name}, later
      </Display>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="When should they open it">
        {[...CONDITIONS, "Something else"].map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={cond === c}
            onClick={() => setCond(c)}
            className="press h-11 cursor-pointer rounded-full border px-3.5 text-sm font-medium"
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
          // Optimistic: the letter shows under "Sealed by you" at once; the
          // draft stays in the sheet until the server confirms, so a failure loses nothing.
          const key = lettersKey(coupleId, "me");
          const temp: LetterRow = {
            id: `temp-${crypto.randomUUID()}`,
            author_id: me.id,
            condition,
            sealed_at: new Date().toISOString(),
            opened_at: null,
          };
          const snap = await prependTo(qc, key, temp);
          onOpenChange(false);
          toast(`Sealed. ${partner.name} can open it any time.`);
          try {
            const r = await fetch("/api/letters", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ condition, body }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.message ?? "Couldn't seal it.");
            setBody("");
            onDone();
          } catch (e) {
            rollback(qc, key, snap);
            const msg = e instanceof Error ? e.message : "Couldn't seal it.";
            setError(msg);
            toast.err("Couldn't seal it. Your letter is still here.");
            onOpenChange(true);
          }
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
  const { me, coupleId } = useCouple();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [voice, setVoice] = useState<Recording | null>(null);
  const [recorder, setRecorder] = useState<VoiceRecorder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tomorrow] = useState(
    () => localParts(new Date(Date.now() + 86400000), me.timezone).dateKey,
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Seal a time capsule" handle>
      <Display as="h2" size={28}>
        Bottle it up
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
        <DateField id="cd" min={tomorrow} value={date} onChange={setDate} />
      </div>
      <Textarea
        aria-label="What goes inside"
        value={body}
        maxLength={6000}
        placeholder="A prediction, a promise, a list."
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {!voice && !recorder && (
          <label className="press border-line bg-s2 flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium">
            <ImageIcon size={18} aria-hidden />{" "}
            {file ? file.name.slice(0, 24) : "Add a photo or video"}
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
        {!file && !voice && (
          <button
            type="button"
            className="press border-line bg-s2 text-text flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium"
            onClick={async () => {
              if (recorder) {
                const rec = await recorder.stop();
                setRecorder(null);
                if (rec) setVoice(rec);
                return;
              }
              const r = new VoiceRecorder();
              r.onAutoStop = async () => {
                const rec = await r.stop();
                setRecorder(null);
                if (rec) setVoice(rec);
              };
              try {
                await r.start();
                setRecorder(r);
              } catch {
                toast("Clink needs your microphone for that.");
              }
            }}
          >
            {recorder ? (
              <>
                <Stop size={18} weight="fill" className="text-danger" aria-hidden /> Stop recording
              </>
            ) : (
              <>
                <Microphone size={18} aria-hidden /> Record a voice note
              </>
            )}
          </button>
        )}
        {(file || voice) && (
          <button
            type="button"
            aria-label="Remove attachment"
            className="press border-line bg-s2 text-text flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium"
            onClick={() => {
              setFile(null);
              setVoice(null);
            }}
          >
            {voice && `Voice note, ${Math.round(voice.durationS)} s`} <X size={16} aria-hidden />
          </button>
        )}
      </div>
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
        loading={busy}
        disabled={!!recorder || !title.trim() || !date || (!body.trim() && !file && !voice)}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            let mediaId: string | undefined;
            if (file?.type.startsWith("video/")) {
              const v = await prepareVideo(file);
              mediaId = (
                await uploadMedia(v.blob, {
                  kind: "video",
                  durationS: v.durationS,
                  width: v.width,
                  height: v.height,
                })
              ).id;
            } else if (file) {
              const img = await compressImage(file);
              mediaId = (
                await uploadMedia(img.blob, { kind: "image", width: img.width, height: img.height })
              ).id;
            } else if (voice) {
              mediaId = (
                await uploadMedia(voice.blob, {
                  kind: "audio",
                  durationS: voice.durationS,
                  waveform: voice.waveform,
                })
              ).id;
            }
            const unlockAt = zonedToUtc(date, "09:00", me.timezone).toISOString();
            // Optimistic: the bottle joins the shelf in date order straight away.
            const key = capsulesKey(coupleId);
            const temp: CapsuleRow = {
              id: `temp-${crypto.randomUUID()}`,
              author_id: me.id,
              title: title.trim(),
              unlock_at: unlockAt,
              opened_at: null,
              created_at: new Date().toISOString(),
            };
            const snap = await editList<CapsuleRow>(qc, key, (items, page) =>
              page === 0
                ? [...items, temp].sort((a, b) => a.unlock_at.localeCompare(b.unlock_at))
                : items,
            );
            if (!snap) await prependTo(qc, key, temp);
            onOpenChange(false);
            toast("Corked. See you then.");
            const r = await fetch("/api/capsules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, unlockAt, body: body || undefined, mediaId }),
            });
            if (!r.ok) {
              rollback(qc, key, snap);
              const msg = (await r.json().catch(() => ({}))).message ?? "Couldn't seal it.";
              setError(msg);
              toast.err("Couldn't cork it. It's still here.");
              onOpenChange(true);
              return;
            }
            setTitle("");
            setBody("");
            setFile(null);
            setVoice(null);
            onDone();
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
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localParts(new Date(), me.timezone).dateKey);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add a moment" handle>
      <Display as="h2" size={28}>
        Add a moment
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
        <DateField
          id="md"
          max={localParts(new Date(), me.timezone).dateKey}
          value={date}
          onChange={setDate}
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
        loading={busy}
        disabled={!title.trim() || !date}
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
            // Optimistic: it shows on the timeline (and the Keep preview) at once.
            const temp: TimelineRow = {
              id: `temp-${crypto.randomUUID()}`,
              kind: "manual",
              title: title.trim(),
              happened_on: date,
              media_id: mediaId,
              created_by: me.id,
            };
            const byDate = (items: TimelineRow[]) =>
              [...items, temp].sort((a, b) => b.happened_on.localeCompare(a.happened_on));
            const key = timelineKey(coupleId);
            const snap = await editList<TimelineRow>(qc, key, (items, page) =>
              page === 0 ? byDate(items) : items,
            );
            const previewKey = ["keep", coupleId];
            await qc.cancelQueries({ queryKey: previewKey, exact: true });
            const preview = qc.getQueryData<{ timeline: TimelineRow[]; wall: unknown[] }>(
              previewKey,
            );
            if (preview)
              qc.setQueryData(previewKey, { ...preview, timeline: byDate(preview.timeline) });
            onOpenChange(false);
            toast("On the timeline.");
            const { error } = await supabaseBrowser().from("timeline_entries").insert({
              couple_id: coupleId,
              kind: "manual",
              title: title.trim(),
              happened_on: date,
              media_id: mediaId,
              created_by: me.id,
            });
            if (error) {
              rollback(qc, key, snap);
              if (preview) qc.setQueryData(previewKey, preview);
              onOpenChange(true);
              throw error;
            }
            // Refresh the hub so a kept photo shows on the Memory wall too.
            void qc.invalidateQueries({ queryKey: previewKey });
            setTitle("");
            setFile(null);
            onDone();
          } catch {
            toast.err("Couldn't add that. It's still here to try again.");
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
