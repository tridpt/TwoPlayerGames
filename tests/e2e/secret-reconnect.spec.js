"use strict";
const { test, expect } = require("@playwright/test");

const PRIVATE_GAMES = ["battleship", "hiddenassassin", "seabattleplus", "submarinehunt", "trapmansion"];

for (const id of PRIVATE_GAMES) {
  test(`${id} preserves its private state after a reload`, async ({ browser }) => {
    test.setTimeout(60_000);
    const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
    const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()));
    try {
      for (const page of [host, guest]) {
        await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
        await page.goto("/");
        await page.locator("#openOnlineHubBtn").click();
      }
      await host.locator("#lobbyGameSelect").selectOption(id);
      await host.locator("#createRoomBtn").click();
      await expect(host.locator("#roomCodeVal")).toHaveText(/^\d{4}$/);
      const code = (await host.locator("#roomCodeVal").textContent()).trim();
      await guest.locator("#joinCodeInput").fill(code);
      await guest.locator("#joinRoomBtn").click();
      for (const page of [host, guest]) {
        await expect(page.locator("#helpOverlay")).toBeVisible();
        await page.locator("#helpOk").click();
      }

      let subject = host;
      if (id === "battleship" || id === "seabattleplus") {
        const ready = id === "battleship" ? '.bs-controls [data-act="ready"]' : '.sbx-setup [data-act="ready"]';
        for (const page of [host, guest]) await page.locator(ready).click();
        const prefix = id === "battleship" ? "bs" : "sbx";
        const first = await host.locator(`.${prefix}-board-wrap`).nth(1).evaluate((el, name) => el.classList.contains(`${name}-active`), prefix)
          ? host : guest;
        const second = first === host ? guest : host;
        await first.locator(`.${prefix}-board-wrap`).nth(1).locator(`.${prefix}-cell`).first().click();
        await expect(first.locator(`.${prefix}-board-wrap`).nth(1).locator(`.${prefix}-cell`).first())
          .toHaveClass(id === "battleship" ? /hit|miss/ : /hit|miss|armor|mine-hit/);
        await expect(second.locator(`.${prefix}-board-wrap`).first().locator(`.${prefix}-cell`).first())
          .toHaveClass(id === "battleship" ? /hit|miss/ : /hit|miss|armor|mine-hit/);
      } else if (id === "submarinehunt") {
        subject = await host.locator(".sh-controls [data-confirm]").count() ? host : guest;
        const hunter = subject === host ? guest : host;
        await subject.locator(".sh-cell.sh-target").first().click();
        await subject.locator(".sh-controls [data-confirm]").click();
        await subject.locator(".sh-cell.sh-target").first().click();
        await expect(hunter.locator(".sh-cell.sh-noise-zone").first()).toBeVisible();
      } else if (id === "hiddenassassin") {
        subject = await host.locator('.ha-action[data-mode="trap"]').isEnabled() ? host : guest;
        const second = subject === host ? guest : host;
        await subject.locator('.ha-action[data-mode="trap"]').click();
        const canvas = subject.locator(".ha-canvas");
        const box = await canvas.boundingBox();
        await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
        await expect(second.locator(".ha-mid b")).toContainText("Lượt 2");
      } else if (id === "trapmansion") {
        subject = await host.locator('.tm-action[data-mode="search"]').isEnabled() ? host : guest;
        const second = subject === host ? guest : host;
        await subject.locator('.tm-action[data-mode="search"]').click();
        await expect(second.locator('.tm-action[data-mode="move"]')).toBeEnabled();
      }

      const before = await subject.evaluate(() => {
        globalThis.dispatchEvent(new Event("pagehide"));
        return JSON.parse(localStorage.getItem("tpg_online_session")).gameState;
      });
      expect(before?.v).toBe(1);
      await subject.reload();
      await expect(subject.locator("#gameView")).toBeVisible();
      await expect.poll(() => subject.evaluate(() => JSON.parse(localStorage.getItem("tpg_online_session"))?.gameState?.v)).toBe(1);
      const after = await subject.evaluate(() => JSON.parse(localStorage.getItem("tpg_online_session")).gameState);
      expect(after).toEqual(before);
      if (id === "battleship") await expect(subject.locator(".bs-place")).toHaveClass(/bs-hidden/);
      if (id === "seabattleplus") await expect(subject.locator(".sbx-setup")).toHaveClass(/sbx-hidden/);
      if (id === "submarinehunt") await expect(subject.locator(".sh-cell.sh-sub")).toHaveCount(1);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}

test("Hidden Assassin restores the finished result after a reload", async ({ browser }) => {
  test.setTimeout(60_000);
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()));
  try {
    for (const page of [host, guest]) {
      await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
      await page.goto("/");
      await page.locator("#openOnlineHubBtn").click();
    }
    await host.locator("#lobbyGameSelect").selectOption("hiddenassassin");
    await host.locator("#createRoomBtn").click();
    await expect(host.locator("#roomCodeVal")).toHaveText(/^\d{4}$/);
    const code = (await host.locator("#roomCodeVal").textContent()).trim();
    await guest.locator("#joinCodeInput").fill(code);
    await guest.locator("#joinRoomBtn").click();
    for (const page of [host, guest]) {
      await expect(page.locator("#helpOverlay")).toBeVisible();
      await page.locator("#helpOk").click();
    }
    const accuser = await host.locator('.ha-action[data-mode="accuse"]').isEnabled() ? host : guest;
    await accuser.locator('.ha-action[data-mode="accuse"]').click();
    const canvas = accuser.locator(".ha-canvas");
    const box = await canvas.boundingBox();
    await canvas.click({ position: { x: box.width * 740 / 900, y: box.height * 152 / 560 } });
    await expect(accuser.locator("#winOverlay")).toBeVisible();
    const title = await accuser.locator("#winTitle").textContent();
    await accuser.reload();
    await expect(accuser.locator("#gameView")).toBeVisible();
    await expect(accuser.locator("#winOverlay")).toBeVisible();
    await expect(accuser.locator("#winTitle")).toHaveText(title);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("Battleship keeps its fleet through a same-page reconnect", async ({ browser }) => {
  test.setTimeout(60_000);
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()));
  try {
    for (const page of [host, guest]) {
      await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
      await page.goto("/");
      await page.locator("#openOnlineHubBtn").click();
    }
    await host.locator("#lobbyGameSelect").selectOption("battleship");
    await host.locator("#createRoomBtn").click();
    await expect(host.locator("#roomCodeVal")).toHaveText(/^\d{4}$/);
    const code = (await host.locator("#roomCodeVal").textContent()).trim();
    await guest.locator("#joinCodeInput").fill(code);
    await guest.locator("#joinRoomBtn").click();
    for (const page of [host, guest]) {
      await expect(page.locator("#helpOverlay")).toBeVisible();
      await page.locator("#helpOk").click();
      await page.locator('.bs-controls [data-act="ready"]').click();
    }
    const fleetBefore = await host.locator(".bs-board-wrap").first().locator(".bs-cell.ship").evaluateAll(
      (cells) => cells.map((cell) => Array.from(cell.parentElement.children).indexOf(cell)));
    await host.evaluate(() => { globalThis.Net.disconnect(); globalThis.Net.emit("netdown"); });
    await expect(host.locator("#boardWrap")).toHaveJSProperty("inert", true);
    await expect(guest.locator("#gameRoomState")).toContainText(/mất kết nối|disconnected/i);
    await host.evaluate(() => globalThis.Net.connect());
    await expect(host.locator("#boardWrap")).toHaveJSProperty("inert", false);
    await expect(host.locator(".bs-place")).toHaveClass(/bs-hidden/);
    const fleetAfter = await host.locator(".bs-board-wrap").first().locator(".bs-cell.ship").evaluateAll(
      (cells) => cells.map((cell) => Array.from(cell.parentElement.children).indexOf(cell)));
    expect(fleetAfter).toEqual(fleetBefore);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
