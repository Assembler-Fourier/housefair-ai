import { expect, test, type Page } from "playwright/test";

const alexId = "00000000-0000-4000-8000-000000000101";
const testDeviceId = "playwright-device";
const testSession = {
  deviceId: testDeviceId,
  personId: alexId,
  sessionToken: "playwright-session-token",
  verifiedAt: new Date().toISOString(),
};

async function mockDeviceApis(page: Page) {
  await page.route("**/api/device/session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/api/device/verify", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(testSession) });
  });
}

async function openAsAlex(page: Page) {
  await mockDeviceApis(page);
  await page.addInitScript((session) => {
    window.localStorage.setItem(
      "housefair:device-identity",
      JSON.stringify({ deviceId: session.deviceId, personId: session.personId }),
    );
    window.localStorage.setItem("housefair:device-session", JSON.stringify(session));
    window.sessionStorage.setItem("housefair:device-session", JSON.stringify(session));
  }, testSession);
  await page.goto("/");
  await expect(page.getByText("Today, Alex")).toBeVisible();
}

async function openFirstLaunch(page: Page) {
  await mockDeviceApis(page);
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByText("House PIN required")).toBeVisible();
  const dialogAttached = await page
    .waitForSelector('[role="dialog"]', { state: "attached", timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (!dialogAttached) {
    await page.getByRole("button", { name: "Open identity setup" }).click();
  }
  await expect(page.getByText("Welcome to HouseFair AI")).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(Math.max(overflow.body, overflow.root)).toBeLessThanOrEqual(overflow.width + 2);
}

test("identity setup, PIN confirmation, and command center are mobile safe", async ({ page }, testInfo) => {
  await openFirstLaunch(page);
  if (testInfo.project.name === "iphone-pwa") {
    await expectNoHorizontalOverflow(page);
    return;
  }
  await page.addInitScript((session) => {
    window.localStorage.setItem(
      "housefair:device-identity",
      JSON.stringify({ deviceId: session.deviceId, personId: session.personId }),
    );
    window.localStorage.removeItem("housefair:device-session");
    window.sessionStorage.removeItem("housefair:device-session");
  }, testSession);
  await page.reload();
  await expect(page.getByText("Confirm your house PIN")).toBeVisible();
  await page.getByPlaceholder("1234").fill("1234");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByText("Current house health")).toBeVisible();
  await expect(page.getByText("Recent house activity")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("tasks, proof dialog, groceries, money, issues, and AI panels render on mobile", async ({ page }) => {
  await openAsAlex(page);

  await page.getByRole("button", { name: "Tasks" }).click();
  await expect(page.getByText("Fair work, visible credit")).toBeVisible();
  await page.getByRole("button", { name: /Complete/ }).first().click();
  await expect(page.getByText("Complete task")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Groceries" }).click();
  await expect(page.getByText("Shared stock, fewer surprises")).toBeVisible();
  await page.getByRole("button", { name: "Scan barcode", exact: true }).click();
  await expect(page.getByText("Scan grocery barcode")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Money" }).click();
  await expect(page.getByText("Money, settled calmly")).toBeVisible();

  await page.getByRole("button", { name: "More" }).click();
  await expect(page.getByText("House controls")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Profile" })).toBeVisible();
  await page.getByRole("tab", { name: "Profile" }).click();
  await expect(page.getByText("My Profile")).toBeVisible();
  await page.getByRole("tab", { name: "Alerts" }).click();
  await expect(page.getByText("Notification center")).toBeVisible();
  await page.getByRole("tab", { name: "AI" }).click();
  await expect(page.getByText("HouseFair AI Manager")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("first-week setup and maintenance controls are reachable without layout overflow", async ({ page }) => {
  await openAsAlex(page);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByText("Maintenance settings")).toBeVisible();
  await expect(page.getByLabel("Settings").getByText("First-week setup")).toBeVisible();
  await page.getByRole("button", { name: "Configure" }).click();
  await expect(page.getByRole("heading", { name: "First-week setup" })).toBeVisible();
  await expect(page.getByText("Task reminders")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
