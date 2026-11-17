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

export async function renderOg({
  eyebrow,
  title,
  body,
  people = false,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  people?: boolean;
}) {
  const [f, ama, theo] = await Promise.all([
    fonts(),
    people ? memoji("ama.png") : null,
    people ? memoji("theo.png") : null,
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
            maxWidth: people ? 560 : 960,
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
      {people && ama && theo && (
        <div
          style={{
            position: "absolute",
            right: 56,
            bottom: 40,
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ama} width={250} height={250} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theo} width={250} height={250} alt="" />
        </div>
      )}
    </div>,
    { ...OG_SIZE, fonts: f },
  );
}
