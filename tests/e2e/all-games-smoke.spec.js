"use strict";
const { test, expect } = require("@playwright/test");

test("opens every locally playable game in a real browser", async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
  const errors = [];
  let activeGame = "startup";
  page.on("pageerror", (error) => errors.push(`${activeGame}: ${error.message}`));
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const ids = await page.evaluate(() => globalThis.GameRegistry.games
    .filter((game) => game.localReady !== false)
    .map((game) => game.id));
  expect(ids).toHaveLength(72); // 5 trò ẩn thông tin chỉ hỗ trợ online

  for (const id of ids) {
    activeGame = id;
    await page.evaluate((gameId) => { globalThis.location.hash = `play/${gameId}`; }, id);
    await expect(page.locator("#gameView"), id).toBeVisible();
    await expect.poll(() => page.locator("#boardWrap").evaluate((board) => board.children.length),
      { message: `${id}: game board remains empty`, timeout: 8000 }).toBeGreaterThan(0);
    await expect(page.locator("#helpOverlay"), id).toBeVisible();
    await page.locator("#helpOk").click();
    await page.locator("#backBtn").click();
    await expect(page.locator("#menu"), id).toBeVisible();
  }

  expect(errors).toEqual([]);
});

test("starts every online-only game in two browsers", async ({ browser }) => {
  test.setTimeout(120_000);
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()));
  host.setDefaultTimeout(8_000);
  guest.setDefaultTimeout(8_000);
  const errors = [];
  let activeGame = "startup";
  host.on("pageerror", (error) => errors.push(`${activeGame} host: ${error.message}`));
  guest.on("pageerror", (error) => errors.push(`${activeGame} guest: ${error.message}`));
  const ids = ["battleship", "hiddenassassin", "seabattleplus", "submarinehunt", "trapmansion"];

  try {
    for (const id of ids) {
      activeGame = id;
      for (const page of [host, guest]) {
        await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.locator("#openOnlineHubBtn").click();
      }
      await host.locator("#lobbyGameSelect").selectOption(id);
      await host.locator("#createRoomBtn").click();
      await expect(host.locator("#roomCodeVal")).toHaveText(/^\d{4}$/);
      const code = (await host.locator("#roomCodeVal").textContent()).trim();
      expect(code, id).toMatch(/^\d{4}$/);
      await guest.locator("#joinCodeInput").fill(code);
      await guest.locator("#joinRoomBtn").click();

      for (const page of [host, guest]) {
        await expect(page.locator("#gameView"), id).toBeVisible();
        await expect.poll(() => page.locator("#boardWrap").evaluate((board) => board.children.length),
          { message: `${id}: online board remains empty`, timeout: 8000 }).toBeGreaterThan(0);
        await expect(page.locator("#helpOverlay"), id).toBeVisible();
        await page.locator("#helpOk").click();
      }
      if (id === "battleship") {
        for (const page of [host, guest]) await page.locator('.bs-controls [data-act="ready"]').click();
        const [first, second] = await host.locator(".bs-board-wrap").nth(1).evaluate((el) => el.classList.contains("bs-active"))
          ? [host, guest] : [guest, host];
        await expect(first.locator(".bs-board-wrap").nth(1)).toHaveClass(/bs-active/);
        await first.locator(".bs-board-wrap").nth(1).locator(".bs-cell").first().click();
        await expect(first.locator(".bs-board-wrap").nth(1).locator(".bs-cell").first()).toHaveClass(/hit|miss/);
        await expect(second.locator(".bs-board-wrap").first().locator(".bs-cell").first()).toHaveClass(/hit|miss/);
      } else if (id === "seabattleplus") {
        for (const page of [host, guest]) await page.locator('.sbx-setup [data-act="ready"]').click();
        const [first, second] = await host.locator(".sbx-board-wrap").nth(1).evaluate((el) => el.classList.contains("sbx-active"))
          ? [host, guest] : [guest, host];
        await expect(first.locator(".sbx-board-wrap").nth(1)).toHaveClass(/sbx-active/);
        await first.locator(".sbx-board-wrap").nth(1).locator(".sbx-cell").first().click();
        await expect(first.locator(".sbx-board-wrap").nth(1).locator(".sbx-cell").first()).toHaveClass(/hit|miss|armor|mine-hit/);
        await expect(second.locator(".sbx-board-wrap").first().locator(".sbx-cell").first()).toHaveClass(/hit|miss|armor|mine-hit/);
      } else if (id === "submarinehunt") {
        const [sub, hunter] = await host.locator(".sh-controls [data-confirm]").count()
          ? [host, guest] : [guest, host];
        await sub.locator(".sh-cell.sh-target").first().click();
        await sub.locator(".sh-controls [data-confirm]").click();
        await expect(hunter.locator(".sh-mid b")).toContainText("Pha 1");
        await expect(hunter.locator(".sh-cell.sh-sub")).toHaveCount(0);
        await sub.locator(".sh-cell.sh-target").first().click();
        await expect(hunter.locator(".sh-cell.sh-noise-zone").first()).toBeVisible();
      } else if (id === "hiddenassassin") {
        const [first, second] = await host.locator('.ha-action[data-mode="trap"]').isEnabled()
          ? [host, guest] : [guest, host];
        await first.locator('.ha-action[data-mode="trap"]').click();
        const canvas = first.locator(".ha-canvas");
        const box = await canvas.boundingBox();
        await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
        await expect(second.locator(".ha-mid b")).toContainText("Lượt 2");
      } else if (id === "trapmansion") {
        const [first, second] = await host.locator('.tm-action[data-mode="search"]').isEnabled()
          ? [host, guest] : [guest, host];
        await first.locator('.tm-action[data-mode="search"]').click();
        await expect(second.locator('.tm-action[data-mode="move"]')).toBeEnabled();
      }
      await host.locator("#backBtn").click();
      await expect(host.locator("#menu"), id).toBeVisible();
      // Khi chủ phòng rời đi, khách tự trở về menu sau thông báo ngắn.
      await expect(guest.locator("#menu"), id).toBeVisible();
    }
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
