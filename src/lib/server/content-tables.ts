import "server-only";
import { z } from "zod";

/** Content library: which tables admins may edit, and the shape of each row. */
export const CONTENT = {
  deck_cards: {
    order: "sort",
    schema: z.object({ deck_id: z.uuid(), text: z.string().trim().min(3).max(300), sort: z.number().int().min(0).max(100000).optional(), enabled: z.boolean().optional() }),
    filter: "deck_id",
  },
  dares: {
    order: "sort",
    schema: z.object({ tier: z.enum(["Flirty", "Steamy", "Spicy", "Unhinged"]), text: z.string().trim().min(3).max(280), needs_media: z.boolean().optional(), sort: z.number().int().min(0).optional(), enabled: z.boolean().optional() }),
    filter: "tier",
  },
  date_kits: {
    order: "sort",
    schema: z.object({
      slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
      title: z.string().trim().min(2).max(60),
      minutes: z.number().int().min(10).max(600),
      blurb: z.string().trim().min(3).max(240),
      steps: z.array(z.string().trim().min(2).max(200)).min(1).max(12),
      prompts: z.array(z.string().trim().min(2).max(200)).max(12),
      playlist_url: z.url().nullable().optional(),
      sort: z.number().int().min(0).optional(),
      enabled: z.boolean().optional(),
    }),
    filter: null,
  },
  challenge_templates: {
    order: "sort",
    schema: z.object({ slug: z.string().regex(/^[a-z0-9-]{3,40}$/), title: z.string().trim().min(2).max(60), days: z.union([z.literal(7), z.literal(30)]), blurb: z.string().trim().min(3).max(240), daily_prompt: z.string().trim().min(3).max(240), sort: z.number().int().min(0).optional(), enabled: z.boolean().optional() }),
    filter: null,
  },
  stickers: {
    order: "sort",
    schema: z.object({ id: z.string().regex(/^[a-z0-9-]{2,30}$/), pack: z.string().regex(/^[a-z0-9-]{2,30}$/).optional(), label: z.string().trim().min(1).max(10), sort: z.number().int().min(0).optional(), enabled: z.boolean().optional() }),
    filter: "pack",
  },
  decks: {
    order: "sort",
    schema: z.object({ tier: z.enum(["Flirty", "Steamy", "Spicy", "Unhinged"]), title: z.string().trim().min(2).max(60), sort: z.number().int().min(0).optional(), enabled: z.boolean().optional() }),
    filter: null,
  },
} as const;
export type ContentTable = keyof typeof CONTENT;
export const isContentTable = (t: string): t is ContentTable => t in CONTENT;
