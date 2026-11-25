import { test, expect } from "./fixtures";
import { admin, adminSignIn } from "./helpers";
import { pickOption } from "./controls";

// The pagination bar on a long admin list (the error log, paged on screen):
// summary, page numbers with gaps, Next/Previous, First/Last on wider screens,
// rows per page, and 44 px targets.
test("a long admin list pages cleanly", async ({ page }, info) => {
  const tag = `pager-${Date.now()}`;
  const now = Date.now();
  const rows = Array.from({ length: 70 }, (_, i) => ({
    fingerprint: `${tag}-${i}`,
    source: "client" as const,
    message: `Pager test ${tag} #${i}`,
    path: "/us",
    last_at: new Date(now + 60_000 - i * 1000).toISOString(),
  }));
  const { error } = await admin.from("error_log").insert(rows);
  if (error) throw error;
  try {
    await adminSignIn(page);
    await page.goto("/admin/errors");
    const bar = page.getByRole("navigation", { name: "Error pages" });
    await expect(bar).toBeVisible({ timeout: 20_000 });
    await expect(bar.getByText(/^Showing 1 to 25 of [\d,]+ errors$/)).toBeVisible();
    await expect(bar.getByRole("button", { name: "Page 1", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(bar.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await bar.getByRole("button", { name: "Next page" }).click();
    await expect(bar.getByText(/^Showing 26 to 50 of /)).toBeVisible();
    await expect(bar.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Every control is a 44 px target.
    for (const b of await bar.getByRole("button").all()) {
      if (!(await b.isVisible())) continue;
      const box = (await b.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }

    const last = bar.getByRole("button", { name: /^Last page/ });
    if (await last.isVisible()) {
      await last.click();
      await expect(bar.getByRole("button", { name: "Next page" })).toBeDisabled();
      await bar.getByRole("button", { name: "First page" }).click();
      await expect(bar.getByText(/^Showing 1 to 25 of /)).toBeVisible();
    } else {
      await bar.getByRole("button", { name: "Page 1", exact: true }).click();
    }

    await pickOption(page, "Rows", "50");
    await expect(bar.getByText(/^Showing 1 to 50 of /)).toBeVisible();
    // The bar never pushes the page sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    if (process.env.QA_SHOTS) {
      await bar.getByRole("button", { name: "Next page" }).click();
      await bar.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${process.env.QA_SHOTS}/pager-${info.project.name}.png` });
    }
  } finally {
    await admin.from("error_log").delete().like("fingerprint", `${tag}-%`);
  }
});
