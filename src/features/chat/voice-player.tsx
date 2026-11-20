"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Play, Pause, DownloadSimple, SpeakerSlash } from "@phosphor-icons/react";

const SPEEDS = [1, 1.5, 2] as const;
const BARS = 30;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * CHAT-02 playback. The waveform fills as it plays.
 * 1x / 1.5x / 2x. Fixed width so nothing ever spills past the bubble.
 */
export function VoicePlayer({
  src,
  duration,
  waveform,
  mine,
}: {
  src: string;
  duration: number;
  waveform: number[] | null;
  mine: boolean;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [meta, setMeta] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  // Recorded in a format this browser can't play (e.g. an iPhone note on a
  // browser without AAC): say so and offer the file, instead of a dead button.
  const [unplayable, setUnplayable] = useState(false);
  const retried = useRef(false);
  const play = () => {
    const el = audio.current;
    if (!el) return;
    el.play().catch((e: unknown) => {
      if (!(e instanceof DOMException && e.name === "NotSupportedError")) return;
      giveUpOrRetry();
    });
  };
  // A one-off load failure gets a fresh try before we say it can't play.
  function giveUpOrRetry() {
    const el = audio.current;
    if (!el || retried.current) return setUnplayable(true);
    retried.current = true;
    el.load();
    el.play().catch(() => setUnplayable(true));
  }
  const raw =
    waveform && waveform.length
      ? waveform
      : Array.from(
          { length: BARS },
          (_, i) => [8, 14, 22, 12, 26, 18, 10, 24, 30, 16][i % 10]! * 3,
        );
  // Resample to a fixed bar count so every note looks consistent.
  const bars = Array.from(
    { length: BARS },
    (_, i) => raw[Math.floor((i / BARS) * raw.length)] ?? 20,
  );

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
  }, [speed]);

  // Smooth progress (timeupdate only fires ~4 times a second).
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      if (audio.current) setT(audio.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const total = duration || meta;
  const progress = total ? Math.min(1, t / total) : 0;
  const head = Math.floor(progress * BARS);

  return (
    <div
      className="flex w-[min(80vw,320px)] items-center gap-2 py-1.5 pr-1 pl-2"
      style={{
        borderRadius: mine ? "var(--r-bubble-out)" : "var(--r-bubble-in)",
        background: mine ? "var(--surface-3)" : "var(--surface-1)",
        border: mine ? "none" : "1px solid var(--line)",
      }}
    >
      <audio
        ref={audio}
        src={src}
        preload="none"
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setMeta(d);
        }}
        onEnded={() => {
          setPlaying(false);
          setT(0);
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      {unplayable ? (
        <div className="flex min-w-0 flex-1 items-center gap-2" role="status">
          <SpeakerSlash size={20} className="text-muted flex-none" aria-hidden />
          <span className="text-muted min-w-0 flex-1 text-sm leading-tight">
            This voice note can&apos;t play on this device.
          </span>
          <a
            href={src}
            download
            aria-label="Download voice note"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="text-accent flex h-10 w-10 flex-none items-center justify-center rounded-full"
          >
            <DownloadSimple size={20} />
          </a>
        </div>
      ) : (
        <>
          <motion.button
            type="button"
            aria-label={playing ? "Pause voice note" : "Play voice note"}
            onClick={() => (playing ? audio.current?.pause() : play())}
            whileTap={{ scale: 0.97 }}
            className="bg-accent text-on-accent flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border-0"
          >
            {playing ? (
              <Pause size={17} weight="fill" />
            ) : (
              <Play size={17} weight="fill" className="ml-0.5" />
            )}
          </motion.button>
          <button
            type="button"
            aria-label="Seek"
            onClick={(e) => {
              const el = audio.current;
              if (!el || !total) return;
              const b = e.currentTarget.getBoundingClientRect();
              el.currentTime = ((e.clientX - b.left) / b.width) * total;
              setT(el.currentTime);
              if (!playing) play();
            }}
            className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-[2px] border-0 bg-transparent p-0"
          >
            {bars.map((h, i) => {
              const base = Math.max(4, Math.round((h / 100) * 28));
              const played = i < head;
              return (
                <span
                  key={i}
                  className="block min-w-[2px] flex-1 rounded-full transition-colors duration-150"
                  style={{
                    height: base,
                    backgroundColor:
                      played || (playing && i === head) ? "var(--accent)" : "var(--text-faint)",
                  }}
                />
              );
            })}
          </button>
          <span className="mono text-muted w-9 flex-none text-right text-[11px]">
            {fmt(playing || t ? t : total)}
          </span>
          <button
            type="button"
            aria-label={`Playback speed ${speed}x. Tap to change`}
            onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!)}
            className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0"
          >
            <span className="mono bg-s2 text-text flex h-7 min-w-9 items-center justify-center rounded-full px-1.5 text-xs font-bold">
              {speed}x
            </span>
          </button>
        </>
      )}
    </div>
  );
}
