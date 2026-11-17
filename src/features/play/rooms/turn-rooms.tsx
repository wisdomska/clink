"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Backspace, DownloadSimple } from "@phosphor-icons/react";
import { useCouple } from "@/features/couple/context";
import { Button, IconButton } from "@/components/ui/button";
import { PartnerMark } from "@/components/ui/heading";
import { toast } from "@/components/ui/toast";
import {
  WORD_TURNS_EACH,
  STORY_MAX_LINES,
  wordPoints,
  type WordState,
  type StoryState,
} from "../engines/turns";
import { RoomHeader, sendMove, FinalScore, ForfeitNote, BackToLobby, type GameRow } from "./shared";
import { haptic } from "@/lib/feedback";
import { startGame } from "../meta";

function adjacent(a: number, b: number) {
  return (
    Math.abs(Math.floor(a / 4) - Math.floor(b / 4)) <= 1 &&
    Math.abs((a % 4) - (b % 4)) <= 1 &&
    a !== b
  );
}

/* PLAY-06 Word board */
export function WordRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const router = useRouter();
  const s = game.state as WordState;
  const [path, setPath] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const myTurn = s.turn === me.id && game.status === "active";
  const word = path
    .map((i) => s.board[i])
    .join("")
    .toLowerCase();
  const my = s.scores[me.id] ?? 0;
  const their = s.scores[partner.id] ?? 0;

  async function play(pass = false) {
    setBusy(true);
    const r = await sendMove(game.id, pass ? { pass: true } : { word });
    setBusy(false);
    // Played, or refused (not a word, already used): either way, start the next pick fresh.
    if (!r && !pass) haptic("error");
    setPath([]);
  }

  return (
    <>
      <RoomHeader
        type="word"
        counter={`${Math.min(s.plays.length + 1, WORD_TURNS_EACH * 2)}/${WORD_TURNS_EACH * 2}`}
        progress={s.plays.length / (WORD_TURNS_EACH * 2)}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PartnerMark who={me.role} size={12} />
          <span className="text-base font-medium">You</span>
          <span className="mono text-[28px]">{my}</span>
        </div>
        {game.status === "finished" ? (
          <span className="text-faint text-xs">Final</span>
        ) : myTurn ? (
          <span className="bg-accent text-on-accent rounded-full px-3 py-1.5 text-[13px] font-bold">
            Your turn
          </span>
        ) : (
          <span className="border-line text-muted rounded-full border px-3 py-1.5 text-[13px] font-medium">
            Their turn
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="mono text-[28px]">{their}</span>
          <span className="text-base font-medium">{partner.name}</span>
          <PartnerMark who={partner.role} size={12} />
        </div>
      </div>
      <div
        className="grid w-full max-w-[400px] grid-cols-4 gap-2 self-center"
        role="grid"
        aria-label="Letter board"
      >
        {s.board.map((t, i) => {
          const on = path.includes(i);
          const canTap =
            myTurn && !on && (path.length === 0 || adjacent(path[path.length - 1]!, i));
          return (
            <button
              key={i}
              type="button"
              disabled={!myTurn}
              onClick={() =>
                on && path[path.length - 1] === i
                  ? setPath(path.slice(0, -1))
                  : canTap
                    ? setPath([...path, i])
                    : undefined
              }
              aria-pressed={on}
              aria-label={`${t}${on ? `, letter ${path.indexOf(i) + 1}` : ""}`}
              className="flap mono rounded-flap flex aspect-square cursor-pointer items-center justify-center text-[28px] disabled:cursor-default"
              style={{
                border: on ? "2px solid var(--accent)" : "1px solid var(--line)",
                color: on
                  ? "var(--accent)"
                  : canTap || !myTurn
                    ? "var(--text)"
                    : "var(--text-faint)",
              }}
            >
              {t === "QU" ? "Qu" : t}
            </button>
          );
        })}
      </div>
      {myTurn && (
        <div className="flex items-center gap-2">
          <div
            className="mono rounded-input border-line bg-s2 flex h-[52px] flex-1 items-center border px-4 text-xl uppercase"
            aria-live="polite"
          >
            {word || <span className="text-faint text-sm normal-case">Tap touching letters</span>}
            {word.length >= 3 && (
              <span className="text-muted ml-auto text-sm normal-case">+{wordPoints(word)}</span>
            )}
          </div>
          <IconButton
            label="Remove last letter"
            dim={52}
            onClick={() => setPath(path.slice(0, -1))}
          >
            <Backspace size={20} />
          </IconButton>
        </div>
      )}
      {myTurn && (
        <div className="grid grid-cols-[2fr_1fr] gap-2">
          <Button loading={busy} disabled={word.length < 3} onClick={() => play(false)}>
            Play {word ? word.toUpperCase() : "word"}
          </Button>
          <Button variant="secondary" loading={busy} onClick={() => play(true)}>
            Pass
          </Button>
        </div>
      )}
      {!myTurn && game.status === "active" && (
        <p className="text-muted m-0 text-center text-sm">
          We&apos;ll ping you when it&apos;s your turn. It can wait days.
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {[...s.plays]
          .reverse()
          .slice(0, 12)
          .map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <PartnerMark who={p.by === me.id ? me.role : partner.role} />
              <span className="text-muted flex-1">{p.by === me.id ? "You" : partner.name}</span>
              <span className="mono">{p.word ? p.word.toUpperCase() : "pass"}</span>
              <span className="mono text-muted w-8 text-right">+{p.points}</span>
            </div>
          ))}
      </div>
      {game.status === "finished" && (
        <div className="flex flex-col gap-2">
          <FinalScore game={game} mine={my} theirs={their} />
          <Button
            onClick={async () => {
              const id = await startGame("word").catch(() => null);
              if (id) router.push(`/play/word/${id}`);
            }}
          >
            New board
          </Button>
          <BackToLobby />
        </div>
      )}
    </>
  );
}

/* PLAY-07 Story builder */
export function StoryRoom({ game }: { game: GameRow }) {
  const { me, partner } = useCouple();
  const router = useRouter();
  const s = game.state as StoryState;
  const [line, setLine] = useState("");
  // A forfeit finishes the game without the story's own "The end".
  const ended = s.ended || game.status === "finished";
  const myTurn = s.turn === me.id && !ended;
  const all = useMemo(() => [{ by: "", text: s.starter }, ...s.lines], [s]);

  async function exportCard() {
    const w = 1080;
    const pad = 80;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    const ctx = canvas.getContext("2d")!;
    await document.fonts.ready;
    const body = getComputedStyle(document.body).fontFamily;
    const display =
      getComputedStyle(document.documentElement).getPropertyValue("--font-cabinet") || "sans-serif";
    ctx.font = `400 36px ${body}`;
    const wrap = (t: string) => {
      const words = t.split(" ");
      const out: string[] = [];
      let cur = "";
      for (const wd of words) {
        const next = cur ? `${cur} ${wd}` : wd;
        if (ctx.measureText(next).width > w - pad * 2) {
          out.push(cur);
          cur = wd;
        } else cur = next;
      }
      if (cur) out.push(cur);
      return out;
    };
    const lines = all.flatMap((l) => wrap(l.text).map((t) => ({ t, by: l.by })));
    canvas.height = Math.max(1080, pad * 3 + 120 + lines.length * 54);
    ctx.fillStyle = "#120C10";
    ctx.fillRect(0, 0, w, canvas.height);
    ctx.fillStyle = "#FBF3F6";
    ctx.font = `800 64px ${display}, sans-serif`;
    ctx.fillText("our story", pad, pad + 40);
    ctx.font = `400 36px ${body}`;
    lines.forEach((l, i) => {
      ctx.fillStyle = l.by === "" ? "#BBA9B3" : l.by === me.id ? "#FF4F7B" : "#B9A4FF";
      ctx.fillText(l.t, pad, pad + 150 + i * 54);
    });
    ctx.fillStyle = "#7C7581";
    ctx.font = `500 28px ${body}`;
    ctx.fillText(`${me.name} and ${partner.name} · clink`, pad, canvas.height - pad);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], "our-story.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }))
      await navigator.share({ files: [file] }).catch(() => undefined);
    else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "our-story.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  }

  return (
    <>
      <RoomHeader
        type="story"
        counter={`${s.lines.length}/${STORY_MAX_LINES}`}
        progress={s.lines.length / STORY_MAX_LINES}
      />
      <div className="rounded-card border-line bg-s1 flex flex-col gap-3 border p-5">
        {all.map((l, i) => (
          <p
            key={i}
            className="m-0 flex gap-2.5 text-lg leading-[1.5]"
            style={{ color: l.by === "" ? "var(--text-muted)" : "var(--text)" }}
          >
            {l.by && (
              <span className="mt-2">
                <PartnerMark who={l.by === me.id ? me.role : partner.role} />
              </span>
            )}
            <span>{l.text}</span>
          </p>
        ))}
      </div>
      {myTurn ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await sendMove(game.id, { line })) setLine("");
          }}
        >
          <input
            aria-label="Your line"
            placeholder="Your line. Keep it going."
            value={line}
            maxLength={160}
            onChange={(e) => setLine(e.target.value)}
            className="rounded-input border-line bg-s2 text-text focus:border-accent h-[52px] border px-4 text-base outline-none"
          />
          <div className="grid grid-cols-[2fr_1fr] gap-2">
            <Button type="submit" disabled={line.trim().length < 2}>
              Add my line
            </Button>
            <Button
              variant="secondary"
              disabled={s.lines.length < 4}
              onClick={() => sendMove(game.id, { end: true })}
            >
              The end
            </Button>
          </div>
        </form>
      ) : ended ? (
        <div className="flex flex-col gap-2">
          <div className="display text-[28px]">The end.</div>
          <ForfeitNote game={game} />
          <Button onClick={exportCard}>
            <DownloadSimple size={20} aria-hidden /> Save as an image
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={async () => {
              const id = await startGame("story").catch(() => null);
              if (id) router.push(`/play/story/${id}`);
            }}
          >
            Start another
          </Button>
          <BackToLobby />
        </div>
      ) : (
        <p className="text-muted m-0 text-center text-sm">
          {partner.name}&apos;s line. We&apos;ll ping you.
        </p>
      )}
      {!ended && (
        <button
          type="button"
          onClick={() => exportCard().catch(() => toast.err("Couldn't make the image."))}
          className="text-accent cursor-pointer self-center bg-transparent text-sm font-medium"
        >
          Save the story so far as an image
        </button>
      )}
    </>
  );
}
