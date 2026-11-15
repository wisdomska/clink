# Changelog

All notable changes to Clink. Versions follow [Semantic Versioning](https://semver.org).

## [1.1.0] - 2026-11-15

A polish pass, informed by the author's Spil and Spuzl apps.

### Added

- Feel settings: sound effects (synthesised, no downloads, off by default), haptics, and Motion (System, Reduced, Full). One feedback layer gives every press a quiet tick when sound is on, unlocks audio on iPhone, and stands in a tiny shake where phones can't vibrate.
- Big moments now have sound and touch: sending and receiving a clink, linking, unlocking, capsules and letters. Clinks and game invites flash the tab title when Clink is in the background.
- Games: confetti and counting scores on the results screen (once per game), a sound and haptic on every reveal, swipe left or right to pick in Would You Rather, a confirm before leaving a live round (including the back gesture), and a waiting screen with your partner's presence, elapsed time and a nudge with a cooldown.
- Milestones (100 days, anniversaries) are celebrated once with confetti on Us.
- Admin: in-app confirmations with a required reason, typed DELETE for account deletion, 7 and 30 day trends with change against the previous period and sparklines, a live switches strip, CSV exports with a formula-injection guard, search kept in the URL, and an audit log written in plain sentences.
- A branded 404 page, and an offline-aware error screen.

### Changed

- Buttons have loading and soft-disabled states. Toasts have success, error and info styles and can carry an action. Sheets can be pulled down to dismiss and animate out. Skeletons wait 300 ms, then shimmer. Inputs get a focus glow, accent caret and no iPhone zoom.
- Game progress bars animate with transforms instead of width.

### Fixed

- Simultaneous answers in live games are never lost; game rooms recover from a missed live update.
- The PIN pad no longer drops digits typed right after a wrong PIN.

## [1.0.0] - 2026-11-14

First release.

### Added

- Accounts: email and password, magic link, Google, passkeys (add and remove them in Settings); date-of-birth age gate; invite codes and links to pair with exactly one person; unlink with a 30 day read-only chat at `/archive`; data export and account deletion; sign out of every device, which also cuts off tokens other devices already hold.
- Us: send a clink, presence, dual clocks, moods, countdowns on a split-flap board, daily rituals at a time you both agree on, hold together.
- Chat: text, photos, video, voice notes with waveforms, stickers, reactions, swipe to reply, offline queue, call shortcuts.
- Play: How Well Do You Know Me, Draw and Guess, Trivia duel, Would You Rather, a turn-based word game and Story builder, all refereed on the server; game invites appear anywhere in the app.
- Together and Plans: watch parties with synced YouTube, listen together, date kits, date roulette, 30 day challenges with streaks and badges.
- Keep: letters to open later, time capsules with text, photo, video or voice, a shared timeline with automatic 100 day and anniversary milestones.
- After Dark: PIN lock, mutual opt-in, tiered consent with both partners' agreement, question decks, dare wheel, private vault with watermarked media, one-tap face blur, panic wipe.
- Privacy: Discreet mode for everyone, optional PIN when Clink opens, a discreet app name and icon chosen at install.
- Safety: reports, blocks (including from inside After Dark), quiet hours, discreet notifications.
- Admin: dashboard with aggregate metrics and free-tier usage, report queue, user tools, content editor, audit log.
- PWA: installable, offline shell, Web Push.
- Ops: errors-only Sentry reporting that never sees private content; one-command Supabase cloud setup (`pnpm setup:cloud`); keep-alive workflow for Supabase Free.
- QA: unit, RLS, end-to-end (two partners, three viewports), accessibility, visual regression and Lighthouse checks in CI.
