import { expect, type Page } from "@playwright/test";

export const CLAIMANT = {
  username: "amira.shah",
  password: "claimant-demo",
  displayName: "Amira Shah",
  roleLabel: "Claimant",
} as const;

export const TOKEN_KEY = "syolab.claims.token";

export async function fillSignIn(page: Page, username: string, password: string) {
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signIn(page: Page) {
  await fillSignIn(page, CLAIMANT.username, CLAIMANT.password);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}
