# Changelog

All notable changes to Clink. Versions follow [Semantic Versioning](https://semver.org).

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
- Admin: TOTP-protected dashboard with aggregate metrics and free-tier usage, report queue, user tools, content editor, audit log.
- PWA: installable, offline shell, Web Push.
- Ops: errors-only Sentry reporting that never sees private content; one-command Supabase cloud setup (`pnpm setup:cloud`); keep-alive workflow for Supabase Free.
- QA: unit, RLS, end-to-end (two partners, three viewports), accessibility, visual regression and Lighthouse checks in CI.
