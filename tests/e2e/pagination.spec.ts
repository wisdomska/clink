import { test, expect } from "./fixtures";
import { admin } from "./helpers";
import { expectNoHorizontalScroll } from "./no-horizontal-scroll";

/** Long lists load 20 at a time with a cursor; the rest arrives on scroll or "Load more". */
test.describe("Pagination (cursor based)", () => {
  test("timeline: API pages with a cursor, the screen loads more and nothing repeats", async ({
    couple,
  }) => {
    const { a, b, nia } = couple;
    const { data: member } = await admin
      .from("couple_members")
      .select("couple_id")
      .eq("user_id", nia.id)
      .is("left_at", null)
      .single();
    const coupleId = member!.couple_id;
    // 45 manual moments on distinct days, plus several sharing one day to test the id tie-breaker.
    const rows = Array.from({ length: 45 }, (_, i) => ({
      couple_id: coupleId,
      kind: "manual",
      title: `Moment ${String(i + 1).padStart(2, "0")}`,
      happened_on: new Date(Date.UTC(2025, 0, 1 + Math.floor(i / 3))).toISOString().slice(0, 10),
      created_by: nia.id,
    }));
    const { error } = await admin.from("timeline_entries").insert(rows);
    expect(error).toBeNull();

    // API: cursor in, nextCursor out, no repeats across pages, RLS still scopes it.
    const ids: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r = await a.request.get(
        `/api/timeline?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      expect(r.ok()).toBeTruthy();
      const page = (await r.json()) as { items: Array<{ id: string }>; nextCursor: string | null };
      expect(page.items.length).toBeLessThanOrEqual(20);
      ids.push(...page.items.map((x) => x.id));
      cursor = page.nextCursor;
      pages++;
    } while (cursor && pages < 10);
    expect(pages).toBe(3);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(45);
    // The partner sees the same shared timeline.
    const theirs = await (await b.request.get("/api/timeline?limit=50")).json();
    expect(theirs.items.length).toBeGreaterThanOrEqual(45);

    // Screen: the first page renders, the rest arrives by scrolling (sentinel) or "Load more".
    await a.goto("/keep/timeline");
    const entries = a.locator("ol > li", { hasText: /Moment \d\d/ });
    // One slot on the first page can be the automatic "linked" moment.
    await expect.poll(() => entries.count()).toBeGreaterThanOrEqual(19);
    await expectNoHorizontalScroll(a);
    for (let i = 0; i < 5 && (await entries.count()) < 45; i++) {
      const more = a.getByRole("button", { name: "Load more" });
      if (await more.isVisible()) await more.click();
      else await a.mouse.wheel(0, 4000);
      await a.waitForTimeout(400);
    }
    await expect(entries).toHaveCount(45);
    const titles = await entries.locator("div.font-medium").allTextContents();
    expect(new Set(titles).size).toBe(45);
    await expect(a.getByRole("button", { name: "Load more" })).toHaveCount(0);
    await expect(a.getByText("Moment 01")).toBeVisible();
  });

  test("timeline: removing your own moment offers Undo, and Undo brings it back", async ({
    couple,
  }) => {
    const { a, nia } = couple;
    const { data: member } = await admin
      .from("couple_members")
      .select("couple_id")
      .eq("user_id", nia.id)
      .is("left_at", null)
      .single();
    await admin.from("timeline_entries").insert({
      couple_id: member!.couple_id,
      kind: "manual",
      title: "Picnic in the rain",
      happened_on: "2025-06-01",
      created_by: nia.id,
    });
    await a.goto("/keep/timeline");
    await a.getByRole("button", { name: "Remove Picnic in the rain" }).click();
    await expect(a.getByText("Picnic in the rain")).toBeHidden();
    await a.getByRole("button", { name: "Undo" }).click();
    await expect(a.getByText("Picnic in the rain")).toBeVisible();
    // Nothing was deleted on the server.
    const { data } = await admin
      .from("timeline_entries")
      .select("id")
      .eq("couple_id", member!.couple_id)
      .eq("title", "Picnic in the rain");
    expect(data).toHaveLength(1);
  });
});
