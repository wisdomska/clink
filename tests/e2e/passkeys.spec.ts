import { test, expect } from "./fixtures";

// ACC-01: a signed-in user can register a sign-in passkey, see it, and remove it.
test("register and remove a sign-in passkey", async ({ couple }) => {
  const { a } = couple;
  const cdp = await a.context().newCDPSession(a);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await a.goto("/settings");
  await a.getByRole("button", { name: /Sign in with a passkey/ }).click();
  await expect(a.getByText(/Passkey added/)).toBeVisible();
  const remove = a.getByRole("button", { name: /^Remove / });
  await expect(remove).toHaveCount(1);
  await expect(a.getByRole("button", { name: /Add another passkey/ })).toBeVisible();

  await remove.click();
  await expect(a.getByText("Passkey removed.")).toBeVisible();
  await expect(a.getByRole("button", { name: /Sign in with a passkey/ })).toBeVisible();
});
