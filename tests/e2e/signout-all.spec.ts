import { createClient } from "@supabase/supabase-js";
import { test, expect } from "./fixtures";
import { admin } from "./helpers";

// ACC-09: signing out everywhere cuts off tokens already issued to other devices.
test("sign out of all devices revokes other sessions at once", async ({ couple }) => {
  const { b, theo } = couple;
  // A second device: its own session and access token.
  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: theo.email,
  });
  const phone = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await phone.auth.verifyOtp({ token_hash: link.properties!.hashed_token, type: "magiclink" });
  expect((await phone.from("couples").select("id")).data).toHaveLength(1);

  expect((await b.request.post("/api/auth/signout", { data: { everywhere: true } })).ok()).toBe(
    true,
  );

  // The old access token has not expired, but it no longer sees couple data.
  expect((await phone.from("couples").select("id")).data).toEqual([]);
  expect((await phone.from("messages").select("id")).data).toEqual([]);
  // And this browser is signed out of the app.
  expect((await b.request.get("/api/me/state")).status()).toBe(401);
});
