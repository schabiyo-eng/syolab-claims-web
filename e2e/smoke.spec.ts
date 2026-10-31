import { expect, test } from "@playwright/test";
import { signIn } from "./signIn";

test("loads the desk and accepts a small POL-1002 claim", async ({ page }) => {
  await page.goto("/");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Claims intake" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Amira Shah" }).first()).toBeVisible();

  await page.getByLabel("Policy").selectOption("POL-1002");
  await expect(page.getByRole("checkbox", { name: "medical-bill" })).toBeVisible();
  await page.getByLabel("Claimant").fill("Luis Ortega");
  await page.getByLabel("Amount").fill("100.00");
  await page.getByLabel("Incident date").fill("2026-06-01");
  await page.getByLabel("Description").fill("Follow up visit");
  await page.getByRole("checkbox", { name: "medical-bill" }).check();
  await page.getByRole("button", { name: "Submit claim" }).click();

  const row = page.getByRole("listitem").filter({ hasText: "Follow up visit" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Accepted");
  await expect(row).toContainText("POL-1002");
  await expect(row).toContainText("100.00");
  await expect(row).toContainText("Luis Ortega");
});
