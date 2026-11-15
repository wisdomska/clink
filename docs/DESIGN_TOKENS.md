# Design tokens

Source: `design/claude-design/Clink Prototype v2.dc.html`. Values are copied verbatim into `src/styles/tokens.css` and exposed to Tailwind v4 through `@theme inline` in `src/styles/globals.css`. Dark theme only.

## Deviations from the prototype

| Token          | Prototype | Clink     | Why                                                                                                                                                                     |
| -------------- | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--text-faint` | `#7C7581` | `#8B8590` | The prototype value measures about 4.0:1 on `--bg-app`, `--surface-1` and `--surface-2`. `#8B8590` reaches 4.5:1 (WCAG AA for body text) and is visually the same step. |

| `screenIn` keyframe | starts at `opacity: 0` | starts at `opacity: .01` | Elements that paint at opacity 0 are not counted as the largest contentful paint, so the landing and legal pages reported no LCP. `.01` looks identical. |

Everything else is unchanged.

**November 2026 rebrand:** surfaces moved to plum-tinted values and the accent to Rouge. The tables below show the current values. See [BRAND.md](BRAND.md) for the full brand guide (logo, palette, type, motion, voice).

## Colour

| Role                                           | Token                                      | Value                             |
| ---------------------------------------------- | ------------------------------------------ | --------------------------------- |
| Page (outside the app column)                  | `--bg-page`                                | `#0A0609`                         |
| App canvas, on-accent text                     | `--bg-app`                                 | `#120C10`                         |
| Night half of the dual clock                   | `--bg-night`                               | `#0C080B`                         |
| Cards, sheets, rows                            | `--surface-1`                              | `#1B1318`                         |
| Placeholder stripe partner                     | `--surface-1b`                             | `#20161C`                         |
| Inputs, raised, secondary buttons              | `--surface-2`                              | `#251A21`                         |
| Partner B avatar, sent bubble, toast, selected | `--surface-3`                              | `#31232C`                         |
| Device bezel                                   | `--bezel`                                  | `#1C1419`                         |
| Lines                                          | `--line` / `--line-strong`                 | `#3D2C36` / `#57404C`             |
| Text                                           | `--text` / `--text-muted` / `--text-faint` | `#FBF3F6` / `#BBA9B3` / `#A08D98` |
| Accent (main app)                              | `--accent`                                 | `#FF4F7B` (Rouge)                 |
| Accent (After Dark, Ember)                     | `--accent-dark`                            | `#FF5A3C`                         |
| Partner A (circle) / B (square)                | `--partner-a` / `--partner-b`              | `#FF4F7B` / `#B9A4FF`             |
| Danger / warning                               | `--danger` / `--warning`                   | `#FF7A6B` / `#F2B84B`             |
| Matchbook striker                              | `--striker-1` / `--striker-2`              | `#3A1A12` / `#5A2A1E`             |

Inside After Dark, `[data-mode="dark"]` swaps `--accent` and its glows to Ember, so components never branch on mode. Partner identity never relies on colour alone: A is a circle, B is a square.

Alpha tints (glows, halos, scrims, glass) are listed in `tokens.css` with their exact rgba values.

## Type

| Family          | Weights       | Use                                |
| --------------- | ------------- | ---------------------------------- |
| Cabinet Grotesk | 800           | Display, `letter-spacing: -0.02em` |
| Satoshi         | 400, 500, 700 | Body and UI                        |
| Geist Mono      | 500           | Split-flap board, timers, codes    |

Fonts are self-hosted through `next/font/local` (no third-party requests). Icons: Phosphor Regular.

## Shape, space, depth

- Radius: pill `999px`, card `20px`, ticket `16px`, input `14px`, thumb `12px`, flap `6px`; bubbles `20 20 20 6` (in) and `20 20 6 20` (out); sheets `20 20 0 0`.
- Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 40, 56, 72.
- Shadows: sheet `0 -20px 50px rgba(0,0,0,.4)`, float `0 20px 50px rgba(0,0,0,.4)`, toast `0 12px 32px rgba(0,0,0,.4)`, matchbook `0 -8px 20px rgba(0,0,0,.4)`.
- Film grain: an SVG fractal-noise overlay at 5% opacity (`--grain`).

## Layout

- Phones (320 to 767 px): bottom tab bar, `--tabbar-h: 84px` including the safe-area pad.
- Tablet (768 to 1023 px): same tabs, wider column, two-column grids where content allows.
- Desktop (1024 px and up): left rail `--rail-w: 232px`, content up to `--content-max: 1200px`.

## Motion

| Easing          | Value                              |
| --------------- | ---------------------------------- |
| `--ease-out`    | `cubic-bezier(0.23, 1, 0.32, 1)`   |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)`  |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)`   |
| `--ease-pop`    | `cubic-bezier(0.34, 1.4, 0.64, 1)` |

Press feedback: `transform 160ms` plus `200ms` colour transitions. All prototype keyframes (`glassL`, `glassR`, `spark`, `ripple`, `pulseRing`, `flip`, `sealL/R`, `letterUp`, `cork`, `sheetUp`, `flame`, `tear`, `floatUp`, `shake`, `live`, `dots`, `skel` and the rest) are in `tokens.css` unchanged. Under `prefers-reduced-motion: reduce`, decorative animations are removed and state changes use opacity only.
