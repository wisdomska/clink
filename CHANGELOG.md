# Changelog

All notable changes to Clink. Versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- Picture stickers: 36 stickers drawn from Fluent Emoji 3D; the classics keep their words as meme-style captions.
- Instant camera in chat: tap for a photo, hold for a video, flip camera; shots open in the editor.
- Write your own status, with quick suggestions; preset statuses carry an emoji.
- Calls in the chat history (missed, couldn't pick up, or how long you talked) with one-tap call back; a missed-call card on Us and Chat; minimise a call to a floating pill.
- Chat themes and wallpapers, shared with your partner and synced live; double-tap a message to heart it.
- Admins land on /admin after signing in.

### Changed

- Us page: a glowing hero with both of you and a heartbeat line, 3D mood tiles, and a glossy Clink button. No more rings, including avatar borders.
- Voice notes: a live waveform while recording; playback bars fill smoothly and dance at the playhead; tap to seek. The voice bubble no longer clips at the right edge.

## [1.2.0] - 2026-11-15

Calls, photo games, accounts and a livelier look.

### Added

- In-app voice and video calls with no phone number: ring on any screen, accept or decline, mute, camera on or off, flip camera, and a push notification when Clink is closed. Peer to peer and encrypted. An optional TURN relay (`NEXT_PUBLIC_TURN_*`) helps on strict networks.
- Four photo games: Rock paper scissors (first to 3), Snap challenge (shoot to a prompt, reveal together, vote), Zoom guess (guess the close-up, each miss zooms out) and Photo memory (6 pairs from your own shared photos).
- Chat media composer: rotate, seven filters, text on photos, add or remove shots, one caption, then send. Photos show as a Messenger-style grid with a full caption.
- Accounts: optional password sign-in, a forced change for temporary passwords, change your email or password in Settings, and switch between accounts kept on one device.
- 28 high-quality 3D avatars (Microsoft Fluent Emoji 3D, MIT) and photo upload straight from the picker.
- Share link menu with the official WhatsApp, Instagram, Snapchat, Telegram, Messenger, X, Messages and Email marks, plus Copy and the device share sheet.
- Live games: a 3, 2, 1, Go countdown when the game starts, and reactions (❤️ 😂 😮 🔥 👏) that float up on both screens.
- The top of the screen holds one card at a time: an incoming clink, then a game invite, then the notification offer, never stacked.
- Google sign-in can be switched on for both projects with `pnpm setup:cloud` (see README).

### Changed

- After Dark: the entry shows for every couple (setup, PIN and both partners' consent still gate it), and media you send is kept in the Vault by default.
- Busy buttons show hopping dots instead of text; a new gradient spinner.
- Chat bubbles hug short messages, group runs from one person with joined corners, show the time inline, and big emoji stand alone.
- Play lobby is a bento grid with 3D art; Date roulette is a 3D drum with a glowing pick band and ticks; the PIN pad uses soft keys. No more decorative rings.
- Voice notes record reliably on iPhone and Android, with clear messages when the microphone is blocked or missing.
- Copy says "this device" rather than "this phone".

## [1.1.0] - 2026-11-15

A polish pass, informed by the author's Spil and Spuzl apps.

### Added

- Feel settings: sound effects (synthesised, no downloads, off by default), haptics, and Motion (System, Reduced, Full). One feedback layer gives every press a quiet tick when sound is on, unlocks audio on iPhone, and stands in a tiny shake where phones can't vibrate.
- Big moments now have sound and touch: sending and receiving a clink, linking, unlocking, capsules and letters. Clinks and game invites flash the tab title when Clink is in the background.
- Games: confetti and counting scores on the results screen (once per game), a sound and haptic on every reveal, swipe left or right to pick in Would You Rather, a confirm before leaving a live round (including the back gesture), and a waiting screen with your partner's presence, elapsed time and a nudge with a cooldown.
- Milestones (100 days, anniversaries) are celebrated once with confetti on Us.
- Admin: in-app confirmations with a required reason, typed DELETE for account deletion, 7 and 30 day trends with change against the previous period and sparklines, a live switches strip, CSV exports with a formula-injection guard, search kept in the URL, and an audit log written in plain sentences.
- A branded 404 page, and an offline-aware error screen.
- Notifications are offered at an earned moment (right after your partner's clink lands), once, with a week's wait after "Not now".
- Tabs show a calm loading state on slow navigations; your partner's online status rides out short connection blips.

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
