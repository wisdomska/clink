import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { MARK, BRAND } from "@/components/brand/mark-paths";

/**
 * Link previews (WhatsApp, iMessage, X, Slack): 1200 x 630, in Clink's look.
 * Night background, the flutes mark and wordmark, a headline, and the two
 * people from the landing page on the main one.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const here = path.join(process.cwd(), "src/lib/og");

async function fonts() {
  const [display, medium, bold] = await Promise.all([
    readFile(path.join(here, "CabinetGrotesk-Extrabold.ttf")),
    readFile(path.join(here, "Satoshi-Medium.ttf")),
    readFile(path.join(here, "Satoshi-Bold.ttf")),
  ]);
  return [
    { name: "Cabinet", data: display, weight: 800 as const, style: "normal" as const },
    { name: "Satoshi", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Satoshi", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

/** A hero memoji (pre-converted to PNG) as a data URL: satori can't fetch relative paths. */
async function memoji(file: string) {
  const png = await readFile(path.join(here, file));
  return `data:image/png;base64,${png.toString("base64")}`;
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={(size * 64) / 80} height={size} viewBox={MARK.viewBox}>
      <defs>
        <linearGradient id="l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BRAND.blush} />
          <stop offset="1" stopColor={BRAND.rouge} />
        </linearGradient>
        <linearGradient id="r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BRAND.champagne} />
          <stop offset="1" stopColor={BRAND.ember} />
        </linearGradient>
      </defs>
      <g transform="rotate(-9 32 15)">
        <path d={MARK.left} fill="url(#l)" />
      </g>
      <g transform="rotate(9 32 15)">
        <path d={MARK.right} fill="url(#r)" />
      </g>
      <path d={MARK.spark} fill={BRAND.champagne} />
    </svg>
  );
}

/** A piece of the 3D art in /public/art as a PNG data URL (satori can't read webp). */
async function artPng(name: string) {
  const sharp = (await import("sharp")).default;
  const webp = await readFile(path.join(process.cwd(), "public/art", `${name}.webp`));
  const png = await sharp(webp).resize(320, 320).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export async function renderOg({
  eyebrow,
  title,
  body,
  people = false,
  art,
}: {
  /** Only there to change the image URL when the design changes (see the route file). */
  version?: number;
  eyebrow?: string;
  title: string;
  body?: string;
  people?: boolean;
  /** A file name in /public/art, shown on the right. */
  art?: string;
}) {
  const [f, ama, theo, pic] = await Promise.all([
    fonts(),
    people ? memoji("ama-facing.png") : null,
    people ? memoji("theo.png") : null,
    art ? artPng(art) : null,
  ]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BRAND.night,
        backgroundImage: `radial-gradient(circle at 85% 20%, ${BRAND.rouge}33 0%, transparent 45%), radial-gradient(circle at 10% 100%, ${BRAND.ember}26 0%, transparent 40%)`,
        color: "#FBF3F6",
        fontFamily: "Satoshi",
        padding: 72,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Mark size={64} />
          <span style={{ fontFamily: "Cabinet", fontSize: 54, letterSpacing: -1.5 }}>clink</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: people ? 500 : pic ? 700 : 960,
          }}
        >
          {eyebrow && (
            <span style={{ fontSize: 26, fontWeight: 700, color: BRAND.rouge, letterSpacing: 1 }}>
              {eyebrow.toUpperCase()}
            </span>
          )}
          <span
            style={{ fontFamily: "Cabinet", fontSize: 76, lineHeight: 1.02, letterSpacing: -2 }}
          >
            {title}
          </span>
          {body && (
            <span style={{ fontSize: 30, lineHeight: 1.35, color: "#BBA9B3", fontWeight: 500 }}>
              {body}
            </span>
          )}
        </div>
      </div>
      {people && ama && theo && <Pair ama={ama} theo={theo} />}
      {pic && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pic}
          width={320}
          height={320}
          alt=""
          style={{ position: "absolute", right: 72, top: 155 }}
        />
      )}
    </div>,
    { ...OG_SIZE, fonts: f },
  );
}

/**
 * The two of them as on the landing page: a card split between Accra (warm
 * morning) and New York (starry night), each in a soft circle in their glass's
 * colour with the head breaking out of the top, facing each other, the flutes
 * between them and how far apart they are.
 */
function Pair({ ama, theo }: { ama: string; theo: string }) {
  const W = 500;
  const H = 486;
  const half = W / 2;
  const disc = 168;
  const person = (who: "ama" | "theo") => {
    const right = who === "theo";
    const tint = right ? "#FF7A5C" : BRAND.rouge;
    return (
      <div
        style={{
          position: "absolute",
          left: right ? half : 0,
          top: 0,
          width: half,
          height: H,
          display: "flex",
          flexDirection: "column",
          alignItems: right ? "flex-end" : "flex-start",
          justifyContent: "space-between",
          padding: 26,
          background: right
            ? "linear-gradient(180deg, #151230 0%, #0d0a14 100%)"
            : "linear-gradient(180deg, #2b1a1f 0%, #160f14 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: right ? "flex-end" : "flex-start",
          }}
        >
          <span style={{ fontFamily: "Cabinet", fontSize: 30, letterSpacing: -0.5 }}>
            {right ? "New York" : "Accra"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: right ? "flex-end" : "flex-start",
            gap: 10,
          }}
        >
          {/* Portrait: the disc, and the bust clipped to its round bottom with the head free above. */}
          <div style={{ display: "flex", position: "relative", width: disc, height: disc }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: disc,
                height: disc,
                borderRadius: disc,
                background: `radial-gradient(circle at 50% 35%, ${tint}66 0%, ${tint}22 60%, ${tint}10 100%)`,
                border: `2px solid ${tint}99`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: disc,
                height: disc * 1.32,
                display: "flex",
                overflow: "hidden",
                borderBottomLeftRadius: disc / 2,
                borderBottomRightRadius: disc / 2,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={right ? theo : ama}
                width={disc * 1.12}
                height={disc * 1.12}
                alt=""
                style={{ position: "absolute", left: -disc * 0.06, bottom: 0 }}
              />
            </div>
          </div>
          <span style={{ fontSize: 30, fontWeight: 700 }}>{right ? "Theo" : "Ama"}</span>
        </div>
      </div>
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        right: 64,
        top: 72,
        width: W,
        height: H,
        display: "flex",
        borderRadius: 28,
        overflow: "hidden",
        border: "1px solid #3a2a33",
      }}
    >
      {person("ama")}
      {person("theo")}
      {[
        [300, 70, 2],
        [430, 120, 1.5],
        [360, 200, 1.5],
        [470, 250, 2],
        [280, 150, 1],
      ].map(([x, y, r], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: r! * 2,
            height: r! * 2,
            borderRadius: 4,
            background: "#ffffff",
            opacity: 0.55,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: half,
          top: 0,
          width: 1,
          height: H,
          background: "#3a2a33",
        }}
      />
      <div style={{ position: "absolute", left: half - 60, top: 112, display: "flex" }}>
        <Mark size={150} />
      </div>
      <div
        style={{
          position: "absolute",
          left: half - 78,
          bottom: 26,
          width: 156,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          border: "1px solid #3a2a33",
          background: "#120c10",
          color: "#BBA9B3",
          fontSize: 17,
          fontWeight: 500,
        }}
      >
        8,200 km apart
      </div>
    </div>
  );
}
