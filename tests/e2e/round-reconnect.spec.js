"use strict";
const { test, expect } = require("@playwright/test");

test("RPS Plus tiếp tục đúng ba vòng khi tải lại và kết nối lại giữa hiệu ứng", async ({ browser }) => {
  test.setTimeout(60_000);
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()));
  const errors = [];
  try {
    for (const page of [host, guest]) {
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
      await page.goto("/");
      await page.locator("#openOnlineHubBtn").click();
    }
    await host.locator("#lobbyGameSelect").selectOption("rpsplus");
    await host.locator("#lobby_opt_rounds").selectOption("3");
    await host.locator("#createRoomBtn").click();
    await expect(host.locator("#roomCodeVal")).toHaveText(/^\d{4}$/);
    const code = (await host.locator("#roomCodeVal").textContent()).trim();
    await guest.locator("#joinCodeInput").fill(code);
    await guest.locator("#joinRoomBtn").click();
    for (const page of [host, guest]) {
      await expect(page.locator("#helpOverlay")).toBeVisible();
      await page.locator("#helpOk").click();
    }

    async function playRound(n) {
      await host.locator('.rps2-mv[data-c="R"]').click();
      await guest.locator('.rps2-mv[data-c="S"]').click();
      await expect.poll(async () => {
        const scores = await guest.locator(".rps2-pinfo b").allTextContents();
        return scores.map(Number).reduce((a, b) => a + b, 0);
      }).toBe(n);
    }
    async function sameScores(n) {
      await expect.poll(async () => {
        const [a, b] = await Promise.all([host, guest].map((page) =>
          page.locator(".rps2-pinfo b").allTextContents()));
        return JSON.stringify({ a, b, total: a.map(Number).reduce((x, y) => x + y, 0) });
      }).toMatch(new RegExp(`"total":${n}`));
      const [a, b] = await Promise.all([host, guest].map((page) =>
        page.locator(".rps2-pinfo b").allTextContents()));
      expect(a).toEqual(b);
    }

    await playRound(1);
    await host.reload();
    await expect(host.locator("#gameView")).toBeVisible();
    await sameScores(1);

    await playRound(2);
    await host.evaluate(() => { globalThis.Net.disconnect(); globalThis.Net.emit("netdown"); });
    await expect(host.locator("#boardWrap")).toHaveJSProperty("inert", true);
    await host.evaluate(() => globalThis.Net.connect());
    await expect(host.locator("#gameRoomState")).toContainText(/kết nối lại|reconnected/i);
    await sameScores(2);

    await playRound(3);
    await sameScores(3);
    for (const page of [host, guest]) {
      await expect(page.locator("#winOverlay")).toBeVisible();
    }
    const statsBefore = await host.evaluate(() => JSON.parse(localStorage.getItem("tpg_stats"))?.rpsplus);
    await host.reload();
    await expect(host.locator("#winOverlay")).toBeVisible();
    const statsAfter = await host.evaluate(() => JSON.parse(localStorage.getItem("tpg_stats"))?.rpsplus);
    expect(statsAfter).toEqual(statsBefore);
    await host.locator("#winReplay").click();
    await expect(host.locator("#replayOverlay")).toBeVisible();
    await host.keyboard.press("End");
    await expect(host.locator("#replayProgress")).toHaveText("6/6");
    const replayScores = await host.locator("#replayBoard .rps2-pinfo b").allTextContents();
    expect(replayScores.map(Number).reduce((a, b) => a + b, 0)).toBe(3);
    await expect(host.locator("#replayBoard")).toHaveJSProperty("inert", true);
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
