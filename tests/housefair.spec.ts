import { expect, test, type Page } from "playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(Math.max(overflow.body, overflow.root)).toBeLessThanOrEqual(overflow.width + 2);
}

test("public SaaS pages render and stay mobile safe", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Fair chores, groceries, issues, and shared money/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start free", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Full access while we launch." })).toBeVisible();
  await expect(page.getByText("Free", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/features");
  await expect(page.getByRole("heading", { name: /roommate app/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "Sign in to HouseFair" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("sample tour opens without credentials and makes no API requests", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  await page.goto("/demo");
  await expect(page.getByText("Explore a sample household")).toBeVisible();
  await expect(page.getByText("Today, Uzair")).toBeVisible();
  await expect(page.getByText("House PIN required")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await expect(page.getByText("Fair work, visible credit")).toBeVisible();
  await page.getByRole("button", { name: /Complete/ }).first().click();
  await expect(page.getByText("Sample preview only. Sign in to manage your own household.").first()).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Groceries", exact: true }).click();
  await expect(page.getByText("Shared stock, fewer surprises")).toBeVisible();
  await page.getByRole("button", { name: "Scan barcode", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Money", exact: true }).click();
  await expect(page.getByText("Money, settled calmly")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await expect(page.getByRole("heading", { name: "About this preview" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(apiRequests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("housefair:device-session"))).toBeNull();
});

test("tour does not consume an existing device session", async ({ page }) => {
  const saved = JSON.stringify({ deviceId: "saved-device", personId: "other-person", sessionToken: "test-only" });
  await page.addInitScript((session) => {
    localStorage.setItem("housefair:device-session", session);
  }, saved);
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  await page.goto("/demo");
  await expect(page.getByText("Today, Uzair")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("housefair:device-session"))).toBe(saved);
  expect(apiRequests).toEqual([]);
});

test("private household and legacy mutation routes stay protected", async ({ page, request }) => {
  await page.goto("/app/today");
  await expect(page).toHaveURL(/\/auth/);
  const legacy = await request.post("/api/device/register", { data: {} });
  expect(legacy.status()).toBe(404);
  const tasks = await request.post("/api/app/tasks", { data: {} });
  expect(tasks.status()).toBe(401);
});
