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

  test("Mobile layout, bottom nav, and centered modal verification", async ({ page }, testInfo) => {
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

    // Tap the 'Predict' (+) button on bottom nav
    const predictBtn = page.locator(".mobile-nav-btn-highlight");
    await predictBtn.click();
    await page.waitForTimeout(400);
    await expect(creatorWrapper).toBeVisible();

    // Close the creator
    await predictBtn.click();
    await page.waitForTimeout(300);
    await expect(creatorWrapper).toBeHidden();

    // Open Account / Profile Modal on mobile via bottom nav Account button
    const accountBtn = page.locator(".mobile-bottom-nav button", { hasText: /Account|Sign In/i });
    await accountBtn.click();
    await page.waitForTimeout(400);

    // Modal should be visible and centered
    const modalBox = page.locator(".dialog-box");
    await expect(modalBox).toBeVisible();

    // Verify 'Admin Console' button is REMOVED
    const adminConsoleBtn = page.locator("button:has-text('Admin Console')");
    await expect(adminConsoleBtn).toHaveCount(0);

    // Verify modal box is centered (top is greater than 20px and bottom has clear clearance)
    const box = await modalBox.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y).toBeGreaterThan(20);
      const viewport = page.viewportSize();
      if (viewport) {
        // Must not touch the bottom of the viewport
        expect(box.y + box.height).toBeLessThan(viewport.height);
      }
    }

    // Capture mobile centered modal screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_mobile_modal_centered.png"),
      fullPage: false,
    });

    // Close modal
    const closeBtn = page.locator(".dialog-box button[title='Close dialog']").first();
    await closeBtn.click();
    await page.waitForTimeout(300);
    await expect(modalBox).toBeHidden();

    // Now log in as admin user to test the logged-in profile modal
    await page.evaluate(async () => {
      const res = await fetch("/api/users");
      const users = await res.json();
      const adminUser = users.find((u: any) => u.isAdmin) || users[0];
      if (adminUser) {
        localStorage.setItem("prognos_local_user_id", adminUser.id);
      }
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open Account modal again
    const loggedInAccountBtn = page.locator(".mobile-bottom-nav button", { hasText: /Account/i });
    await loggedInAccountBtn.click();
    await page.waitForTimeout(400);

    const loggedInModalBox = page.locator(".dialog-box");
    await expect(loggedInModalBox).toBeVisible();

    // Verify Admin Console button is NOT present
    await expect(page.locator("button:has-text('Admin Console')")).toHaveCount(0);

    // Verify Log Out button is visible and fully on screen
    const logoutBtn = page.locator("button:has-text('Log Out')");
    await expect(logoutBtn).toBeVisible();

    const loggedInBox = await loggedInModalBox.boundingBox();
    expect(loggedInBox).not.toBeNull();
    if (loggedInBox) {
      const viewport = page.viewportSize();
      if (viewport) {
        // Modal must be cleanly above the bottom of the screen
        expect(loggedInBox.y + loggedInBox.height).toBeLessThan(viewport.height);
      }
    }

    // Capture screenshot of logged in mobile profile modal
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_mobile_profile_loggedin.png"),
      fullPage: false,
    });
  });
});
