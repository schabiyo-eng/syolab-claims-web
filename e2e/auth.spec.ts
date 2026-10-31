import { expect, test, type Page } from "@playwright/test";
import { CLAIMANT, TOKEN_KEY, fillSignIn, signIn } from "./signIn";

function signInForm(page: Page) {
  return page.getByRole("heading", { name: "Sign in" });
}

test("a wrong password shows an alert and stays on sign-in", async ({ page }) => {
  await page.goto("/");
  await fillSignIn(page, CLAIMANT.username, "not-the-password");

  await expect(page.getByRole("alert")).toHaveText(
    "Username or password is incorrect.",
  );
  await expect(signInForm(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
});

test("a session survives reload and ends on log out", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Claims intake" })).toBeVisible();
  await signIn(page);

  const banner = page.getByRole("banner");
  await expect(banner).toContainText(CLAIMANT.displayName);
  await expect(banner).toContainText(CLAIMANT.roleLabel);
  await expect(
    page.getByRole("listitem").filter({ hasText: "POL-1001" }).first(),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  await expect(banner).toContainText(CLAIMANT.displayName);
  await expect(signInForm(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(signInForm(page)).toBeVisible();
  await expect(page.getByLabel("Username")).toBeFocused();

  await page.reload();
  await expect(signInForm(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
});

test("an expired token returns to sign-in", async ({ page }) => {
  await page.goto("/");
  await signIn(page);

  await page.evaluate((key) => sessionStorage.setItem(key, "stale"), TOKEN_KEY);
  await page.reload();

  await expect(signInForm(page)).toBeVisible();
  await expect(page.getByText("Your session has ended. Sign in again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
});
