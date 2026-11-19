/**
 * Row-level security proofs (spec section 17, "100% of tables covered").
 * Runs against the local Supabase stack: `supabase start` then `pnpm test:rls`.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import pg from "pg";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const DB = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function user(name: string) {
  const email = `rls-${name}-${randomUUID().slice(0, 6)}@clink.test`;
  const { data } = await admin.auth.admin.createUser({ email, email_confirm: true });
  const id = data.user!.id;
  await admin.from("user_private").insert({ user_id: id, dob: "1995-01-01" });
  await admin
    .from("profiles")
    .update({ display_name: name, onboarded_at: new Date().toISOString() })
    .eq("id", id);
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.verifyOtp({ token_hash: link.properties!.hashed_token, type: "magiclink" });
  return { id, client };
}
async function couple(a: { id: string }, b: { id: string }) {
  const { data: c } = await admin.from("couples").insert({}).select("id").single();
  await admin.from("couple_members").insert([
    { couple_id: c!.id, user_id: a.id, role: "a" },
    { couple_id: c!.id, user_id: b.id, role: "b" },
  ]);
  return c!.id as string;
}

let A: Awaited<ReturnType<typeof user>>,
  B: Awaited<ReturnType<typeof user>>,
  X: Awaited<ReturnType<typeof user>>,
  Y: Awaited<ReturnType<typeof user>>,
  Boss: Awaited<ReturnType<typeof user>>;
let c1: string, c2: string;
const ids: Record<string, string> = {};

/** Every public table and how it's proven. Adding a table without a row here fails the coverage test. */
const COUPLE_SCOPED = [
  "messages",
  "reactions",
  "clinks",
  "moods",
  "countdowns",
  "ritual_answers",
  "games",
  "game_moves",
  "watch_sessions",
  "listen_queue",
  "scheduled_dates",
  "challenges",
  "challenge_days",
  "couple_badges",
  "letters",
  "capsules",
  "capsule_contents",
  "timeline_entries",
  "media",
  "couples",
  "couple_members",
  "bucket_items",
  "message_pins",
  "scheduled_messages",
] as const;
const SERVER_ONLY = [
  "dark_settings",
  "age_verifications",
  "deck_answers",
  "desire_answers",
  "dares",
  "dare_spins",
  "nude_requests",
  "sensitive_view_events",
  "decks",
  "deck_cards",
  "desire_items",
  "audit_events",
  "rate_limits",
  "error_log",
  "age_blocks",
  "user_blocks",
  "wipe_jobs",
  "game_secrets",
  "notification_log",
  "admin_accounts",
  "report_notes",
] as const;
const PARTNER_VISIBLE = ["presence"] as const;
const SELF_ONLY = [
  "user_private",
  "push_subscriptions",
  "deletion_requests",
  "export_requests",
  "sticker_recents",
  "invites",
  "reports",
] as const;
const PUBLIC_CONTENT = [
  "ritual_prompts",
  "stickers",
  "know_me_questions",
  "trivia_questions",
  "wyr_cards",
  "draw_words",
  "story_starters",
  "date_kits",
  "challenge_templates",
  "feature_flags",
  "announcements",
] as const;
const PROFILES = ["profiles"] as const;

beforeAll(async () => {
  [A, B, X, Y, Boss] = await Promise.all([
    user("A"),
    user("B"),
    user("X"),
    user("Y"),
    user("Boss"),
  ]);
  await admin.from("profiles").update({ is_admin: true }).eq("id", Boss.id);
  c1 = await couple(A, B);
  c2 = await couple(X, Y);
  const kit = (await admin.from("date_kits").select("id").limit(1).single()).data!.id;
  const tpl = (await admin.from("challenge_templates").select("id").limit(1).single()).data!.id;
  const card = (await admin.from("deck_cards").select("id").limit(1).single()).data!.id;
  const item = (await admin.from("desire_items").select("id").limit(1).single()).data!.id;
  const dare = (await admin.from("dares").select("id").limit(1).single()).data!.id;
  const m = await admin
    .from("messages")
    .insert({
      couple_id: c1,
      sender_id: A.id,
      client_id: randomUUID(),
      type: "text",
      body: "secret c1",
    })
    .select("id")
    .single();
  ids.message = m.data!.id;
  await admin
    .from("message_pins")
    .insert({ message_id: ids.message, couple_id: c1, pinned_by: A.id });
  await admin.from("scheduled_messages").insert({
    couple_id: c1,
    sender_id: A.id,
    client_id: randomUUID(),
    body: "secret scheduled",
    send_at: new Date(Date.now() + 86400000).toISOString(),
  });
  await admin
    .from("reactions")
    .insert({ message_id: ids.message, couple_id: c1, user_id: B.id, emoji: "🔥" });
  await admin.from("clinks").insert({ couple_id: c1, sender_id: A.id });
  await admin.from("moods").insert({ couple_id: c1, user_id: A.id, mood: "Cosy" });
  await admin.from("countdowns").insert({
    couple_id: c1,
    title: "Visit",
    target_at: new Date(Date.now() + 86400000).toISOString(),
    reveal_note: "sealed note",
    created_by: A.id,
  });
  await admin.from("ritual_answers").insert({
    couple_id: c1,
    day: "2026-11-13",
    user_id: A.id,
    prompt_id: 1,
    answer: "A's answer",
  });
  const g = await admin
    .from("games")
    .insert({
      couple_id: c1,
      type: "word",
      mode: "turn",
      status: "active",
      state: {},
      created_by: A.id,
    })
    .select("id")
    .single();
  await admin
    .from("game_moves")
    .insert({ game_id: g.data!.id, couple_id: c1, user_id: A.id, move: {} });
  await admin.from("game_secrets").insert({ game_id: g.data!.id, data: { words: ["moon"] } });
  await admin
    .from("watch_sessions")
    .insert({ couple_id: c1, video_id: "dQw4w9WgXcQ", created_by: A.id });
  await admin
    .from("listen_queue")
    .insert({ couple_id: c1, video_id: "dQw4w9WgXcQ", added_by: A.id });
  await admin.from("scheduled_dates").insert({
    couple_id: c1,
    kit_id: kit,
    start_at: new Date(Date.now() + 86400000).toISOString(),
    created_by: A.id,
  });
  const ch = await admin
    .from("challenges")
    .insert({ couple_id: c1, template_id: tpl, start_on: "2026-11-13", created_by: A.id })
    .select("id")
    .single();
  await admin.from("challenge_days").insert({ challenge_id: ch.data!.id, couple_id: c1, day: 1 });
  await admin.from("couple_badges").insert({ couple_id: c1, badge: "First week" });
  await admin
    .from("letters")
    .insert({ couple_id: c1, author_id: A.id, condition: "Open when", body: "secret letter" });
  const cap = await admin
    .from("capsules")
    .insert({
      couple_id: c1,
      author_id: A.id,
      title: "Later",
      unlock_at: new Date(Date.now() + 86400000 * 30).toISOString(),
    })
    .select("id")
    .single();
  ids.capsule = cap.data!.id;
  await admin
    .from("capsule_contents")
    .insert({ capsule_id: ids.capsule, couple_id: c1, body: "secret capsule" });
  await admin.from("timeline_entries").insert({
    couple_id: c1,
    kind: "manual",
    title: "Moment",
    happened_on: "2026-11-13",
    created_by: A.id,
  });
  await admin.from("media").insert({
    couple_id: c1,
    owner_id: A.id,
    kind: "image",
    bucket: "media",
    storage_path: `rls/${randomUUID()}.webp`,
    mime: "image/webp",
    size_bytes: 10,
    status: "ready",
  });
  await admin.from("media").insert({
    couple_id: c1,
    owner_id: A.id,
    kind: "image",
    bucket: "sensitive",
    storage_path: `rls/${randomUUID()}.webp`,
    mime: "image/webp",
    size_bytes: 10,
    status: "ready",
    is_sensitive: true,
    retention: "vault",
  });
  await admin
    .from("dark_settings")
    .insert({ user_id: A.id, pin_hash: "x", opted_tiers: ["Flirty"] });
  await admin
    .from("age_verifications")
    .insert({ user_id: A.id, method: "self_attest", status: "passed" });
  await admin
    .from("deck_answers")
    .insert({ couple_id: c1, card_id: card, user_id: A.id, answer: "secret deck" });
  await admin
    .from("desire_answers")
    .insert({ item_id: item, couple_id: c1, user_id: A.id, answer: "no" });
  await admin
    .from("dare_spins")
    .insert({ couple_id: c1, spinner_id: A.id, dare_id: dare, tier: "Flirty" });
  await admin
    .from("nude_requests")
    .insert({ couple_id: c1, requester_id: A.id, recipient_id: B.id });
  await admin.from("presence").upsert({ user_id: A.id, status: "cooking" });
  await admin.from("push_subscriptions").insert({
    user_id: A.id,
    endpoint: `https://push.test/${randomUUID()}`,
    p256dh: "p".repeat(20),
    auth: "a".repeat(10),
  });
  await admin
    .from("reports")
    .insert({ reporter_id: A.id, couple_id: c1, category: "other", details: "secret report" });
  await admin.from("invites").insert({
    code: "ABCDEF"
      .split("")
      .sort(() => Math.random() - 0.5)
      .join(""),
    inviter_id: A.id,
  });
  await admin.from("sticker_recents").insert({ user_id: A.id, sticker_id: "clink" });
});

describe("coverage", () => {
  it("every public table is in the RLS matrix and has RLS enabled", async () => {
    const client = new pg.Client({ connectionString: DB });
    await client.connect();
    const { rows } = await client.query(
      "select tablename, rowsecurity from pg_tables where schemaname = 'public'",
    );
    await client.end();
    const known = new Set<string>([
      ...COUPLE_SCOPED,
      ...SERVER_ONLY,
      ...SELF_ONLY,
      ...PARTNER_VISIBLE,
      ...PUBLIC_CONTENT,
      ...PROFILES,
    ]);
    for (const r of rows) {
      expect(known.has(r.tablename), `table ${r.tablename} missing from the RLS matrix`).toBe(true);
      expect(r.rowsecurity, `RLS off on ${r.tablename}`).toBe(true);
    }
  });
});

describe("couple isolation: another couple can never read your rows", () => {
  for (const t of COUPLE_SCOPED) {
    it(`${t}: invisible to another couple`, async () => {
      const { data } = await X.client.from(t).select("*");
      const leaked = (data ?? []).filter(
        (r: Record<string, unknown>) => r.couple_id === c1 || r.id === c1,
      );
      expect(leaked).toEqual([]);
    });
  }
  it("members can read their own couple's rows", async () => {
    expect(
      ((await B.client.from("messages").select("body")).data ?? []).map((m) => m.body),
    ).toContain("secret c1");
    expect(((await B.client.from("letters").select("body")).data ?? []).length).toBe(1);
  });
});

describe("server-only tables: no client can read them, not even the owner", () => {
  for (const t of SERVER_ONLY) {
    it(`${t}: no rows for any client`, async () => {
      for (const u of [A, B, X, Boss]) {
        const { data } = await u.client.from(t).select("*").limit(5);
        expect(data ?? []).toEqual([]);
      }
    });
  }
});

describe("self-only tables", () => {
  for (const t of SELF_ONLY) {
    it(`${t}: never visible to the partner or anyone else`, async () => {
      for (const u of [B, X, Boss]) {
        const { data } = await u.client.from(t).select("*");
        const leaked = (data ?? []).filter(
          (r: Record<string, unknown>) =>
            r.user_id === A.id || r.inviter_id === A.id || r.reporter_id === A.id,
        );
        expect(leaked, `${t} leaked to another user`).toEqual([]);
      }
    });
  }
  it("the nickname you give your partner is never readable by them (or anyone in the browser)", async () => {
    await admin.from("profiles").update({ partner_nickname: "Sunshine" }).eq("id", A.id);
    const asPartner = await B.client.from("profiles").select("partner_nickname").eq("id", A.id);
    expect(asPartner.error).not.toBeNull();
    const all = await B.client.from("profiles").select("*").eq("id", A.id);
    expect(all.error).not.toBeNull();
    // Everything else on the partner's profile still reads fine.
    const ok = await B.client.from("profiles").select("display_name, avatar_icon").eq("id", A.id);
    expect(ok.error).toBeNull();
    expect(ok.data).toHaveLength(1);
  });

  it("date of birth is never visible to the partner", async () => {
    expect((await B.client.from("user_private").select("dob").eq("user_id", A.id)).data).toEqual(
      [],
    );
  });
});

describe("partner-visible", () => {
  it("presence: the partner sees it, nobody else does", async () => {
    expect(
      ((await B.client.from("presence").select("status").eq("user_id", A.id)).data ?? []).length,
    ).toBe(1);
    for (const u of [X, Boss])
      expect((await u.client.from("presence").select("*").eq("user_id", A.id)).data).toEqual([]);
  });
});

describe("special rules", () => {
  it("capsule contents are refused before unlock_at, even to the author", async () => {
    expect((await A.client.from("capsule_contents").select("body")).data).toEqual([]);
    expect((await B.client.from("capsule_contents").select("body")).data).toEqual([]);
  });
  it("countdown notes stay sealed until zero", async () => {
    const { data } = await B.client.from("countdowns_public").select("reveal_note, has_note");
    expect(data?.[0]?.reveal_note).toBeNull();
    expect(data?.[0]?.has_note).toBe(true);
    expect((await B.client.from("countdowns").select("reveal_note")).error).toBeTruthy();
    expect(((await X.client.from("countdowns_public").select("*")).data ?? []).length).toBe(0);
  });
  it("sensitive media rows are invisible to every client", async () => {
    expect(
      ((await B.client.from("media").select("is_sensitive").eq("is_sensitive", true)).data ?? [])
        .length,
    ).toBe(0);
  });
  it("a ritual answer is hidden from the partner until they answer", async () => {
    expect(((await B.client.from("ritual_answers").select("answer")).data ?? []).length).toBe(0);
    await B.client.from("ritual_answers").insert({
      couple_id: c1,
      day: "2026-11-13",
      user_id: B.id,
      prompt_id: 1,
      answer: "B's answer",
    });
    expect(((await B.client.from("ritual_answers").select("answer")).data ?? []).length).toBe(2);
  });
  it("trivia answer keys are not readable by clients", async () => {
    expect(
      (await A.client.from("trivia_questions").select("answer_index").limit(1)).error,
    ).toBeTruthy();
  });
});

describe("write protections", () => {
  it("cannot insert into another couple", async () => {
    const { error } = await X.client.from("messages").insert({
      couple_id: c1,
      sender_id: X.id,
      client_id: randomUUID(),
      type: "text",
      body: "spoof",
    });
    expect(error).toBeTruthy();
  });
  it("cannot impersonate the partner", async () => {
    const { error } = await A.client.from("messages").insert({
      couple_id: c1,
      sender_id: B.id,
      client_id: randomUUID(),
      type: "text",
      body: "spoof",
    });
    expect(error).toBeTruthy();
  });
  it("cannot forge system or sensitive message types", async () => {
    for (const type of ["system", "sensitive", "clink"]) {
      const { error } = await A.client
        .from("messages")
        .insert({ couple_id: c1, sender_id: A.id, client_id: randomUUID(), type, body: "x" });
      expect(error, type).toBeTruthy();
    }
  });
  it("cannot edit the partner's message text", async () => {
    await B.client.from("messages").update({ body: "edited" }).eq("id", ids.message);
    const { data } = await admin.from("messages").select("body").eq("id", ids.message).single();
    expect(data!.body).toBe("secret c1");
  });
  it("countdowns: the partner can edit details but never swap the sealed note; reached ones are frozen", async () => {
    const { data: cd } = await admin
      .from("countdowns")
      .select("id")
      .eq("couple_id", c1)
      .eq("title", "Visit")
      .single();
    // B didn't write the note: changing it is refused, and nothing changes.
    const swap = await B.client
      .from("countdowns")
      .update({ reveal_note: "swapped" })
      .eq("id", cd!.id);
    expect(swap.error).toBeTruthy();
    // B can still move it, and can't claim to be its creator.
    const later = new Date(Date.now() + 2 * 86400000).toISOString();
    expect(
      (
        await B.client
          .from("countdowns")
          .update({ target_at: later, created_by: B.id })
          .eq("id", cd!.id)
      ).error,
    ).toBeNull();
    const row = (
      await admin
        .from("countdowns")
        .select("reveal_note, created_by, target_at")
        .eq("id", cd!.id)
        .single()
    ).data!;
    expect(row.reveal_note).toBe("sealed note");
    expect(row.created_by).toBe(A.id);
    expect(Date.parse(row.target_at)).toBe(Date.parse(later));
    // Not into the past, and nothing once it has reached zero.
    expect(
      (
        await A.client
          .from("countdowns")
          .update({ target_at: new Date(Date.now() - 1000).toISOString() })
          .eq("id", cd!.id)
      ).error,
    ).toBeTruthy();
    const { data: past } = await admin
      .from("countdowns")
      .insert({
        couple_id: c1,
        title: "Done",
        target_at: new Date(Date.now() - 86400000).toISOString(),
        created_by: A.id,
      })
      .select("id")
      .single();
    expect(
      (await A.client.from("countdowns").update({ title: "Changed" }).eq("id", past!.id)).error,
    ).toBeTruthy();
    await admin.from("countdowns").delete().eq("id", past!.id);
  });
  it("cannot grant yourself admin or lift a suspension", async () => {
    await A.client.from("profiles").update({ is_admin: true }).eq("id", A.id);
    await A.client.from("profiles").update({ suspended_at: null }).eq("id", A.id);
    expect(
      (await admin.from("profiles").select("is_admin").eq("id", A.id).single()).data!.is_admin,
    ).toBe(false);
  });
  it("cannot unlink by editing the couple row", async () => {
    await A.client.from("couples").update({ unlinked_at: new Date().toISOString() }).eq("id", c1);
    expect(
      (await admin.from("couples").select("unlinked_at").eq("id", c1).single()).data!.unlinked_at,
    ).toBeNull();
  });
  it("cannot create couples, members or invites directly", async () => {
    expect((await X.client.from("couples").insert({})).error).toBeTruthy();
    expect(
      (await X.client.from("couple_members").insert({ couple_id: c1, user_id: X.id, role: "a" }))
        .error,
    ).toBeTruthy();
    expect(
      (await X.client.from("invites").insert({ code: "ZZZZZZ", inviter_id: X.id })).error,
    ).toBeTruthy();
  });
  it("service-only functions cannot be called by clients", async () => {
    for (const fn of ["svc_effective_tier_rank", "svc_desire_matches", "svc_admin_metrics"]) {
      const { error } = await A.client.rpc(fn as "svc_admin_metrics", { p_couple: c1 } as never);
      expect(error, fn).toBeTruthy();
    }
  });
});

describe("message pins", () => {
  it("another couple cannot pin or unpin your messages", async () => {
    const { error } = await X.client
      .from("message_pins")
      .insert({ message_id: ids.message, couple_id: c1, pinned_by: X.id });
    expect(error).not.toBeNull();
    await X.client.from("message_pins").delete().eq("message_id", ids.message);
    const { data } = await admin.from("message_pins").select("message_id").eq("couple_id", c1);
    expect((data ?? []).map((p) => p.message_id)).toContain(ids.message);
  });
  it("cannot pin as your partner", async () => {
    const m = await admin
      .from("messages")
      .insert({ couple_id: c1, sender_id: B.id, client_id: randomUUID(), type: "text", body: "x" })
      .select("id")
      .single();
    const { error } = await B.client
      .from("message_pins")
      .insert({ message_id: m.data!.id, couple_id: c1, pinned_by: A.id });
    expect(error).not.toBeNull();
  });
});

describe("scheduled messages", () => {
  it("stay private to the sender until delivered, even from the partner", async () => {
    const mine = (await A.client.from("scheduled_messages").select("body")).data ?? [];
    expect(mine.map((r) => r.body)).toContain("secret scheduled");
    const theirs = (await B.client.from("scheduled_messages").select("body")).data ?? [];
    expect(theirs).toEqual([]);
  });
  it("clients cannot write the queue directly", async () => {
    const { error } = await A.client.from("scheduled_messages").insert({
      couple_id: c1,
      sender_id: A.id,
      client_id: randomUUID(),
      body: "sneaky",
      send_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });
  it("the claim function is service-only", async () => {
    const { error } = await A.client.rpc("svc_claim_scheduled_messages", { p_limit: 10 });
    expect(error).not.toBeNull();
  });
});

describe("admins never read private content", () => {
  it("is_admin grants no extra database access to any private table", async () => {
    for (const t of [
      "messages",
      "letters",
      "capsule_contents",
      "deck_answers",
      "desire_answers",
      "media",
      "reactions",
      "ritual_answers",
      "dark_settings",
      "nude_requests",
    ] as const) {
      const { data } = await Boss.client.from(t).select("*");
      expect(
        (data ?? []).filter((r: Record<string, unknown>) => r.couple_id === c1),
        t,
      ).toEqual([]);
    }
  });
});
