import { expect, type Page } from "@playwright/test";

export interface DemoAccount {
  username: string;
  password: string;
  displayName: string;
  roleLabel: string;
}

export const CLAIMANT = {
  username: "amira",
  password: "amira-demo",
  displayName: "Amira Shah",
  roleLabel: "Claimant",
} as const satisfies DemoAccount;

export const CLAIMANT_LUIS = {
  username: "luis",
  password: "luis-demo",
  displayName: "Luis Ortega",
  roleLabel: "Claimant",
} as const satisfies DemoAccount;

export const ADJUSTER = {
  username: "dana",
  password: "dana-demo",
  displayName: "Dana Whitfield",
  roleLabel: "Adjuster",
} as const satisfies DemoAccount;

export const TOKEN_KEY = "syolab.claims.token";

export async function fillSignIn(page: Page, username: string, password: string) {
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signIn(page: Page, account: DemoAccount = CLAIMANT) {
  await fillSignIn(page, account.username, account.password);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}
