import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { ADJUSTER, CLAIMANT, signIn, type DemoAccount } from "./signIn";

const AMIRA_CLAIM = "c1111111-1111-4111-8111-111111111111";
const LUIS_CLAIM = "c3333333-3333-4333-8333-333333333333";

function claimItems(page: Page, region: string) {
  return page.getByRole("region", { name: region }).getByRole("listitem");
}

test("a claimant sees only their own claims and policies", async ({ page }) => {
  await page.goto("/");
  await signIn(page, CLAIMANT);

  await expect(page.getByRole("heading", { name: "My claims" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Claims queue" })).toHaveCount(0);

  const items = claimItems(page, "My claims");
  await expect(items.first()).toBeVisible();
  for (const text of await items.allTextContents()) {
    expect(text).toContain("POL-1001");
    for (const other of ["POL-1002", "POL-1003", "POL-1004", "POL-1005"]) {
      expect(text).not.toContain(other);
    }
  }

  const options = page.getByLabel("Policy").locator('option:not([value=""])');
  await expect(options).toHaveCount(1);
  await expect(options.first()).toHaveText(/^POL-1001/);
  expect(
    await options.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLOptionElement).value),
    ),
  ).toEqual(["POL-1001"]);
});

async function authHeaders(
  request: APIRequestContext,
  account: DemoAccount,
): Promise<Record<string, string>> {
  const login = await request.post("/api/auth/login", {
    data: { username: account.username, password: account.password },
  });
  expect(login.status()).toBe(200);
  const { token } = (await login.json()) as { token: string };
  return { Authorization: `Bearer ${token}` };
}

test("the API hides records outside a claimant's policies", async ({ request }) => {
  const headers = await authHeaders(request, CLAIMANT);

  expect((await request.get(`/api/claims/${LUIS_CLAIM}`, { headers })).status()).toBe(
    404,
  );
  expect((await request.get(`/api/claims/${AMIRA_CLAIM}`, { headers })).status()).toBe(
    200,
  );
  expect((await request.get("/api/policies/POL-1002", { headers })).status()).toBe(404);

  const created = await request.post("/api/claims", {
    headers,
    data: {
      policyNumber: "POL-1002",
      claimantName: "Amira Shah",
      amount: "50.00",
      incidentDate: "2026-06-01",
      description: "Out of scope attempt",
      documentNames: ["medical-bill"],
    },
  });
  expect(created.status()).toBe(404);
});

test("the API refuses a claim submitted by an adjuster", async ({ request }) => {
  const created = await request.post("/api/claims", {
    headers: await authHeaders(request, ADJUSTER),
    data: {
      policyNumber: "POL-1002",
      claimantName: "Luis Ortega",
      amount: "50.00",
      incidentDate: "2026-06-01",
      description: "Adjuster submission attempt",
      documentNames: ["medical-bill"],
    },
  });
  expect(created.status()).toBe(403);
});

test("an adjuster filters the claims queue", async ({ page }) => {
  await page.goto("/");
  await signIn(page, ADJUSTER);

  const banner = page.getByRole("banner");
  await expect(banner).toContainText(ADJUSTER.displayName);
  await expect(banner).toContainText(ADJUSTER.roleLabel);
  await expect(page.getByRole("heading", { name: "Claims queue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New claim" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit claim" })).toHaveCount(0);

  const items = claimItems(page, "Claims queue");
  for (const policy of ["POL-1001", "POL-1002", "POL-1003", "POL-1004", "POL-1005"]) {
    await expect(items.filter({ hasText: policy }).first()).toBeVisible();
  }

  const status = page.getByRole("group", { name: "Status" });
  const search = page.getByLabel("Search claimant or policy");

  await status.getByRole("button", { name: "Rejected" }).click();
  await expect(status.getByRole("button", { name: "Rejected" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(items.filter({ hasNotText: "Rejected" })).toHaveCount(0);
  await expect(
    items.filter({ hasText: "Nora Blake" }).filter({ hasText: "POL-1003" }),
  ).toHaveCount(1);

  await status.getByRole("button", { name: "Flagged" }).click();
  await expect(items.first()).toBeVisible();
  await expect(items.filter({ hasNotText: "Flagged" })).toHaveCount(0);

  await status.getByRole("button", { name: "All" }).click();
  await search.fill("nora");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("Nora Blake");
  await expect(page.getByRole("status")).toHaveText(/^Showing 1 of \d+ claims$/);

  await search.fill("POL-1004");
  await expect(items.first()).toContainText("Chris Dalton");
  await expect(items.filter({ hasNotText: "Chris Dalton" })).toHaveCount(0);

  await search.fill("POL-1005");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("Grace Okafor");
  await expect(items.first()).toContainText("Accepted");
});
