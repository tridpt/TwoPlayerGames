"use strict";
const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const HOST = "two-player-games-rnu3.onrender.com";
const WEB_ROOT = path.resolve(__dirname, "../..");
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
};

test("Android shell can start a local game offline and export/share through its bridge", async ({ browser }) => {
  const context = await browser.newContext({
    offline: true,
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  try {
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.host !== HOST) return route.abort();
      const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (relative.includes("..")) return route.abort();
      const file = path.join(WEB_ROOT, relative);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
      return route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || "application/octet-stream", body: fs.readFileSync(file) });
    });
    await context.addInitScript(() => {
      globalThis.localStorage.setItem("tpg_onboarded", "1");
      globalThis.AndroidApp = {
        saveBackup: (json) => { globalThis.__nativeBackup = json; },
        shareText: (text) => { globalThis.__nativeShare = text; },
        copyText: () => {},
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`https://${HOST}/`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#gameGrid .game-card").first()).toBeVisible();
    expect(await page.evaluate(() => globalThis.GameRegistry.games.length)).toBe(77);

    await page.locator("#profileChip").click();
    await page.locator("#exportDataBtn").click();
    const backup = await page.evaluate(() => JSON.parse(globalThis.__nativeBackup));
    expect(backup.app).toBe("TwoPlayerGames");
    await page.locator("#profileBackBtn").click();

    await page.evaluate(() => { globalThis.location.hash = "play/tictactoe"; });
    await expect(page.locator("#helpOverlay")).toBeVisible();
    await page.locator("#helpOk").click();
    for (const index of [0, 3, 1, 4, 2]) await page.locator(".ttt-cell").nth(index).click();
    await expect(page.locator("#winOverlay")).toBeVisible();
    await page.locator("#winShare").click();
    expect(await page.evaluate(() => globalThis.__nativeShare)).toContain(`https://${HOST}/`);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
