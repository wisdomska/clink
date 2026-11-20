import { test, expect } from "./fixtures";
import { admin } from "./helpers";

const lastCall = async (coupleId: string) =>
  (
    await admin
      .from("messages")
      .select("body")
      .eq("couple_id", coupleId)
      .like("body", "call:%")
      .order("sent_at", { ascending: false })
      .limit(1)
  ).data?.[0]?.body ?? null;
const coupleOf = async (userId: string) =>
  (await admin.from("couple_members").select("couple_id").eq("user_id", userId).single()).data!
    .couple_id as string;

// A call that doesn't go through says why, to both people, and offers Call again.
test.describe("Why a call didn't go through", () => {
  test("their device is offline: said plainly, with Call again", async ({ couple }) => {
    test.setTimeout(180_000);
    const { a, b, nia } = couple;
    await b.close(); // Theo isn't in Clink, and has no notifications set up.
    await a.goto("/chat");
    await a.getByRole("button", { name: "Call", exact: true }).click();
    const call = a.getByRole("dialog", { name: "Voice call with Theo" });
    await expect(
      call.getByText("Theo's device seems to be offline.", { exact: false }),
    ).toBeVisible({
      timeout: 60_000,
    });
    await expect
      .poll(async () => lastCall(await coupleOf(nia.id)), { timeout: 15000 })
      .toBe("call:missed:voice:0:offline");
    // The chat log says it too.
    await call.getByRole("button", { name: "Close" }).click();
    await expect(call).toBeHidden();
    await expect(a.getByText("Theo's device was offline")).toBeVisible({ timeout: 15000 });
  });

  test("it rang but nobody answered: both sides know it rang", async ({ couple }) => {
    test.setTimeout(180_000);
    const { a, b, nia } = couple;
    await b.goto("/us");
    await a.goto("/chat");
    await a.getByRole("button", { name: "Call", exact: true }).click();
    const incoming = b.getByRole("dialog", { name: "Voice call with Nia" });
    await expect(incoming.getByText("Incoming voice call")).toBeVisible({ timeout: 15000 });
    const call = a.getByRole("dialog", { name: "Voice call with Theo" });
    await expect(call.getByText("It rang on Theo's device, but no answer.")).toBeVisible({
      timeout: 60_000,
    });
    await expect(call.getByRole("button", { name: "Call again" })).toBeVisible();
    await expect
      .poll(async () => lastCall(await coupleOf(nia.id)), { timeout: 15000 })
      .toBe("call:missed:voice:0:no-answer");
    // Theo's missed-call card says it rang on his device.
    await b.goto("/chat");
    await expect(b.getByText("Missed call from Nia")).toBeVisible({ timeout: 15000 });
    await expect(b.getByText("It rang on your device").first()).toBeVisible();

    // Call again starts a fresh call straight from the ended screen.
    await b.goto("/us");
    await call.getByRole("button", { name: "Call again" }).click();
    await expect(call.getByText(/Ringing|Calling/)).toBeVisible();
    await expect(incoming.getByText("Incoming voice call")).toBeVisible({ timeout: 15000 });
    await call.getByRole("button", { name: "End", exact: true }).click();
  });
});
