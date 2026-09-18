import { test, expect } from "@playwright/test";
import path from "path";

const ARTIFACTS_DIR = "C:/Users/jakej/.gemini/antigravity-ide/brain/b98ca53f-f8e6-4a3c-8132-d42873024039";

test.describe("Prognos Visual & Functional Suite", () => {
  test("Desktop navigation, segmented tabs and delight features", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop only");

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Close about modal if present
    const modalClose = page.locator(".modal-close-btn, button:has-text('Enter Observatory')").first();
    if (await modalClose.isVisible({ timeout: 1500 }).catch(() => false)) {
      await modalClose.click();
      await page.waitForTimeout(300);
    }

    // Verify desktop navbar segmented control
    const navTabs = page.locator(".desktop-nav-tabs").first();
    await expect(navTabs).toBeVisible();

    const ledgerBtn = page.locator(".nav-tab-btn", { hasText: "Ledger" });
    const leaderboardBtn = page.locator(".nav-tab-btn", { hasText: "Leaderboard" });

    await expect(ledgerBtn).toBeVisible();
    await expect(leaderboardBtn).toBeVisible();
    await expect(ledgerBtn).toHaveClass(/active/);

    // Capture desktop dark mode navbar & main
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_desktop_dark.png"),
      fullPage: false,
    });

    // Test Spark Idea button in prediction creator
    const sparkBtn = page.locator(".spark-idea-btn");
    await expect(sparkBtn).toBeVisible();
    await sparkBtn.click();
    const input = page.locator(".creator-input");
    const val = await input.inputValue();
    expect(val.length).toBeGreaterThan(5);

    // Switch to Leaderboard
    await leaderboardBtn.click();
    await expect(page.locator("h2", { hasText: "Forecasting Leaderboard" })).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_desktop_leaderboard.png"),
      fullPage: false,
    });

    // Switch back to Ledger
    await ledgerBtn.click();
    await expect(page.locator(".creator-prompt", { hasText: "New Observation & Probability" })).toBeVisible();

    // Toggle to Light mode
    const themeBtn = page.locator(".theme-toggle-btn");
    await themeBtn.click();
    await page.waitForTimeout(400);

    // Capture desktop light mode navbar
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_desktop_light.png"),
      fullPage: false,
    });
  });

  test("Mobile layout, bottom nav, and predict modal toggle", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "Mobile only");

    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Close about modal if open
    const modalClose = page.locator(".modal-close-btn, button:has-text('Enter Observatory')").first();
    if (await modalClose.isVisible({ timeout: 1500 }).catch(() => false)) {
      await modalClose.click();
      await page.waitForTimeout(300);
    }

    // On mobile, desktop nav tabs MUST be hidden
    const desktopNav = page.locator(".desktop-nav-tabs").first();
    await expect(desktopNav).toBeHidden();

    // Bottom navigation bar MUST be visible
    const bottomNav = page.locator(".mobile-bottom-nav");
    await expect(bottomNav).toBeVisible();

    // 'New Observation & Probability' creator MUST be hidden by default on mobile
    const creatorWrapper = page.locator(".prediction-creator-wrapper");
    await expect(creatorWrapper).toBeHidden();

    // Capture initial mobile dark view
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_mobile_dark_hidden.png"),
      fullPage: false,
    });

    // Tap the 'Predict' (+) button on bottom nav
    const predictBtn = page.locator(".mobile-nav-btn-highlight");
    await predictBtn.click();
    await page.waitForTimeout(400);

    // Prediction creator should now be open
    await expect(creatorWrapper).toBeVisible();
    await expect(page.locator(".creator-prompt", { hasText: "New Observation & Probability" })).toBeVisible();

    // Capture open creator modal view
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_mobile_creator_open.png"),
      fullPage: false,
    });

    // Close the creator by clicking the Predict button again (which is now Close/x)
    await predictBtn.click();
    await page.waitForTimeout(300);
    await expect(creatorWrapper).toBeHidden();

    // Switch to mobile light mode
    const themeBtn = page.locator(".theme-toggle-btn");
    await themeBtn.click();
    await page.waitForTimeout(400);

    // Capture mobile light mode
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_mobile_light.png"),
      fullPage: false,
    });
  });
});
