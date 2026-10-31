import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { ADJUSTER, CLAIMANT, CLAIMANT_LUIS, signIn, type DemoAccount } from "./signIn";

const STUB = "http://127.0.0.1:8080";
const AMIRA_CLAIM = "c1111111-1111-4111-8111-111111111111";
const LUIS_CLAIM = "c3333333-3333-4333-8333-333333333333";
const INFO_REQUEST = "Please upload the medical bill for the clinic visit.";
const DECISION_BUTTONS = ["Approve", "Deny", "Request info"] as const;

async function tokenFor(
  request: APIRequestContext,
  account: DemoAccount,
): Promise<Record<string, string>> {
  const login = await request.post(`${STUB}/api/auth/login`, {
    data: { username: account.username, password: account.password },
  });
  expect(login.status()).toBe(200);
  const { token } = (await login.json()) as { token: string };
  return { Authorization: `Bearer ${token}` };
}

async function createAmiraClaim(
  request: APIRequestContext,
  description: string,
): Promise<string> {
  const created = await request.post(`${STUB}/api/claims`, {
    headers: await tokenFor(request, CLAIMANT),
    data: {
      policyNumber: "POL-1001",
      claimantName: CLAIMANT.displayName,
      amount: "25.00",
      incidentDate: "2026-06-01",
      description,
      documentNames: ["police-report", "repair-estimate"],
    },
  });
  expect(created.status()).toBe(201);
  return ((await created.json()) as { id: string }).id;
}

function uniqueDescription(label: string): string {
  return `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function panel(page: Page, name: string) {
  return page.getByRole("region", { name });
}

test("a claimant opens an info request, replies, and keeps the reply after reload", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page, CLAIMANT_LUIS);

  const row = page
    .getByRole("region", { name: "My claims" })
    .getByRole("listitem")
    .filter({ hasText: "Clinic visit" });
  await expect(row).toContainText("Info requested");

  await row.getByRole("link", { name: CLAIMANT_LUIS.displayName }).click();
  await expect(page).toHaveURL(`/claims/${LUIS_CLAIM}`);

  await expect(
    page.getByText(
      "The adjuster asked for more information. Reply in the comments below.",
    ),
  ).toBeVisible();
  await expect(panel(page, "Decision")).toContainText(INFO_REQUEST);
  const timeline = panel(page, "Timeline").getByRole("listitem");
  await expect(timeline.filter({ hasText: "Submitted" })).toHaveCount(1);
  await expect(timeline.filter({ hasText: "Pending → Info requested" })).toContainText(
    ADJUSTER.username,
  );
  const comments = panel(page, "Comments");
  await expect(
    comments.getByRole("listitem").filter({ hasText: ADJUSTER.username }),
  ).toContainText(INFO_REQUEST);
  for (const name of DECISION_BUTTONS) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }

  const reply = "I have uploaded the medical bill.";
  await page.getByLabel("Add a comment").fill(reply);
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(comments.getByRole("listitem").filter({ hasText: reply })).toHaveCount(
    1,
  );
  await expect(page.getByLabel("Add a comment")).toHaveValue("");

  await page.reload();
  await expect(page).toHaveURL(`/claims/${LUIS_CLAIM}`);
  await expect(comments.getByRole("listitem").filter({ hasText: reply })).toHaveCount(
    1,
  );

  await page.getByRole("link", { name: "Back to claims" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "My claims" })).toBeVisible();
});

test("a claimant cannot open another claimant's claim", async ({ page }) => {
  await page.goto("/");
  await signIn(page, CLAIMANT_LUIS);

  await page.goto(`/claims/${AMIRA_CLAIM}`);

  await expect(page.getByText("Claim not found.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to claims" })).toBeVisible();
});

test("a signed-out visitor sees the claim after signing in", async ({ page }) => {
  await page.goto(`/claims/${LUIS_CLAIM}`);
  await signIn(page, CLAIMANT_LUIS);

  await expect(page).toHaveURL(`/claims/${LUIS_CLAIM}`);
  await expect(panel(page, "Claim")).toContainText("Clinic visit");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/");
});

test("the API enforces decision rules", async ({ request }) => {
  const luis = await tokenFor(request, CLAIMANT_LUIS);
  const dana = await tokenFor(request, ADJUSTER);

  const claimant = await request.post(`${STUB}/api/claims/${LUIS_CLAIM}/decision`, {
    headers: luis,
    data: { decision: "APPROVED" },
  });
  expect(claimant.status()).toBe(403);

  const noNote = await request.post(`${STUB}/api/claims/${LUIS_CLAIM}/decision`, {
    headers: dana,
    data: { decision: "DENIED" },
  });
  expect(noNote.status()).toBe(400);

  const id = await createAmiraClaim(request, uniqueDescription("API decision"));
  const approved = await request.post(`${STUB}/api/claims/${id}/decision`, {
    headers: dana,
    data: { decision: "APPROVED" },
  });
  expect(approved.status()).toBe(200);
  const body = (await approved.json()) as { decision: string; history: unknown[] };
  expect(body.decision).toBe("APPROVED");
  expect(body.history).toHaveLength(1);

  const again = await request.post(`${STUB}/api/claims/${id}/decision`, {
    headers: dana,
    data: { decision: "APPROVED" },
  });
  expect(again.status()).toBe(409);

  const repeated = await createAmiraClaim(request, uniqueDescription("API repeat"));
  for (const [decision, length] of [
    ["INFO_REQUESTED", 1],
    ["INFO_REQUESTED", 2],
    ["APPROVED", 3],
  ] as const) {
    const decided = await request.post(`${STUB}/api/claims/${repeated}/decision`, {
      headers: dana,
      data: { decision, note: "Please add the repair invoice." },
    });
    expect(decided.status()).toBe(200);
    const claim = (await decided.json()) as { decision: string; history: unknown[] };
    expect(claim.decision).toBe(decision);
    expect(claim.history).toHaveLength(length);
  }
  const afterFinal = await request.post(`${STUB}/api/claims/${repeated}/decision`, {
    headers: dana,
    data: { decision: "INFO_REQUESTED", note: "One more thing." },
  });
  expect(afterFinal.status()).toBe(409);
});

test("the API lists every claim with its history", async ({ request }) => {
  const list = await request.get(`${STUB}/api/claims`, {
    headers: await tokenFor(request, ADJUSTER),
  });
  expect(list.status()).toBe(200);
  const claims = (await list.json()) as { history?: unknown }[];
  expect(claims.length).toBeGreaterThan(0);
  for (const claim of claims) {
    expect(Array.isArray(claim.history)).toBe(true);
  }
});

test("an adjuster opens a queue row", async ({ page }) => {
  await page.goto("/");
  await signIn(page, ADJUSTER);

  const row = page
    .getByRole("region", { name: "Claims queue" })
    .getByRole("listitem")
    .first();
  await row.getByRole("link").click();
  await expect(page).toHaveURL(/\/claims\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Decision" })).toBeVisible();
});

test("an adjuster requests info twice, then approves, and the claimant sees it", async ({
  page,
  request,
  browser,
}) => {
  const description = uniqueDescription("Detail walkthrough");
  const id = await createAmiraClaim(request, description);

  await page.goto("/");
  await signIn(page, ADJUSTER);
  await page.goto(`/claims/${id}`);

  const decision = panel(page, "Decision");
  await expect(decision).toContainText("Decision: Pending");

  await page.getByRole("button", { name: "Deny", exact: true }).click();
  await expect(decision).toContainText("Enter a decision note to deny.");
  await expect(decision).toContainText("Decision: Pending");

  await page.getByLabel("Decision note").fill("Please add the repair invoice.");
  await page.getByRole("button", { name: "Request info", exact: true }).click();
  await expect(decision).toContainText("Decision: Info requested");
  await expect(page.getByLabel("Decision note")).toHaveValue("");
  await expect(
    panel(page, "Timeline")
      .getByRole("listitem")
      .filter({ hasText: "Pending → Info requested" }),
  ).toContainText("Please add the repair invoice.");

  await page.getByLabel("Decision note").fill("Please add the tow receipt too.");
  await page.getByRole("button", { name: "Request info", exact: true }).click();
  await expect(page.getByLabel("Decision note")).toHaveValue("");
  const repeat = panel(page, "Timeline")
    .getByRole("listitem")
    .filter({ hasText: "Info requested → Info requested" });
  await expect(repeat).toContainText("Please add the tow receipt too.");
  await expect(repeat).toContainText(ADJUSTER.username);
  await expect(decision).toContainText("Decision: Info requested");

  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(decision).toContainText("Decision: Approved");
  for (const name of DECISION_BUTTONS) {
    await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
  }
  await expect(decision).toContainText("This decision is final.");

  await page.reload();
  await expect(decision).toContainText("Decision: Approved");
  await expect(decision).toContainText("This decision is final.");

  const amiraContext = await browser.newContext();
  const amira = await amiraContext.newPage();
  await amira.goto("/");
  await signIn(amira, CLAIMANT);
  await expect(
    amira
      .getByRole("region", { name: "My claims" })
      .getByRole("listitem")
      .filter({ hasText: description }),
  ).toContainText("Approved");
  await amiraContext.close();
});
