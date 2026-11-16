import { AVATAR_KEYS } from "./avatars";
import { z } from "zod";

/** Zod schemas shared by client forms and server routes. */
export const dobSchema = z.object({
  day: z.coerce.number().int().min(1).max(31),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1900).max(2100),
});

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "That email looks off. Missing a dot somewhere?" }));

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Give us something to call you.").max(40),
  avatar_icon: z.enum(AVATAR_KEYS).optional(),
  home_city: z.string().trim().min(1).max(80).optional(),
  country: z.string().trim().max(80).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  partner_nickname: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(160).optional(),
  love_language: z.enum(["words", "touch", "time", "gifts", "acts"]).nullable().optional(),
  share_birthday: z.boolean().optional(),
  gender: z.enum(["woman", "man", "unspecified"]).nullable().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{6,20}$/, "Use digits, spaces and an optional +.")
    .optional()
    .or(z.literal("")),
  finish: z.boolean().optional(),
});

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-HJ-NP-Z2-9]{6}$/, "Codes are 6 letters and numbers."),
});

export const uuid = z.uuid();
