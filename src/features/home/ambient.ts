"use client";
import { useEffect, useRef, useState } from "react";

const LEVEL = 0.022; // a quiet room, not a fan
const SECONDS = 16;
const SEAM = 1.5; // cross-faded so the loop never clicks

/**
 * Optional ambient sound for "Just be here": a soft, warm room tone made with
 * Web Audio (no asset). Brown noise, low-passed so there's no hiss, a slow
 * breathing swell, fading in and out instead of switching on and off.
 */
export function useAmbient() {
  const [on, setOn] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!on) return;
    const ac = new AudioContext();
    ctx.current = ac;
    const rate = ac.sampleRate;
    const len = rate * SECONDS;
    const seam = Math.floor(rate * SEAM);
    const buf = ac.createBuffer(1, len + seam, rate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len + seam; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    // Blend the extra tail into the head so the end flows into the start.
    for (let i = 0; i < seam; i++) {
      const k = i / seam;
      data[i] = data[i]! * k + data[len + i]! * (1 - k);
    }
    const loop = ac.createBuffer(1, len, rate);
    loop.copyToChannel(data.subarray(0, len), 0);

    const src = ac.createBufferSource();
    src.buffer = loop;
    src.loop = true;
    const warm = ac.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 600;
    warm.Q.value = 0.4;
    const gain = ac.createGain();
    const now = ac.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(LEVEL, now + 3);
    // A slow swell, like breathing in a quiet room (about 10 s each way).
    const swell = ac.createOscillator();
    swell.frequency.value = 0.05;
    const depth = ac.createGain();
    depth.gain.value = LEVEL * 0.25;
    swell.connect(depth).connect(gain.gain);
    src.connect(warm).connect(gain).connect(ac.destination);
    src.start();
    swell.start();
    return () => {
      const t = ac.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.6);
      setTimeout(() => void ac.close(), 700);
      if (ctx.current === ac) ctx.current = null;
    };
  }, [on]);
  return { on, toggle: (v: boolean) => setOn(v) };
}
