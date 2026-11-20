import { abs } from "@/lib/seo";

/**
 * A plain summary for AI assistants and answer engines (llmstxt.org): what
 * Clink is, who it's for, what it does, and where the public pages are.
 * Facts only, kept in step with the landing page and FAQ.
 */
export const dynamic = "force-static";

export function GET() {
  const body = `# Clink

> Clink is a private web app for couples, especially couples in different places. Two adults link their accounts to each other (one account links to exactly one person) and get calls, chat, games, letters and date planning made for two. It is 18+ only, runs in the browser and installs to the home screen like an app. There is no app store download.

## What couples can do on Clink

- Send a clink: one tap that reaches your partner straight away, wherever they are.
- Call: voice and video calls inside the app, no phone number needed.
- Chat: messages, voice notes, photos, videos, stickers, replies, pinned messages and messages scheduled for later.
- Play: ten games made for two, live or turn by turn: How well do you know me, Draw and guess, Trivia duel, Would you rather, Word game, Story builder, Rock paper scissors, Snap challenge, Zoom guess and Photo memory.
- Letters and time capsules that open on a date you choose.
- Plans: date nights, countdowns to your next visit, a shared calendar, and watching or listening together (YouTube, Spotify, Apple Music).
- Keep: a shared memory wall of favourite photos, with "On this day" memories.
- Both partners' local time and weather, side by side.
- After Dark (optional): a private space for adults with its own PIN. It only opens when both partners say yes, and its content is never available to Clink's team.

## Privacy and safety

- One account links to exactly one person. Either partner can unlink or block at any time; private media is wiped for both within an hour.
- Clink does not sell data. You can download your data or delete your account in Settings.
- Only adults (18+) can use Clink.

## Frequently asked

- Who is it for? Adults in a relationship, especially long distance. Each partner makes an account and they link with an invite code.
- Is it free? Yes, Clink is free to use.
- Does it work on iPhone and Android? Yes. It runs in Safari, Chrome and other modern browsers on phones, tablets and computers, and can be added to the home screen.
- Is it a dating app? No. Clink is for two people who are already together. There is no browsing or matching.

## Pages

- [Home](${abs("/")}): what Clink is and how it works
- [Help and safety](${abs("/safety")}): staying safe, unlinking, blocking, reporting
- [Privacy](${abs("/privacy")}): what Clink collects and why
- [Terms of use](${abs("/terms")})
- [Get started](${abs("/signup")})
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
