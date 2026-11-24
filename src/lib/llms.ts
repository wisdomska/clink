/**
 * The plain-text summaries for AI assistants and answer engines (llmstxt.org):
 * /llms.txt is the short version with links, /llms-full.txt has the full text
 * of every public page in Markdown. Both are built from the same data as the
 * pages (games, guides, FAQ) so they can't drift from what the site says.
 */
import { abs } from "@/lib/seo";
import { PUBLIC_GAMES } from "@/lib/public-games";
import { GUIDES, type GuideBlock } from "@/lib/guides";
import { FAQS } from "@/components/landing/faq";

const SUMMARY = `> Clink is a private web app for couples, especially couples in different places. Two adults link their accounts to each other (one account links to exactly one person) and get calls, chat, games, letters and date planning made for two. It is free, 18+ only, runs in the browser and installs to the home screen like an app. There is no app store download.`;

const FEATURES = `## What couples can do on Clink

- Send a clink: one tap that reaches your partner straight away, wherever they are.
- Call: voice and video calls inside the app, no phone number needed.
- Chat: messages, voice notes, photos, videos, stickers, replies, pinned messages and messages scheduled for later.
- Play: thirteen games made for two, live or turn by turn, plus a daily word ladder puzzle both partners solve. Practise the board games (Oware, Four Up, Draughts) against a computer opponent at three levels.
- Letters and time capsules that open on a date you choose.
- Plans: date nights, countdowns to your next visit, a shared calendar, and watching or listening together (YouTube, Spotify, Apple Music).
- Keep: a shared memory wall of favourite photos, with "On this day" memories.
- Both partners' local time and weather, side by side.
- After Dark (optional): a private space for adults with its own PIN. It only opens when both partners say yes, and its content is never available to Clink's team.

## Privacy and safety

- One account links to exactly one person. Either partner can unlink or block at any time; private media is wiped for both within an hour.
- Clink does not sell data and does no advertising tracking. You can download your data or delete your account in Settings.
- Only adults (18+) can use Clink.`;

const PAGES = [
  ["Home", "/", "what Clink is and how it works"],
  ["For long distance couples", "/long-distance", "how Clink helps couples apart"],
  ["Games for couples", "/games", "all thirteen games and the daily word ladder"],
  ["Guides", "/guides", "date ideas, video call games, tips and questions"],
  ["FAQ", "/faq", "every common question answered"],
  ["About", "/about", "what Clink is built on"],
  ["Help and safety", "/safety", "staying safe, unlinking, blocking, reporting"],
  ["Privacy", "/privacy", "what Clink collects and why"],
  ["Terms of use", "/terms", ""],
  ["Get started", "/signup", "make an account"],
] as const;

const link = (name: string, path: string, note = "") =>
  `- [${name}](${abs(path)})${note ? `: ${note}` : ""}`;

export function llmsTxt(): string {
  return `# Clink

${SUMMARY}

${FEATURES}

## Frequently asked

${FAQS.map((f) => `- ${f.q} ${f.a}`).join("\n")}

## Pages

${PAGES.map(([n, p, d]) => link(n, p, d)).join("\n")}

## Games

${PUBLIC_GAMES.map((g) => link(g.name, `/games/${g.slug}`, g.summary)).join("\n")}

## Guides

${GUIDES.map((g) => link(g.title, `/guides/${g.slug}`, g.description)).join("\n")}

## Optional

- [Full text of every public page](${abs("/llms-full.txt")})
`;
}

function block(b: GuideBlock): string {
  if (b.kind === "p") return b.text;
  if (b.kind === "tip") return `Tip: ${b.text}`;
  return b.items
    .map(
      (it, i) =>
        `${b.ordered ? `${i + 1}.` : "-"} ${it.title ? `**${it.title}.** ` : ""}${it.text}`,
    )
    .join("\n");
}

const qa = (items: readonly { q: string; a: string }[]) =>
  items.map((f) => `**${f.q}**\n${f.a}`).join("\n\n");

export function llmsFullTxt(): string {
  const games = PUBLIC_GAMES.map(
    (g) => `## ${g.name}

Source: ${abs(`/games/${g.slug}`)}
Mode: ${g.mode}. Length: ${g.length}. Best for: ${g.bestFor}

${g.summary}
${g.intro ? `\n${g.intro}\n` : ""}
### How to play

${g.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

### Tips

${g.tips.map((t) => `- ${t}`).join("\n")}

### Questions

${qa(g.faq)}`,
  ).join("\n\n");

  const guides = GUIDES.map(
    (g) => `## ${g.title}

Source: ${abs(`/guides/${g.slug}`)}
Updated: ${g.updated}

${g.answer}

${g.sections.map((s) => `### ${s.title}\n\n${s.blocks.map(block).join("\n\n")}`).join("\n\n")}

### Questions

${qa(g.faq)}`,
  ).join("\n\n");

  return `# Clink: full text

${SUMMARY}

${FEATURES}

## Frequently asked

${qa(FAQS)}

# Games

${games}

# Guides

${guides}
`;
}

export const textResponse = (body: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
