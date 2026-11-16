#!/usr/bin/env node
// Renders the onboarding characters (Quaternius, CC0) to animated WebP loops.
//
//   node scripts/render-characters.mjs --src <quaternius dir>            all characters x poses
//   node scripts/render-characters.mjs --src <dir> --only ama --pose wave
//   node scripts/render-characters.mjs --src <dir> --preview <out dir> --only ama --pose wave,kiss   PNG frames only
//   node scripts/render-characters.mjs --src <dir> --preview <dir> --only ama --pose wave --at --size 360 --cam '{"dist":1.1}'   close-up still
//   node scripts/render-characters.mjs --sheet <out.png>                  contact sheet from public/characters
//
// <quaternius dir> holds the unzipped packs in these sub folders:
//   ubc/      Universal Base Characters[Standard]
//   outfits/  Modular Character Outfits - Fantasy[Standard]
//   ual/      Universal Animation Library[Standard]
//   ual2/     Universal Animation Library 2[Standard]
// Downloads: https://quaternius.com (see public/characters/CREDITS.md).
//
// Rendering runs three.js in headless Chromium (Playwright); files are served
// through request routing, so no local server is started.
import { createRequire } from "node:module";
import sharp from "sharp";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Prefer a standalone playwright (its bundled browser) and fall back to the
// repo's @playwright/test.
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  for (const id of ["playwright", "@playwright/test"]) {
    try {
      return require(id);
    } catch {}
  }
  throw new Error("playwright is not installed");
})();

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const OUT = path.join(repo, "public/characters");

const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};

// Warm palette tuned for the dark plum UI. Ramps are dark -> mid -> light.
export const CHARACTERS = {
  ama: {
    gender: "female",
    skin: "#a8714f",
    hair: ["Hair_Long"],
    hairRamp: ["#0c0707", "#21130f", "#4a3026"],
    outfitRamp: ["#4a1426", "#e0577f", "#ffd3de"],
  },
  esi: {
    gender: "female",
    skin: "#6e4330",
    hair: ["Hair_Buns"],
    hairRamp: ["#140608", "#3e1118", "#6e2a33"],
    outfitRamp: ["#2a1d45", "#9d86e0", "#f1ebff"],
  },
  akosua: {
    gender: "female",
    skin: "#8f5d40",
    hair: ["Hair_BuzzedFemale"],
    hairRamp: ["#080606", "#15100e", "#2c221d"],
    outfitRamp: ["#4a2c0a", "#e8a93a", "#fff0c9"],
  },
  kwame: {
    gender: "male",
    skin: "#7c4f36",
    hair: ["Hair_Buzzed", "Hair_Beard"],
    hairRamp: ["#080606", "#16100e", "#2e231e"],
    outfitRamp: ["#4a170c", "#d9653e", "#ffd9c4"],
  },
  kofi: {
    gender: "male",
    skin: "#5a3626",
    hair: ["Hair_Buzzed"],
    hairRamp: ["#060404", "#120c0a", "#261b17"],
    outfitRamp: ["#3d3022", "#d9c6a8", "#fffaf0"],
  },
  yaw: {
    gender: "male",
    skin: "#9a6646",
    hair: ["Hair_SimpleParted", "Hair_Beard"],
    hairRamp: ["#0a0706", "#1d1411", "#3a2b24"],
    outfitRamp: ["#13302b", "#4f9e86", "#e3f6ee"],
  },
};
export const POSES = [
  "wave",
  "kiss",
  "heart",
  "think",
  "laugh",
  "peace",
  "shocked",
  "thumbs",
  "wink",
  "sleepy",
  "idle",
];

const SIZE = Number(arg("--size", 240));
const SS = 2; // supersample, then downscale with lanczos
const FRAMES = Number(arg("--frames", 24));
// Loop length in seconds per pose (the idle base clip is time-scaled to fit).
const LOOP_SECONDS = {
  wave: 1.8,
  kiss: 2.4,
  heart: 2.4,
  think: 2.6,
  laugh: 2.0,
  peace: 2.0,
  shocked: 2.0,
  thumbs: 2.0,
  wink: 2.2,
  sleepy: 2.8,
  idle: 2.6,
};
// Poster frame (out of FRAMES) that reads best as a still.
const POSTER_AT = {
  wave: 0.08,
  kiss: 0.68,
  heart: 0.3,
  think: 0.25,
  laugh: 0.25,
  peace: 0,
  shocked: 0,
  thumbs: 0.25,
  wink: 0.45,
  sleepy: 0.25,
  idle: 0,
};
const BYTES_MAX = 150 * 1024;

const TYPES = {
  js: "text/javascript",
  gltf: "model/gltf+json",
  glb: "model/gltf-binary",
  bin: "application/octet-stream",
  png: "image/png",
  jpg: "image/jpeg",
};

// One Chromium for the whole run; one page per render, closed afterwards.
let browserP;
function browser() {
  browserP ??= chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  return browserP;
}

async function openPage(src) {
  const page = await (
    await browser()
  ).newPage({ viewport: { width: SIZE * SS, height: SIZE * SS } });
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[page]", m.text());
  });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.route("http://render.local/**", async (route) => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    if (p === "/") {
      return route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><body style="margin:0;background:transparent">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">import * as S from "/scene.js"; window.S = S; window.ready = true;</script></body></html>`,
      });
    }
    let file;
    let base;
    if (p === "/scene.js") [file, base] = [path.join(here, "render-characters.scene.js"), here];
    else if (p.startsWith("/three/"))
      [file, base] = [path.join(repo, "node_modules", p), path.join(repo, "node_modules/three")];
    else if (p.startsWith("/src/")) [file, base] = [path.join(src, p.slice(5)), src];
    if (!file || path.relative(base, file).startsWith("..")) return route.fulfill({ status: 404 });
    try {
      return route.fulfill({
        body: await readFile(file),
        contentType: TYPES[path.extname(file).slice(1)] || "application/octet-stream",
      });
    } catch {
      return route.fulfill({ status: 404 });
    }
  });
  await page.goto("http://render.local/");
  await page.waitForFunction("window.ready === true");
  return page;
}

// Soften the bottom edge so the bust crop dissolves into the UI.
let fadeMask;
async function fade(png) {
  fadeMask ??= Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.8" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );
  return sharp(png)
    .composite([{ input: fadeMask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function renderFrames(src, name, pose, n, phases) {
  const page = await openPage(src);
  try {
    await page.evaluate((cfg) => window.S.setup(cfg), {
      width: SIZE * SS,
      height: SIZE * SS,
      character: CHARACTERS[name],
      fov: 20,
      ...JSON.parse(arg("--cam", "{}")),
    });
    const frames = [];
    for (let i = 0; i < n; i++) {
      const url = await page.evaluate(
        ([pz, p]) => window.S.frame(pz, p),
        [pose, phases ? phases[i] : i / n],
      );
      const png = Buffer.from(url.split(",")[1], "base64");
      frames.push(
        await fade(await sharp(png).resize(SIZE, SIZE, { kernel: "lanczos3" }).png().toBuffer()),
      );
    }
    return frames;
  } finally {
    await page.close();
  }
}

async function encodeWebp(frames, file, seconds) {
  // Stack the frames into one tall image; sharp splits it by pageHeight.
  const strip = await sharp({
    create: {
      width: SIZE,
      height: SIZE * frames.length,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(frames.map((f, i) => ({ input: f, top: i * SIZE, left: 0 })))
    .raw()
    .toBuffer();
  const delay = Array(frames.length).fill(Math.round((seconds * 1000) / frames.length));
  // Highest quality that fits the budget (effort 4: minSize/mixed cost
  // minutes per loop for a few percent).
  let q = Number(arg("--quality", 80));
  let buf;
  for (; q >= 30; q -= 5) {
    buf = await sharp(strip, {
      raw: { width: SIZE, height: SIZE * frames.length, channels: 4, pageHeight: SIZE },
    })
      .webp({ quality: q, alphaQuality: 50, effort: 4, loop: 0, delay })
      .toBuffer();
    if (buf.length <= BYTES_MAX) break;
  }
  await writeFile(file, buf);
  return { q, size: buf.length };
}

async function renderAll(src, only, onlyPose) {
  await mkdir(OUT, { recursive: true });
  for (const name of Object.keys(CHARACTERS)) {
    if (only && name !== only) continue;
    for (const pose of POSES) {
      if (onlyPose && pose !== onlyPose) continue;
      const frames = await renderFrames(src, name, pose, FRAMES);
      const file = path.join(OUT, `${name}-${pose}.webp`);
      const { q, size } = await encodeWebp(frames, file, LOOP_SECONDS[pose]);
      const poster = path.join(OUT, `${name}-${pose}-poster.webp`);
      await sharp(frames[Math.round((POSTER_AT[pose] ?? 0) * FRAMES) % FRAMES])
        .webp({ quality: 84, alphaQuality: 85, effort: 6 })
        .toFile(poster);
      const psize = (await stat(poster)).size;
      console.log(
        `${name}-${pose}.webp ${(size / 1024).toFixed(1)} KB (q${q}), poster ${(psize / 1024).toFixed(1)} KB`,
      );
    }
  }
}

async function sheet(outFile) {
  const cell = 168;
  const pad = 8;
  const label = 26;
  const left = 74;
  const names = Object.keys(CHARACTERS);
  const W = left + pad + POSES.length * (cell + pad);
  const H = label + pad + names.length * (cell + pad);
  const comps = [];
  const text = (t, x, y, w, anchor = "middle") => ({
    input: Buffer.from(
      `<svg width="${w}" height="${label}" xmlns="http://www.w3.org/2000/svg"><text x="${anchor === "middle" ? w / 2 : 6}" y="18" font-family="sans-serif" font-size="14" fill="#f3e6ec" text-anchor="${anchor}">${t}</text></svg>`,
    ),
    left: x,
    top: y,
  });
  POSES.forEach((p, j) => comps.push(text(p, left + pad + j * (cell + pad), 0, cell)));
  for (const [i, n] of names.entries()) {
    comps.push(text(n, 0, label + pad + i * (cell + pad) + cell / 2 - 13, left, "start"));
    for (const [j, p] of POSES.entries()) {
      const x = left + pad + j * (cell + pad);
      const y = label + pad + i * (cell + pad);
      comps.push({
        input: Buffer.from(
          `<svg width="${cell}" height="${cell}"><rect x="0.5" y="0.5" width="${cell - 1}" height="${cell - 1}" rx="16" fill="#1b1318" stroke="#3d2c36"/></svg>`,
        ),
        left: x,
        top: y,
      });
      try {
        comps.push({
          input: await sharp(path.join(OUT, `${n}-${p}-poster.webp`))
            .resize(cell, cell)
            .png()
            .toBuffer(),
          left: x,
          top: y,
        });
      } catch {
        // missing render: leave the empty tile
      }
    }
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: "#120c10" } })
    .composite(comps)
    .png()
    .toFile(outFile);
  console.log("sheet", outFile);
}

const src = arg("--src");
try {
  if (args.includes("--sheet")) {
    await sheet(path.resolve(arg("--sheet")));
  } else if (!src) {
    console.error(
      "Usage: node scripts/render-characters.mjs --src <quaternius dir> [--only name] [--pose pose] [--preview dir]",
    );
    process.exitCode = 1;
  } else if (args.includes("--preview")) {
    // quick look: a few PNG frames per pose for one character
    const dir = path.resolve(arg("--preview"));
    await mkdir(dir, { recursive: true });
    const name = arg("--only", "ama");
    for (const pose of arg("--pose", "idle").split(",")) {
      // --at poster: one frame at the pose's poster phase
      const at = args.includes("--at") ? [POSTER_AT[pose] ?? 0] : null;
      const frames = await renderFrames(
        path.resolve(src),
        name,
        pose,
        at ? 1 : Number(arg("--frames", 6)),
        at,
      );
      for (const [i, f] of frames.entries())
        await writeFile(path.join(dir, `${name}-${pose}-${i}.png`), f);
    }
    console.log("preview frames in", dir);
  } else {
    await renderAll(path.resolve(src), arg("--only"), arg("--pose"));
  }
} finally {
  if (browserP) await (await browserP).close();
}
