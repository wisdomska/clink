import { describe, expect, it, vi } from "vitest";
import {
  DRIFT_S,
  ECHO_MS,
  SpotifySync,
  readSpotifyState,
  remoteTarget,
  type SpotifyAdapter,
  type SpotifyState,
} from "@/features/plans/spotify-sync";
import { isSpotifySyncable, spotifyUri } from "@/features/plans/music-link";

const TRACK = "spotify:track:4cOdK2wGLETKBW3PvgPWqT";

function setup(start = 1_000_000) {
  let t = start;
  const adapter: SpotifyAdapter = {
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    seek: vi.fn(),
  };
  const sent: SpotifyState[] = [];
  const onEnded = vi.fn();
  const sync = new SpotifySync({
    adapter,
    track: TRACK,
    send: (s) => sent.push(s),
    onEnded,
    now: () => t,
  });
  return {
    adapter,
    sent,
    onEnded,
    sync,
    tick: (ms: number) => (t += ms),
    now: () => t,
  };
}

const upd = (isPaused: boolean, positionS: number, durationS = 200) => ({
  isPaused,
  position: positionS * 1000,
  duration: durationS * 1000,
});

describe("spotify sync", () => {
  it("broadcasts local play, pause and seek, but not steady progress", () => {
    const { sync, sent, tick, now } = setup();
    sync.onLocalUpdate(upd(true, 0)); // embed ready
    expect(sent).toHaveLength(0);
    tick(500);
    sync.onLocalUpdate(upd(false, 0)); // pressed play
    expect(sent).toEqual([{ track: TRACK, position: 0, paused: false, sentAt: now() }]);
    tick(1000);
    sync.onLocalUpdate(upd(false, 1)); // normal progress
    expect(sent).toHaveLength(1);
    tick(1000);
    sync.onLocalUpdate(upd(false, 60)); // seeked ahead
    expect(sent).toHaveLength(2);
    expect(sent[1]!.position).toBe(60);
    tick(500);
    sync.onLocalUpdate(upd(true, 60.5)); // paused
    expect(sent[2]).toMatchObject({ paused: true, position: 60.5 });
  });

  it("applies a remote state with elapsed time, then suppresses the echo", () => {
    const { sync, sent, adapter, tick, now } = setup();
    sync.onLocalUpdate(upd(true, 0));
    const r = sync.applyRemote({ track: TRACK, position: 30, paused: false, sentAt: now() - 1000 });
    expect(r?.seeked).toBe(true);
    expect(adapter.play).toHaveBeenCalledOnce();
    expect(adapter.seek).toHaveBeenCalledWith(31);
    // The player reports the change it was told to make: not sent back.
    tick(300);
    sync.onLocalUpdate(upd(false, 31.3));
    tick(ECHO_MS - 400);
    sync.onLocalUpdate(upd(true, 31.7));
    expect(sent).toHaveLength(0);
    // After the window, a real local change is shared again.
    tick(500);
    sync.onLocalUpdate(upd(false, 31.7));
    expect(sent).toHaveLength(1);
  });

  it("only re-seeks when drift passes the threshold", () => {
    const { sync, adapter, tick, now } = setup();
    sync.onLocalUpdate(upd(true, 0));
    tick(100);
    sync.onLocalUpdate(upd(false, 0));
    tick(10_000);
    sync.onLocalUpdate(upd(false, 10));
    const small = sync.applyRemote({
      track: TRACK,
      position: 10 + DRIFT_S - 0.5,
      paused: false,
      sentAt: now(),
    });
    expect(small?.seeked).toBe(false);
    expect(adapter.seek).not.toHaveBeenCalled();
    expect(adapter.play).not.toHaveBeenCalled();
    tick(1);
    const big = sync.applyRemote({
      track: TRACK,
      position: 10 + DRIFT_S + 1,
      paused: false,
      sentAt: now(),
    });
    expect(big?.seeked).toBe(true);
    expect(adapter.seek).toHaveBeenCalledOnce();
  });

  it("pauses on a remote pause and resumes on a remote play once started", () => {
    const { sync, adapter, tick, now } = setup();
    sync.onLocalUpdate(upd(true, 0));
    tick(100);
    sync.onLocalUpdate(upd(false, 0));
    tick(5000);
    sync.applyRemote({ track: TRACK, position: 5, paused: true, sentAt: now() });
    expect(adapter.pause).toHaveBeenCalledOnce();
    tick(2000);
    sync.applyRemote({ track: TRACK, position: 5, paused: false, sentAt: now() });
    expect(adapter.resume).toHaveBeenCalledOnce();
    expect(adapter.play).not.toHaveBeenCalled();
  });

  it("ignores other tracks and stale messages", () => {
    const { sync, adapter, now } = setup();
    sync.onLocalUpdate(upd(true, 0));
    expect(
      sync.applyRemote({
        track: "spotify:track:other",
        position: 50,
        paused: false,
        sentAt: now(),
      }),
    ).toBeNull();
    expect(
      sync.applyRemote({ track: TRACK, position: 50, paused: true, sentAt: now() }),
    ).not.toBeNull();
    expect(
      sync.applyRemote({ track: TRACK, position: 90, paused: false, sentAt: now() - 10 }),
    ).toBeNull();
    expect(adapter.play).not.toHaveBeenCalled();
  });

  it("fires onEnded once when the track finishes", () => {
    const { sync, onEnded, sent, tick } = setup();
    sync.onLocalUpdate(upd(true, 0, 30));
    tick(100);
    sync.onLocalUpdate(upd(false, 0, 30));
    tick(29_500);
    sync.onLocalUpdate(upd(false, 29.5, 30));
    tick(500);
    sync.onLocalUpdate(upd(true, 0, 30)); // snapped back to the start
    tick(500);
    sync.onLocalUpdate(upd(true, 0, 30));
    expect(onEnded).toHaveBeenCalledOnce();
    expect(sent.filter((s) => s.paused)).toHaveLength(0);
  });

  it("reads payloads defensively and projects the remote playhead", () => {
    expect(readSpotifyState({ track: 1, position: 2, sentAt: 3 })).toBeNull();
    expect(readSpotifyState({ track: TRACK, position: "x", sentAt: 3 })).toBeNull();
    expect(readSpotifyState({ track: TRACK, position: -4, paused: 1, sentAt: 3 })).toEqual({
      track: TRACK,
      position: 0,
      paused: true,
      sentAt: 3,
    });
    expect(remoteTarget({ track: TRACK, position: 10, paused: false, sentAt: 0 }, 2500)).toBe(12.5);
    expect(remoteTarget({ track: TRACK, position: 10, paused: true, sentAt: 0 }, 2500)).toBe(10);
  });

  it("builds URIs and knows what can be synced", () => {
    expect(spotifyUri("track/4cOdK2wGLETKBW3PvgPWqT")).toBe(TRACK);
    expect(spotifyUri("track/bad")).toBeNull();
    expect(isSpotifySyncable("track/4cOdK2wGLETKBW3PvgPWqT")).toBe(true);
    expect(isSpotifySyncable("episode/4cOdK2wGLETKBW3PvgPWqT")).toBe(true);
    expect(isSpotifySyncable("album/4cOdK2wGLETKBW3PvgPWqT")).toBe(false);
  });
});
