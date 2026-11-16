/**
 * Listen together: keeping a Spotify embed in step between two devices.
 *
 * The Spotify iFrame API (https://developer.spotify.com/documentation/embeds/references/iframe-api)
 * gives an EmbedController with play/pause/resume/seek and a `playback_update`
 * event. `SpotifySync` holds the sync rules on top of a small adapter so they can
 * be unit-tested without the real iframe:
 * - local play, pause and seek are broadcast as a SpotifyState;
 * - a remote state is mirrored (seek to the position plus elapsed time, then play or pause);
 * - updates caused by applying a remote state are not echoed back for ECHO_MS;
 * - the playhead is only re-seeked when it is more than DRIFT_S away;
 * - the end of the track fires onEnded once, so the queue can move on.
 */

/** The bits of the Spotify EmbedController that sync needs. */
export interface SpotifyAdapter {
  play(): void;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
}

/** `playback_update` event data from the Spotify embed (times in milliseconds). */
export interface PlaybackUpdate {
  isPaused: boolean;
  position: number;
  duration: number;
}

/** What goes over the couple channel. `position` in seconds, `sentAt` in epoch ms. */
export interface SpotifyState {
  track: string;
  position: number;
  paused: boolean;
  sentAt: number;
}

export const SPOTIFY_STATE_EVENT = "listen.spotify.state";
export const SPOTIFY_JOIN_EVENT = "listen.spotify.join";
/** Ignore our own player's updates this long after applying a partner's state. */
export const ECHO_MS = 800;
/** Re-seek only when the two playheads are further apart than this. */
export const DRIFT_S = 2;
/** A position jump bigger than this between two updates counts as a seek. */
const SEEK_JUMP_S = 1.5;
/** How close to the end (ms) counts as "finished". */
const END_SLACK_MS = 1500;

/** Narrow an untyped broadcast payload to a SpotifyState, or null. */
export function readSpotifyState(p: Record<string, unknown>): SpotifyState | null {
  const position = Number(p.position);
  const sentAt = Number(p.sentAt);
  if (typeof p.track !== "string" || !Number.isFinite(position) || !Number.isFinite(sentAt)) {
    return null;
  }
  return { track: p.track, position: Math.max(0, position), paused: Boolean(p.paused), sentAt };
}

/** Where the sender's playhead should be at `now` (seconds). */
export function remoteTarget(s: SpotifyState, now: number): number {
  return s.position + (s.paused ? 0 : Math.max(0, now - s.sentAt) / 1000);
}

interface Local {
  position: number; // seconds
  duration: number; // seconds, 0 when unknown
  paused: boolean;
  at: number; // epoch ms the reading was taken
}

export interface SpotifySyncOptions {
  adapter: SpotifyAdapter;
  /** The Spotify URI both sides should be playing. */
  track: string;
  send: (s: SpotifyState) => void;
  onEnded?: () => void;
  now?: () => number;
}

export class SpotifySync {
  private readonly adapter: SpotifyAdapter;
  private readonly track: string;
  private readonly send: (s: SpotifyState) => void;
  private readonly onEnded?: () => void;
  private readonly now: () => number;
  private local: Local | null = null;
  private started = false;
  private ended = false;
  private suppressUntil = 0;
  private lastRemoteSentAt = 0;

  constructor(o: SpotifySyncOptions) {
    this.adapter = o.adapter;
    this.track = o.track;
    this.send = o.send;
    this.onEnded = o.onEnded;
    this.now = o.now ?? Date.now;
  }

  /** Our best guess of the local playhead right now (seconds). */
  position(at = this.now()): number {
    const l = this.local;
    if (!l) return 0;
    const p = l.position + (l.paused ? 0 : Math.max(0, at - l.at) / 1000);
    return l.duration > 0 ? Math.min(p, l.duration) : p;
  }

  get paused(): boolean {
    return this.local?.paused ?? true;
  }

  /** True while updates from our own player are being ignored after a remote apply. */
  suppressed(at = this.now()): boolean {
    return at < this.suppressUntil;
  }

  /** The current local state as a message. */
  snapshot(): SpotifyState {
    const at = this.now();
    return { track: this.track, position: this.position(at), paused: this.paused, sentAt: at };
  }

  /** Feed every `playback_update` from the embed here. Returns the state it broadcast, if any. */
  onLocalUpdate(u: PlaybackUpdate): SpotifyState | null {
    const at = this.now();
    const prev = this.local;
    const next: Local = {
      position: Math.max(0, u.position) / 1000,
      duration: Math.max(0, u.duration) / 1000,
      paused: u.isPaused,
      at,
    };
    if (!u.isPaused) this.started = true;
    this.local = next;

    // End of track: paused at (or snapped back to 0 from) the very end.
    if (!this.ended && this.started && prev && u.isPaused && u.duration > 0) {
      const atEnd = u.position >= u.duration - END_SLACK_MS;
      const wrapped =
        !prev.paused &&
        prev.duration > 0 &&
        prev.position >= prev.duration - END_SLACK_MS / 1000 &&
        u.position < 1000;
      if (atEnd || wrapped) {
        this.ended = true;
        this.onEnded?.();
        return null;
      }
    }
    if (!u.isPaused) this.ended = false;

    // The first reading is just the embed waking up; nothing to share yet.
    if (!prev) return null;
    if (this.suppressed(at)) return null;

    const expected = prev.position + (prev.paused ? 0 : (at - prev.at) / 1000);
    const toggled = prev.paused !== next.paused;
    const jumped = Math.abs(next.position - expected) > SEEK_JUMP_S;
    if (!toggled && !jumped) return null;
    const msg: SpotifyState = {
      track: this.track,
      position: next.position,
      paused: next.paused,
      sentAt: at,
    };
    this.send(msg);
    return msg;
  }

  /**
   * Mirror the partner's state. Returns the drift (seconds) before correcting,
   * or null when the message was ignored (other track, or older than one already applied).
   */
  applyRemote(s: SpotifyState): { drift: number; seeked: boolean } | null {
    if (s.track !== this.track) return null;
    if (s.sentAt <= this.lastRemoteSentAt) return null;
    this.lastRemoteSentAt = s.sentAt;
    const at = this.now();
    let target = remoteTarget(s, at);
    const dur = this.local?.duration ?? 0;
    if (dur > 0) target = Math.min(target, dur);
    const drift = Math.abs(target - this.position(at));
    const wasPaused = this.paused;
    this.suppressUntil = at + ECHO_MS;

    if (!s.paused && wasPaused) {
      if (this.started) this.adapter.resume();
      else this.adapter.play();
      this.started = true;
    } else if (s.paused && !wasPaused) {
      this.adapter.pause();
    }
    const seeked = drift > DRIFT_S;
    if (seeked) this.adapter.seek(target);

    // Assume the player now matches; real updates will overwrite this.
    this.local = {
      position: seeked ? target : this.position(at),
      duration: dur,
      paused: s.paused,
      at,
    };
    return { drift, seeked };
  }
}
