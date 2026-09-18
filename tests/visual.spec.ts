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

    // Verify textarea wrapping and prominent multi-line height
    const creatorBox = await input.boundingBox();
    expect(creatorBox).not.toBeNull();
    if (creatorBox) {
      expect(creatorBox.height).toBeGreaterThanOrEqual(60);
    }

    // Switch to Leaderboard
    await leaderboardBtn.click();
    await expect(page.locator("h2", { hasText: "Forecasting Leaderboard" })).toBeVisible();

    // Verify segmented control and buttons are visible
    const segmentedControl = page.locator(".segmented-control").first();
    await expect(segmentedControl).toBeVisible();

    // Verify left arrow is positioned on the left side of the year text
    const prevYearBtn = segmentedControl.locator("button.year-stepper-btn").first();
    await expect(prevYearBtn).toBeVisible();
    await expect(prevYearBtn).toHaveText("◀");

    const yearText = segmentedControl.locator(".year-display");
    await expect(yearText).toBeVisible();
    await expect(yearText).toHaveText("2026");

    const prevBox = await prevYearBtn.boundingBox();
    const textBox = await yearText.boundingBox();
    expect(prevBox).not.toBeNull();
    expect(textBox).not.toBeNull();
    if (prevBox && textBox) {
      expect(prevBox.x).toBeLessThan(textBox.x);
    }

    // Step back to 2025 and verify next arrow ▶ appears on the right
    await prevYearBtn.click();
    await expect(segmentedControl.locator(".year-display")).toHaveText("2025");
    const nextYearBtn = segmentedControl.locator("button.year-stepper-btn", { hasText: "▶" });
    await expect(nextYearBtn).toBeVisible();
    const nextBox = await nextYearBtn.boundingBox();
    const text2025Box = await segmentedControl.locator(".year-display").boundingBox();
    if (nextBox && text2025Box) {
      expect(nextBox.x).toBeGreaterThan(text2025Box.x);
    }

    // Step back to 2026
    await nextYearBtn.click();
    await expect(segmentedControl.locator(".year-display")).toHaveText("2026");

    // Verify All Time tab
    const allTimeBtn = segmentedControl.locator("button", { hasText: "All Time" });
    await expect(allTimeBtn).toBeVisible();

    // Verify that users with image avatars (e.g. Google login photo URLs or data URLs) render an <img> tag instead of raw text
    await page.evaluate(async () => {
      const res = await fetch("/api/users");
      const users = await res.json();
      const adminUser = users.find((u: any) => u.isAdmin) || users[0];
      if (adminUser) {
        await fetch(`/api/users/${adminUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-user-id": adminUser.id },
          body: JSON.stringify({
            avatar: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          })
        });
      }
    });

    // Refresh Leaderboard
    const refreshBtn = page.locator("button[title='Refresh Leaderboard']");
    await refreshBtn.click();
    await page.waitForTimeout(400);

    // Verify user avatar image is rendered with class user-avatar-img
    const avatarImg = page.locator(".user-avatar-img").first();
    await expect(avatarImg).toBeVisible();

    // Verify raw url text is NEVER displayed in the leaderboard table
    const rawUrlText = page.locator("text=/data:image/i");
    await expect(rawUrlText).toHaveCount(0);

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

    // Verify mobile creator-input textarea is prominent and multiline
    const mobileInput = page.locator(".creator-input");
    await expect(mobileInput).toBeVisible();
    await mobileInput.fill("Will the James Webb Space Telescope detect atmospheric biosignatures on an exoplanet by the end of 2027?");
    const mBox = await mobileInput.boundingBox();
    expect(mBox).not.toBeNull();
    if (mBox) {
      expect(mBox.height).toBeGreaterThanOrEqual(55);
    }
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_mobile_creator_open.png"),
      fullPage: false,
    });

    // Close the creator
    await predictBtn.click();
    await page.waitForTimeout(300);
    await expect(creatorWrapper).toBeHidden();

    // Tap the 'Ranks' (Leaderboard) button on mobile bottom nav
    const mobileLeaderboardBtn = page.locator(".mobile-bottom-nav button", { hasText: /Ranks|Leaderboard/i });
    await mobileLeaderboardBtn.click();
    await page.waitForTimeout(400);

    // Verify Forecasting Leaderboard is visible
    await expect(page.locator("h2", { hasText: "Forecasting Leaderboard" })).toBeVisible();

    // Verify segmented control is VISIBLE on mobile (was previously hidden by .desktop-nav-tabs)
    const mobileSegmentedControl = page.locator(".segmented-control").first();
    await expect(mobileSegmentedControl).toBeVisible();

    // Verify Year and All Time buttons are visible on mobile
    const mobileYearTab = mobileSegmentedControl.locator(".segmented-tab-btn").first();
    await expect(mobileYearTab).toBeVisible();
    const mobileYearText = mobileSegmentedControl.locator(".year-display");
    await expect(mobileYearText).toBeVisible();
    await expect(mobileYearText).toHaveText("2026");

    const mobilePrevYearBtn = mobileSegmentedControl.locator("button.year-stepper-btn").first();
    await expect(mobilePrevYearBtn).toBeVisible();
    await expect(mobilePrevYearBtn).toHaveText("◀");

    // Verify left arrow is on the left of the year text
    const mPrevBox = await mobilePrevYearBtn.boundingBox();
    const mTextBox = await mobileYearText.boundingBox();
    expect(mPrevBox).not.toBeNull();
    expect(mTextBox).not.toBeNull();
    if (mPrevBox && mTextBox) {
      expect(mPrevBox.x).toBeLessThan(mTextBox.x);
    }

    const mobileAllTimeBtn = mobileSegmentedControl.locator("button", { hasText: "All Time" });
    await expect(mobileAllTimeBtn).toBeVisible();

    // Capture mobile leaderboard screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "headless_mobile_leaderboard.png"),
      fullPage: false,
    });

    // Switch back to Ledger
    const mobileLedgerBtn = page.locator(".mobile-bottom-nav button", { hasText: "Ledger" });
    await mobileLedgerBtn.click();
    await page.waitForTimeout(300);

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
