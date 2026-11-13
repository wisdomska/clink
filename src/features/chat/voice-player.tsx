"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "@phosphor-icons/react";

const SPEEDS = [1, 1.5, 2] as const;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** CHAT-02 playback: waveform, 1x / 1.5x / 2x. */
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
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const bars =
    waveform && waveform.length
      ? waveform
      : Array.from({ length: 28 }, (_, i) => [8, 14, 22, 12, 26, 18, 10, 24, 30, 16][i % 10]! * 3);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
  }, [speed]);

  const progress = duration ? t / duration : 0;
  return (
    <div
      className="flex w-[78%] max-w-[360px] items-center gap-2.5 px-3 py-2.5"
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
        onEnded={() => {
          setPlaying(false);
          setT(0);
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <button
        type="button"
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        onClick={() => (playing ? audio.current?.pause() : void audio.current?.play())}
        className="press bg-accent text-on-accent flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border-0"
      >
        {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
      </button>
      <div className="flex h-8 flex-1 items-center gap-0.5" aria-hidden>
        {bars.slice(0, 28).map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(8, Math.round((h / 100) * 30))}px`,
              background: i / bars.length < progress ? "var(--accent)" : "var(--text-muted)",
            }}
          />
        ))}
      </div>
      <span className="mono text-muted text-xs">{fmt(playing || t ? t : duration)}</span>
      <button
        type="button"
        aria-label={`Playback speed ${speed}x`}
        onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!)}
        className="mono border-line-strong text-muted cursor-pointer rounded-full border bg-transparent px-1.5 py-0.5 text-[11px]"
      >
        {speed}x
      </button>
    </div>
  );
}
