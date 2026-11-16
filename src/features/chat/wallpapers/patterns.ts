/**
 * Hand-drawn chat wallpapers as tiny inline SVGs. Nothing to download: each one is a
 * few hundred bytes of markup turned into a data URI. All of them sit on a dark base
 * at low contrast so bubbles stay easy to read on top.
 */

/** Wraps SVG markup in a CSS url() data URI. */
export function svgUrl(w: number, h: number, body: string) {
  const markup = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
}

/** A flat colour as an image layer, so it can sit under patterns in one background-image. */
export const flat = (c: string) => `linear-gradient(${c}, ${c})`;

const ROUGE = "#FF4F7B";
const BLUSH = "#FFB3C4";
const LILAC = "#B9A4FF";
const CHAMPAGNE = "#FFD08A";
const MINT = "#5ED3B3";
const PEARL = "#FBF3F6";

/** Small heart centred on (x, y); about 18 units wide at scale 1. */
function heart(x: number, y: number, s: number, attrs: string) {
  return `<path transform='translate(${x} ${y}) scale(${s})' d='M0 7s-9-5.6-9-11.2A4.8 4.8 0 0 1 0-7a4.8 4.8 0 0 1 9 2.8C9 1.4 0 7 0 7z' ${attrs}/>`;
}

function noise(freq: string, alpha: number, rgb = "1 1 1", octaves = 2) {
  const [r, g, b] = rgb.split(" ");
  return `<filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/>`;
}

/** Film grain: fine monochrome noise. */
export const GRAIN = svgUrl(180, 180, noise(".85", 0.11));

/** Darker grain for paper bubbles. */
export const PAPER_GRAIN = svgUrl(160, 160, noise(".9", 0.07, "0.2 0.12 0.05"));

/** Velvet: long vertical nap in wine. */
export const VELVET = svgUrl(220, 220, noise(".012 .45", 0.12, "0.55 0.12 0.26", 3));

/** Risograph: two misregistered halftone screens plus grain. */
export const RISO = svgUrl(
  22,
  22,
  `<circle cx='5' cy='5' r='1.7' fill='${ROUGE}' fill-opacity='.13'/><circle cx='16' cy='16' r='1.7' fill='${ROUGE}' fill-opacity='.13'/><circle cx='7.5' cy='7' r='1.5' fill='${LILAC}' fill-opacity='.1'/><circle cx='18.5' cy='18' r='1.5' fill='${LILAC}' fill-opacity='.1'/>`,
);

/** Terrazzo: scattered stone chips in the brand colours. */
export const TERRAZZO = svgUrl(
  180,
  180,
  [
    [ROUGE, ".16", "14,20 26,14 30,26 18,30"],
    [CHAMPAGNE, ".14", "70,12 80,18 74,26 64,22"],
    [LILAC, ".16", "130,30 146,26 150,40 136,44 128,38"],
    [PEARL, ".09", "40,60 50,56 54,66 44,70"],
    [MINT, ".12", "100,64 112,60 116,72 104,76"],
    [ROUGE, ".12", "156,80 168,84 162,96 150,92"],
    [CHAMPAGNE, ".15", "20,104 32,100 34,112 22,116 16,110"],
    [LILAC, ".12", "78,110 88,104 96,114 84,120"],
    [PEARL, ".08", "126,124 140,122 142,134 128,138"],
    [ROUGE, ".14", "52,148 64,142 70,154 58,160"],
    [MINT, ".1", "108,154 118,150 120,162 110,166"],
    [CHAMPAGNE, ".12", "160,150 172,148 174,160 162,164"],
  ]
    .map(([c, o, p]) => `<polygon points='${p}' fill='${c}' fill-opacity='${o}'/>`)
    .join("") +
    [
      [44, 24, 1.4],
      [98, 36, 1],
      [12, 70, 1.2],
      [84, 84, 1.4],
      [150, 112, 1],
      [36, 132, 1.2],
      [96, 140, 0.9],
      [140, 170, 1.3],
    ]
      .map(
        ([x, y, r]) => `<circle cx='${x}' cy='${y}' r='${r}' fill='${PEARL}' fill-opacity='.12'/>`,
      )
      .join(""),
);

const STAR_FIELD = [
  [18, 22, 1.1, ".55"],
  [62, 48, 0.7, ".35"],
  [104, 14, 0.9, ".45"],
  [150, 40, 0.6, ".3"],
  [196, 26, 1.2, ".5"],
  [228, 70, 0.7, ".3"],
  [30, 92, 0.6, ".3"],
  [86, 118, 1, ".45"],
  [132, 96, 0.7, ".35"],
  [178, 134, 0.9, ".4"],
  [214, 160, 0.6, ".3"],
  [12, 170, 0.8, ".35"],
  [56, 196, 1.2, ".5"],
  [110, 214, 0.6, ".3"],
  [160, 200, 0.7, ".35"],
  [204, 228, 1, ".45"],
] as const;

const stars = (list: readonly (readonly [number, number, number, string])[]) =>
  list
    .map(
      ([x, y, r, o]) =>
        `<circle cx='${x}' cy='${y}' r='${r}' fill='${PEARL}' fill-opacity='${o}'/>`,
    )
    .join("");

/** Constellations: a star map with a few joined figures. */
export const CONSTELLATIONS = svgUrl(
  240,
  240,
  `<g fill='none' stroke='${PEARL}' stroke-opacity='.13' stroke-width='.7'><path d='M18 22 L62 48 L104 14 L150 40 L196 26'/><path d='M86 118 L132 96 L178 134 L214 160'/><path d='M132 96 L150 40'/><path d='M12 170 L56 196 L110 214 L160 200 L204 228'/></g>` +
    stars(STAR_FIELD),
);

/** Sparse stars used above the skylines. */
export const SKY = svgUrl(240, 240, stars(STAR_FIELD.filter((_, i) => i % 2 === 0)));

/** A skyline strip with a few windows still lit. */
function skyline(x0: number, w: number, h: number, seed: number) {
  let out = "";
  let x = x0;
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  while (x < x0 + w) {
    const bw = 14 + Math.round(rnd() * 18);
    const bh = 30 + Math.round(rnd() * (h - 40));
    const top = h - bh;
    out += `<rect x='${x}' y='${top}' width='${bw}' height='${bh}' fill='#0B080C'/>`;
    for (let wy = top + 6; wy < h - 6; wy += 8)
      for (let wx = x + 3; wx < x + bw - 4; wx += 6)
        if (rnd() > 0.78)
          out += `<rect x='${wx}' y='${wy}' width='2.2' height='3' fill='${CHAMPAGNE}' fill-opacity='${(0.25 + rnd() * 0.3).toFixed(2)}'/>`;
    x += bw + 1;
  }
  return out;
}

/** City lights: a skyline along the bottom, windows glowing warm. */
export const CITY = svgUrl(360, 170, skyline(0, 360, 170, 7));

/** Two cities, two skylines, one dotted arc between them with a heart on top. */
export const TWO_CITIES = svgUrl(
  400,
  260,
  skyline(0, 118, 120, 3).replace(/<rect /g, "<rect transform='translate(0 140)' ") +
    skyline(282, 118, 120, 11).replace(/<rect /g, "<rect transform='translate(0 140)' ") +
    `<path d='M70 170 Q200 30 330 170' fill='none' stroke='${BLUSH}' stroke-opacity='.28' stroke-width='1.2' stroke-dasharray='1 7' stroke-linecap='round'/>` +
    heart(200, 98, 0.7, `fill='${ROUGE}' fill-opacity='.4'`),
);

/** Love letters: loops of handwriting, a kiss, a little heart. */
export const LETTERS = svgUrl(
  300,
  220,
  `<g fill='none' stroke='${BLUSH}' stroke-opacity='.1' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'><path d='M20 40c6-10 12-16 10-6s-6 14 2 8 10-16 12-8-4 14 4 8 8-14 12-6 0 12 8 6c6-6 10-12 14-6s2 10 10 4'/><path d='M120 36c4 8 10 10 14 2s-6-10-8-2 4 14 12 10 6-12 14-10 2 12 10 8'/><path d='M30 96c8-6 14-12 12-4s-4 12 4 8 12-14 16-6-2 10 6 6 10-10 14-4 4 8 10 2 8-8 14-2'/><path d='M170 92c10-2 16-8 22-4s0 10 8 8 14-10 20-4 2 8 10 4'/><path d='M60 160c4-12 10-16 10-6s-4 16 4 10 12-18 16-8-4 14 6 8 8-12 14-6 2 10 10 4'/><path d='M190 152l10 10m0-10-10 10M216 157a5 5 0 1 0 0 .1'/><path d='M228 196c6-8 14-8 18-2s10 6 16-2'/></g>` +
    heart(260, 40, 0.55, `fill='none' stroke='${ROUGE}' stroke-opacity='.18' stroke-width='2'`),
);

/** Polka hearts: a quiet half-drop of tiny hearts. */
export const POLKA = svgUrl(
  52,
  52,
  heart(13, 13, 0.45, `fill='${ROUGE}' fill-opacity='.11'`) +
    heart(39, 39, 0.45, `fill='${BLUSH}' fill-opacity='.08'`),
);

/** Champagne fizz: rising bubbles in columns. */
export const FIZZ = svgUrl(
  140,
  240,
  [
    [16, 220, 3.5],
    [20, 180, 2.5],
    [14, 146, 2],
    [18, 118, 1.4],
    [16, 96, 1],
    [70, 230, 4.5],
    [66, 186, 3],
    [72, 150, 2.2],
    [68, 122, 1.6],
    [70, 100, 1.1],
    [69, 84, 0.8],
    [112, 206, 3],
    [116, 170, 2.2],
    [110, 138, 1.6],
    [114, 112, 1.1],
    [42, 60, 2],
    [44, 34, 1.4],
    [96, 52, 2.4],
    [98, 22, 1.2],
    [128, 70, 1.6],
  ]
    .map(
      ([x, y, r]) =>
        `<circle cx='${x}' cy='${y}' r='${r}' fill='${CHAMPAGNE}' fill-opacity='.05' stroke='${CHAMPAGNE}' stroke-opacity='.2' stroke-width='.8'/>`,
    )
    .join(""),
);

/** One almond leaf drawn from the origin along +y, rotated. */
const leaf = (x: number, y: number, rot: number, len = 16) =>
  `<path transform='translate(${x} ${y}) rotate(${rot})' d='M0 0q${len * 0.38} ${len * 0.5} 0 ${len}q-${len * 0.38} -${len * 0.5} 0 -${len}zM0 2v${len - 4}'/>`;

/** Botanical: line-drawn sprigs. */
export const BOTANICAL = svgUrl(
  220,
  220,
  `<g fill='none' stroke='#A9D8B8' stroke-opacity='.13' stroke-width='1' stroke-linecap='round'><path d='M30 200C40 150 36 110 60 70'/>${leaf(34, 168, 60)}${leaf(36, 150, -70)}${leaf(42, 126, 55)}${leaf(46, 108, -60)}${leaf(54, 86, 45)}${leaf(60, 70, 160, 14)}<path d='M150 120c10-30 30-50 50-60'/>${leaf(160, 100, -110)}${leaf(172, 84, 30)}${leaf(186, 72, -100)}${leaf(200, 60, 200, 12)}<path d='M120 30c-6 14-4 26 4 36'/>${leaf(118, 42, 110, 12)}${leaf(120, 54, -120, 12)}<circle cx='176' cy='176' r='3'/><circle cx='186' cy='184' r='2'/><circle cx='172' cy='190' r='2.4'/></g>`,
);

/** Topographic contour lines, seamless on a 240 tile. */
function contours() {
  const ring = (cx: number, cy: number, r: number, k: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 48; i++) {
      const t = (i / 48) * Math.PI * 2;
      const rr = r * (1 + 0.1 * Math.sin(3 * t + k * 0.5) + 0.05 * Math.cos(5 * t - k));
      pts.push(`${(cx + rr * Math.cos(t)).toFixed(1)} ${(cy + rr * Math.sin(t)).toFixed(1)}`);
    }
    return `M${pts.join("L")}Z`;
  };
  const set = (cx: number, cy: number, n: number) =>
    Array.from({ length: n }, (_, k) => ring(cx, cy, 10 + k * 13, k)).join("");
  const corner = (k: number) => set(0, 0, k);
  return `<g fill='none' stroke='${PEARL}' stroke-opacity='.07' stroke-width='1'><path d='${set(120, 120, 5)}'/><path d='${corner(5)}'/><path transform='translate(240 0)' d='${corner(5)}'/><path transform='translate(0 240)' d='${corner(5)}'/><path transform='translate(240 240)' d='${corner(5)}'/></g>`;
}
export const TOPO = svgUrl(240, 240, contours());

/** Rain on glass: beads and a few slow streaks. */
export const RAIN = svgUrl(
  160,
  240,
  `<g fill='none' stroke='#CFE3FF' stroke-opacity='.07' stroke-width='1.1' stroke-linecap='round'><path d='M30 10c1 20-2 40 0 60'/><path d='M110 90c-1 24 2 44 0 70'/><path d='M140 0c1 14-1 26 1 40'/></g>` +
    (
      [
        [30, 74, 2.6, 3.4],
        [110, 164, 3, 4],
        [141, 44, 2, 2.6],
        [64, 30, 1.6, 2],
        [88, 60, 1.2, 1.5],
        [20, 130, 2, 2.5],
        [52, 170, 1.4, 1.8],
        [130, 210, 1.8, 2.2],
        [76, 216, 2.4, 3],
        [12, 220, 1, 1.3],
        [96, 120, 1.6, 2],
        [150, 140, 1.1, 1.4],
      ] as [number, number, number, number][]
    )
      .map(
        ([x, y, rx, ry]) =>
          `<ellipse cx='${x}' cy='${y}' rx='${rx}' ry='${ry}' fill='#CFE3FF' fill-opacity='.07'/><circle cx='${x - rx * 0.35}' cy='${y - ry * 0.4}' r='${(rx * 0.3).toFixed(2)}' fill='#fff' fill-opacity='.14'/>`,
      )
      .join(""),
);

/** Neon sign line art (lines only, no glow): a heart, a glass, a moon, "xo". */
export const NEON = svgUrl(
  260,
  260,
  `<g fill='none' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>` +
    heart(60, 64, 2, `stroke='${ROUGE}' stroke-opacity='.2' stroke-width='.8'`) +
    `<path d='M172 40h36l-18 24v26m-12 0h24' stroke='${CHAMPAGNE}' stroke-opacity='.18'/><circle cx='200' cy='50' r='2.5' stroke='${CHAMPAGNE}' stroke-opacity='.18'/><path d='M60 160a24 24 0 1 0 22 30a18 18 0 1 1 -22 -30z' stroke='${LILAC}' stroke-opacity='.18'/><path d='M150 176l18 22m0-22-18 22M196 187m-11 0a11 11 0 1 0 22 0a11 11 0 1 0 -22 0' stroke='${BLUSH}' stroke-opacity='.18'/></g>`,
);

/** Memphis: squiggles, triangles and dots in the brand colours. */
export const MEMPHIS = svgUrl(
  200,
  200,
  `<g fill='none' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M16 30q8-12 16 0t16 0 16 0' stroke='${ROUGE}' stroke-opacity='.2'/><path d='M120 20l16 26h-32z' stroke='${CHAMPAGNE}' stroke-opacity='.18'/><path d='M150 110l8-10 8 10 8-10 8 10' stroke='${MINT}' stroke-opacity='.17'/><path d='M40 120a16 16 0 0 1 32 0' stroke='${LILAC}' stroke-opacity='.2'/><path d='M96 170q8-12 16 0t16 0' stroke='${LILAC}' stroke-opacity='.16'/><path d='M14 172h18m-9-9v18' stroke='${CHAMPAGNE}' stroke-opacity='.16'/></g>` +
    [
      [80, 70, ROUGE],
      [90, 80, ROUGE],
      [100, 70, ROUGE],
      [176, 160, CHAMPAGNE],
      [60, 186, MINT],
      [180, 60, LILAC],
    ]
      .map(([x, y, c]) => `<circle cx='${x}' cy='${y}' r='2.6' fill='${c}' fill-opacity='.2'/>`)
      .join(""),
);
