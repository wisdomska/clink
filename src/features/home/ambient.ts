"use client";
import { useEffect, useRef, useState } from "react";

/** Optional ambient sound for "Just be here": a soft brown-noise bed made with Web Audio (no asset). */
export function useAmbient() {
  const [on, setOn] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!on) {
      void ctx.current?.close();
      ctx.current = null;
      return;
    }
    const ac = new AudioContext();
    ctx.current = ac;
    const len = ac.sampleRate * 4;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ac.createGain();
    gain.gain.value = 0.12;
    src.connect(gain).connect(ac.destination);
    src.start();
    return () => {
      void ac.close();
    };
  }, [on]);
  return { on, toggle: (v: boolean) => setOn(v) };
}
