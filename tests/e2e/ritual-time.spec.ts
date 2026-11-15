import { createClient } from "@supabase/supabase-js";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// HOME-08: the ritual time changes only when both partners agree.
test("ritual time needs both partners to agree", async ({ couple }) => {
  const { a, b, nia, theo } = couple;
  await a.goto("/settings");
  await a.getByLabel(/Ritual time/).fill("20:30");
  await a.getByRole("button", { name: "Suggest" }).click();
  await expect(a.getByText(`You suggested 20:30. Waiting for ${theo.name}.`)).toBeVisible();

  await b.goto("/settings");
  // Wait for the settled screen (a navigation can briefly overlap two renders).
  await expect(b.getByText(`${nia.name} suggested 20:30.`)).toHaveCount(1);
  await expect(b.getByText(`${nia.name} suggested 20:30.`)).toBeVisible();
  await b.getByRole("button", { name: "Agree" }).click();
  await expect(b.getByText("Agreed. Ritual at 20:30.")).toBeVisible();

  // Neither partner can skip the agreement by writing to the database directly.
  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: theo.email,
  });
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  await db.auth.verifyOtp({ token_hash: link.properties!.hashed_token, type: "magiclink" });
  const { data: mine } = await db.from("couples").select("id, ritual_time").single();
  expect(mine!.ritual_time.slice(0, 5)).toBe("20:30");
  const { error } = await db.from("couples").update({ ritual_time: "06:00" }).eq("id", mine!.id);
  expect(error).not.toBeNull();
});
