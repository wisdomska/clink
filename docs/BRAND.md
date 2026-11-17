# Clink brand guide

Clink is for two people, wherever they are: across town, across the world, or on the same sofa. The brand is **spicy, playful and a little romantic**: a late-night text, not a greeting card. It flirts, it teases, it never gets cheesy or crude, and it is always easy to understand.

## 1. The idea

Two glasses meeting. Every feature in Clink is a small "clink" between two people: a tap, a voice note, a game, a dare. The logo, the motion and the copy all come back to that one moment of contact.

## 2. Logo

### The mark

Two champagne flutes tilted toward each other. Their bowls are half-hearts, so where the rims touch they form one heart. A champagne spark pops above the point of contact.

- Left flute: Blush to Rouge gradient (`#FFB3C4` > `#FF4F7B` > `#D9305E`).
- Right flute: Champagne to Ember gradient (`#FFD08A` > `#FF7A5C` > `#FF5A3C`).
- Spark: Champagne `#FFD08A`.
- Fizz lines: white at 55% opacity.
- Resting pose: each flute tilted 9 degrees inward, pivoting at the rim (32, 15) in the 64 x 80 viewBox.

Source of truth: `src/components/brand/mark-paths.ts`. Never redraw the paths by hand.

### The wordmark

"clink" in Cabinet Grotesk ExtraBold, tracking -3%, all lower case. The dot of the i is a small Rouge heart that beats every few seconds.

### Components

| Component           | Use                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `<LogoMark size />` | App bars, compact rails, loading moments. Animates on mount and re-clinks on hover or tap. |
| `<Wordmark size />` | Headlines where the mark is already nearby.                                                |
| `<Logo size />`     | Default lock-up: mark + wordmark. Landing header, admin rail, footers.                     |

All three live in `src/components/brand/logo.tsx` and respect reduced motion (the static 9 degree pose).

### App icons

Generated with `node scripts/brand-icons.mjs` from the same paths: plum radial background with a champagne glow behind the mark.

| File                                              | Purpose                               |
| ------------------------------------------------- | ------------------------------------- |
| `public/icons/clink-512.png`, `clink-192.png`     | PWA icons                             |
| `public/icons/clink-maskable-512.png`, `-192.png` | Android maskable (26% safe padding)   |
| `public/icons/clink-apple-180.png`                | iOS home screen                       |
| `public/icons/badge-96.png`                       | Notification badge (white silhouette) |
| `public/favicon.png`, `public/icons/clink.svg`    | Browser tab                           |

### Do and don't

- Do give the mark clear space of at least half its height on every side.
- Do place it on Night, Plum or a photo with a dark scrim.
- Don't recolour the flutes, flatten the gradients, or straighten the tilt.
- Don't put the mark on a light background. Clink is dark only.
- Don't add outlines, drop shadows or rings around the mark.

## 3. Colour

Clink is dark only. Surfaces are tinted plum, never neutral grey, so the whole app feels warm and low-lit.

### Brand colours

| Name      | Hex       | Token                    | Role                           |
| --------- | --------- | ------------------------ | ------------------------------ |
| Rouge     | `#FF4F7B` | `--rouge`, `--accent`    | Primary action, you, the heart |
| Ember     | `#FF5A3C` | `--ember`                | Heat, After Dark, urgency      |
| Lilac     | `#B9A4FF` | `--lilac`, `--partner-b` | Your partner, calm moments     |
| Champagne | `#FFD08A` | `--champagne`            | Sparks, celebrations, wins     |
| Blush     | `#FFB3C4` | `--blush`                | Soft highlights, romance       |

### Surfaces and text

| Name         | Hex       | Token          |
| ------------ | --------- | -------------- |
| Night (page) | `#0A0609` | `--bg-page`    |
| App          | `#120C10` | `--bg-app`     |
| Plum 1       | `#1B1318` | `--surface-1`  |
| Plum 2       | `#251A21` | `--surface-2`  |
| Plum 3       | `#31232C` | `--surface-3`  |
| Line         | `#3D2C36` | `--line`       |
| Text         | `#FBF3F6` | `--text`       |
| Muted        | `#BBA9B3` | `--text-muted` |
| Faint        | `#A08D98` | `--text-faint` |
| On accent    | `#1A0A10` | `--on-accent`  |

### Gradients

- `--brand-gradient`: Rouge > Coral > Champagne at 135 degrees. Hero moments, active nav icons, banners, celebration screens.
- `--brand-gradient-romance`: Rouge > Orchid at 135 degrees. After Dark and anniversaries.

Use a gradient once per screen at most. Everything else is flat colour.

### Accent choices

People can pick their own accent in Settings > Look and feel: Rouge (default), Orchid, Coral, Gold, Mint, Sky, Lilac, Pearl. Every accent sets `--accent` and keeps 4.5:1 contrast with `--on-accent` text.

## 4. Type

| Role    | Family                  | Notes                                                                                          |
| ------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| Display | Cabinet Grotesk (800)   | Headlines, the wordmark. Tight tracking, italic for one emphasised word: "Your admin _login_". |
| Body    | Satoshi (400, 500, 700) | Everything people read. 16px minimum for body and inputs.                                      |
| Mono    | Geist Mono              | Times, counts, codes, small uppercase labels like `STEP 1 OF 2`.                               |

Emphasis uses italic or bold of the same family. Never mix in a serif.

## 5. Shape

- Interactive controls are pills (`--r-pill`).
- Cards are 20 to 28px (`--r-card`, home cards use 28px).
- Inputs 14px, thumbnails 12px.
- Chat bubbles round on three corners with a 6px tail corner; people can change the shape.
- No focus rings or decorative rings around avatars. Focus is shown with a soft accent glow.

## 6. Motion

Motion is how Clink flirts. It should feel like a wink, not a firework show.

| Principle                 | In practice                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Contact**               | Things meet: flutes clink, avatars bump, the clink button sends a ripple to your partner.              |
| **Springy, not bouncy**   | Springs with stiffness 260 to 420 and damping 26 to 34. Overshoot once, settle fast.                   |
| **Quick in, quicker out** | Enter 200 to 400ms with `--ease-out`; exit 150 to 200ms.                                               |
| **Reward the tap**        | Every button presses down (`.press`, scale 0.97) and gives haptic feedback where the device allows.    |
| **One hero per screen**   | Only one thing loops at a time (the wordmark heart, a live dot, the auth blobs).                       |
| **Respect the setting**   | `prefers-reduced-motion` and the in-app "Reduce motion" switch remove loops and big moves. Fades stay. |

Shared pieces:

- `NavTabs` (`src/components/ui/nav-tabs.tsx`): sliding Rouge pill between tabs, URL-synced with `?tab=`.
- `an-screen`, `an-rise`: screen and list entrances (staggered with `--i`).
- `.press`: tactile press on every control.
- Sheets slide on `--ease-drawer`.

## 7. Voice and tone

Clink talks like a confident friend who's rooting for you both.

| We are                                  | We are not                                   |
| --------------------------------------- | -------------------------------------------- |
| Playful: "Your move."                   | Childish: "Yay!! 🎉🎉"                       |
| Flirty: "Something to look forward to." | Crude or explicit outside After Dark         |
| Warm: "Theo is missing you."            | Gushing: "Your amazing love story!"          |
| Clear: "Couldn't send that. Try again." | Vague: "Something went wrong."               |
| Short: "Saved."                         | Robotic: "Operation completed successfully." |

### Rules

1. **No em dashes or en dashes.** Use a comma, a full stop or a colon.
2. Sentence case everywhere, including buttons and headings.
3. Say what happens next: "Unlink and wipe" beats "Confirm".
4. Errors say what went wrong and what to do.
5. Empty states say how to fill them.
6. Use "device", not "phone". Use "you" and your partner's name, never "user".
7. Spicy lives in After Dark. Everywhere else, keep it to a wink.
8. Admin copy is calm and exact. It never jokes about people's data.

## 8. Imagery

- 3D Fluent Emoji art (MIT) for avatars, moods, stickers and empty states. Fetched by the scripts in `scripts/fetch-*.mjs`.
- People pick from the memoji cast (8 women, 8 men, 16 poses each) or upload a photo.
- Photos always sit on a dark scrim when text overlays them.

## 9. Status colours

| Name     | Token        | Use                                          |
| -------- | ------------ | -------------------------------------------- |
| Online   | `--online`   | The live dot on avatars, Answer on a call    |
| End call | `--end-call` | Decline and End on calls                     |
| Danger   | `--danger`   | Destructive actions and errors               |
| Warning  | `--warning`  | Maintenance banners, things that need a look |

Never type a hex colour into a component. `tests/unit/brand-tokens.test.ts` fails CI if one appears outside the allowed artwork files (logo, posters, link previews, drawing pens, canvas exports).

## 10. Layout and screen sizes

Clink is designed phone first and then given room, never stretched.

| Width       | Shell                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| Under 768   | Bottom tab bar, one column, 16 px gutters                                                |
| 768 to 1023 | Tablet: tab bar in portrait, compact rail in landscape, 32 px gutters                    |
| 1024 and up | Rail with your partner on top and a More section (Keep, Calendar, Search); 48 px gutters |
| 1536 and up | Content up to 1440 px (1600 from 1920), rail 264 px, three-column dashboards             |

- Avatars grow with the screen through `Avatar sizes={{ md, lg, xl }}` (Us hero: 84 / 128 / 152 px).
- Us: you two, your mood and what's coming sit side by side on large screens; a desktop header carries Message, Call, Video and Keep.
- Chat: messages keep a readable 880 px column on wide screens; from 1280 px a partner panel shows their time, weather, quick actions, the next countdown and shared photos.
- Settings: a side menu on desktop (`NavTabs vertical`), tabs across the top on phones.
- Calendar: wall-calendar cells with event titles on desktop, dots on phones.
- Hover-only controls (the reply button on a message) appear only on devices with a fine pointer; touch gets gestures instead (swipe right to reply).

## 11. Outside the app

| Surface            | Where                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| Link previews      | `src/lib/og/render.tsx`, one `opengraph-image.tsx` per public page           |
| Sign-in emails     | `supabase/templates/*.html` (pushed by `scripts/setup-cloud.ts`)             |
| iOS launch screens | `scripts/brand-splash.mjs` writes `public/splash/` and `src/lib/splash.json` |
| App icons          | `scripts/brand-icons.mjs`                                                    |

Emails are dark, table-based and inline-styled so Gmail, Apple Mail and Outlook all render them; links go through `/auth/callback` with a token hash so they work on any device.

## 12. Where things live

| Thing          | File                             |
| -------------- | -------------------------------- |
| Tokens         | `src/styles/tokens.css`          |
| Logo           | `src/components/brand/`          |
| Icon generator | `scripts/brand-icons.mjs`        |
| Accent presets | `src/lib/appearance.ts`          |
| Chat themes    | `src/features/chat/themes.ts`    |
| Tabs           | `src/components/ui/nav-tabs.tsx` |
| Link previews  | `src/lib/og/`                    |
| Email HTML     | `supabase/templates/`            |
| Launch screens | `scripts/brand-splash.mjs`       |
