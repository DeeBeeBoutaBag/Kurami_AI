import { expect, test } from "@playwright/test";

test("participant joins, reaches hub, and sees workshop portals", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Event code").fill("ETHICS2026");
  await page.getByLabel("Nickname").fill(`Nova ${Date.now().toString().slice(-4)}`);
  await page.getByLabel(/I will not enter private/).check();
  await page.getByRole("button", { name: /Enter Hub/ }).click();

  await expect(page).toHaveURL(/\/hub/);
  await expect(page.getByRole("heading", { name: /Nova/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Who's Who" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Data-Detective" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Storibloom" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kurami Court" })).toBeVisible();
  await expect(page.getByText("Available now")).toHaveCount(4);
  await expect(page.getByText("Suggested")).toHaveCount(2);
});

test("facilitator can log in and control event timing", async ({ page }) => {
  await page.goto("/facilitator/login");
  await page.getByPlaceholder("Facilitator PIN").fill("2468");
  await page.getByRole("button", { name: /Unlock Dashboard/ }).click();

  await expect(page).toHaveURL(/\/facilitator/);
  await expect(page.getByRole("heading", { name: "Kurami.AI" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Force Start" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Export Results/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Student progress/ })).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByText(/Rotation/)).toBeVisible();

  await page.goto("/display/live");
  await expect(page.getByRole("heading", { name: /Workshop live|Rotation/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Live submissions and votes|Presenter cues/ })).toBeVisible();

  await page.goto("/display/summary");
  await expect(page.getByRole("heading", { name: /Here's what your class created/ })).toBeVisible();
});

test("presenter display shows join code and QR", async ({ page }) => {
  await page.goto("/display");

  await expect(page.getByRole("heading", { name: /Join Kurami.AI/ })).toBeVisible();
  await expect(page.getByText("ETHICS2026")).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code for student join page/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Live Display/ })).toBeVisible();
});
