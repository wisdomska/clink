import { test, expect } from "./fixtures";
import { pickOption } from "./controls";
import { admin, adminSignIn } from "./helpers";

test("admin tables: pages, sizes, sorting and filters live in the URL; CSV exports the full set", async ({
  couple,
  browser,
}) => {
  const { nia } = couple;
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await adminSignIn(p);

  // API: page + size + total, size limited to 25/50/100, stable ids across pages.
  const page1 = await (await p.request.get("/api/admin/users?page=1&size=25")).json();
  expect(page1.size).toBe(25);
  expect(page1.users.length).toBeLessThanOrEqual(25);
  expect(page1.total).toBeGreaterThanOrEqual(page1.users.length);
  const odd = await (await p.request.get("/api/admin/users?size=7")).json();
  expect(odd.size).toBe(25);
  if (page1.total > 25) {
    const page2 = await (await p.request.get("/api/admin/users?page=2&size=25")).json();
    const ids = new Set(page1.users.map((u: { id: string }) => u.id));
    expect(page2.users.some((u: { id: string }) => ids.has(u.id))).toBe(false);
  }
  // Filters and sorting on the server.
  const linked = await (
    await p.request.get(`/api/admin/users?linked=linked&q=${encodeURIComponent(nia.email)}`)
  ).json();
  expect(linked.users[0].email).toBe(nia.email);
  const unlinked = await (
    await p.request.get(`/api/admin/users?linked=unlinked&q=${encodeURIComponent(nia.email)}`)
  ).json();
  expect(unlinked.total).toBe(0);

  // CSV is the whole filtered set, as a download.
  const csv = await p.request.get(`/api/admin/users?format=csv&q=${encodeURIComponent(nia.email)}`);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain(nia.email);
  for (const url of ["/api/admin/reports?status=all&format=csv", "/api/admin/audit?format=csv"]) {
    const r = await p.request.get(url);
    expect(r.ok(), url).toBeTruthy();
    expect(r.headers()["content-type"]).toContain("text/csv");
  }

  // Audit log: paged, and a malformed user filter is ignored rather than injected.
  const audit = await (
    await p.request.get("/api/admin/audit?page=1&size=50&user=x),event.eq.y")
  ).json();
  expect(audit.size).toBe(50);
  expect(typeof audit.total).toBe("number");

  // Content library pages.
  const kits = await (await p.request.get("/api/admin/content/date_kits?page=1&size=25")).json();
  expect(typeof kits.total).toBe("number");
  expect(kits.rows.length).toBeLessThanOrEqual(25);

  // UI: filters, sort and size go in the URL and reset to page 1.
  await p.goto("/admin/users?page=2");
  await pickOption(p, "Status", "Active");
  await expect(p).toHaveURL(/status=active/);
  await expect(p).not.toHaveURL(/page=2/);
  await p.getByRole("button", { name: /^Joined(?! (from|to))/ }).click();
  await expect(p).toHaveURL(/sort=joined/);
  await expect(
    p.getByText(/^Showing [\d,]+-[\d,]+ of [\d,]+ accounts?$|^No accounts$/),
  ).toBeVisible();
  await pickOption(p, "Per page", "50");
  await expect(p).toHaveURL(/size=50/);
  await p.reload();
  await expect(p.getByLabel("Per page")).toHaveText("50");
  await expect(p.getByLabel("Status")).toHaveText("Active");
  await ctx.close();
});

test("admin triage and support tools: notes, assignment, ages, audited support actions", async ({
  couple,
  browser,
}) => {
  const { nia } = couple;
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const me = await adminSignIn(p);

  const old = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
  const { data: rep, error } = await admin
    .from("reports")
    .insert({
      reporter_id: nia.id,
      category: "other",
      details: "Triage test report 5521",
      created_at: old,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Assign to me and add an internal note; both show in the history.
  expect(
    (await p.request.patch(`/api/admin/reports/${rep!.id}`, { data: { assignToMe: true } })).ok(),
  ).toBeTruthy();
  expect(
    (
      await p.request.post(`/api/admin/reports/${rep!.id}/notes`, {
        data: { body: "Checked the screenshots 5521" },
      })
    ).status(),
  ).toBe(201);
  const notes = await (await p.request.get(`/api/admin/reports/${rep!.id}/notes`)).json();
  expect(notes.notes.map((n: { body: string }) => n.body)).toEqual(
    expect.arrayContaining(["Checked the screenshots 5521", "Marked as assigned"]),
  );

  await p.goto(`/admin/reports?status=all&id=${rep!.id}`);
  const card = p.getByRole("article").filter({ hasText: "Triage test report 5521" });
  await expect(card.getByText("Assigned to you")).toBeVisible({ timeout: 15000 });
  await expect(card.getByText(/Open for \d+ h/)).toBeVisible();
  await expect(p.getByText("Updated just now")).toBeVisible();
  await card.getByRole("button", { name: "Notes and history" }).click();
  await expect(card.getByText("Checked the screenshots 5521")).toBeVisible();

  // Support tools need a reason, and are audited with the admin's email.
  const bare = await p.request.post(`/api/admin/users/${nia.id}`, {
    data: { action: "sign_out_all" },
  });
  expect(bare.status()).toBe(422);
  const out = await p.request.post(`/api/admin/users/${nia.id}`, {
    data: { action: "sign_out_all", reason: "Lost device" },
  });
  expect(out.ok()).toBeTruthy();
  const noDark = await p.request.post(`/api/admin/users/${nia.id}`, {
    data: { action: "clear_dark_lockout", reason: "Locked out" },
  });
  expect([200, 409]).toContain(noDark.status());
  const { data: log } = await admin
    .from("audit_events")
    .select("meta")
    .eq("event", "admin.sign_out_all")
    .eq("user_id", nia.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  expect(log?.meta).toMatchObject({ reason: "Lost device", admin: me.email });

  // The user page shows the support tools with confirm + reason.
  await p.goto(`/admin/users/${nia.id}`);
  await p.getByRole("button", { name: "Sign out everywhere" }).click();
  const dlg = p.getByRole("dialog", { name: "Sign them out everywhere?" });
  await expect(dlg).toBeVisible();
  await dlg.getByRole("button", { name: "Cancel" }).click();

  await admin.from("reports").delete().eq("id", rep!.id);
  await ctx.close();
});

test("admin shell: command palette and keyboard shortcuts", async ({ couple, browser }) => {
  const { nia } = couple;
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await adminSignIn(p);
  await p.goto("/admin");
  await expect(p.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15000 });

  // g then r goes to reports; ? lists the shortcuts.
  await p.keyboard.press("g");
  await p.keyboard.press("r");
  await expect(p).toHaveURL(/\/admin\/reports/);
  await p.keyboard.press("Shift+?");
  await expect(p.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  await p.keyboard.press("Escape");

  // Ctrl+K: find a person by email and open them.
  await p.keyboard.press("Control+k");
  const box = p.getByRole("combobox", { name: "Go to a page or find a person" });
  await expect(box).toBeFocused();
  await box.fill(nia.email);
  const person = p.getByRole("option", { name: new RegExp(`^Nia.*${nia.email}`) });
  await expect(person).toBeVisible({ timeout: 15000 });
  await person.click();
  await expect(p).toHaveURL(new RegExp(`/admin/users/${nia.id}`));

  // "/" focuses the page search.
  await p.goto("/admin/users");
  await p.getByRole("heading", { name: "Users and couples" }).click();
  await p.keyboard.press("/");
  await expect(p.getByLabel("Search by email or name")).toBeFocused();
  await ctx.close();
});
