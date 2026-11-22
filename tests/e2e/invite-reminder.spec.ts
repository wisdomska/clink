import { test, expect } from "./fixtures";
import { admin, makeUser, signIn } from "./helpers";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () =>
  Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
const hours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
// A fixed-offset zone where it's midday now, so quiet hours never hold the reminder.
const middayZone = () => {
  let o = (((12 - new Date().getUTCHours()) % 24) + 24) % 24;
  if (o > 14) o -= 24;
  return o === 0 ? "UTC" : `Etc/GMT${o > 0 ? "-" : "+"}${Math.abs(o)}`;
};

test("a code shared a day ago and still unused gets a reminder, and an expired one says so", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const esi = await makeUser("Esi");
  await admin.from("profiles").update({ timezone: middayZone() }).eq("id", esi.id);
  const { data: inv } = await admin
    .from("invites")
    .insert({ code: code(), inviter_id: esi.id, created_at: hours(-25), expires_at: hours(23) })
    .select("id")
    .single();
  await signIn(page, esi, "/us");

  // Us says who you're waiting for and how long the code still works.
  await expect(page.getByRole("heading", { name: "Waiting for your partner" })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("Your code works for 23 more hours.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Send it again" })).toHaveAttribute("href", "/link");

  // The 5-minute job sends one reminder for that code, never two.
  const tick = async () => {
    const r = await page.request.post("/api/jobs/tick", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(r.ok()).toBeTruthy();
  };
  const reminded = async () =>
    (await admin.from("invites").select("reminded_at").eq("id", inv!.id).single()).data!
      .reminded_at;
  await tick();
  const first = await reminded();
  expect(first).not.toBeNull();
  await tick();
  expect(await reminded()).toBe(first);

  // Once it runs out, Us says so and offers a fresh one.
  await admin
    .from("invites")
    .update({ expires_at: hours(-1) })
    .eq("id", inv!.id);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your code ran out" })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("link", { name: "Get a fresh code" })).toHaveAttribute(
    "href",
    "/link",
  );
});
