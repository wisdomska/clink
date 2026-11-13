"use client";

/* Minimal typings for the YouTube IFrame Player API. */
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  loadVideoById(id: string, start?: number): void;
  cueVideoById(id: string, start?: number): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; BUFFERING: number; ENDED: number; CUED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YTNamespace> | null = null;

export function loadYouTube(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return loading;
}

export const DRIFT_LIMIT = 0.5; // seconds (spec: watch party drift under 500 ms)

/** Where the leader's playhead should be now, given a state message. Pure, unit-tested. */
export function expectedPosition(msg: { playing: boolean; position: number; sentAt: number }, now: number): number {
  return msg.position + (msg.playing ? Math.max(0, now - msg.sentAt) / 1000 : 0);
}
