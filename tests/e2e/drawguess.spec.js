"use strict";
const { test, expect } = require("@playwright/test");

function wordOn(page) {
  return page.locator(".dg-secret").textContent().then((text) => text.split(": ").at(-1).trim());
}

async function drawLine(page) {
  await page.locator(".dg-canvas").scrollIntoViewIfNeeded();
  const box = await page.locator(".dg-canvas").boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.25, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, y, { steps: 8 });
  await page.mouse.up();
}

test("Draw & Guess plays five local rounds, including drawing and accent-free guesses", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
  await page.goto("/#play/drawguess");
  await expect(page.locator("#helpOverlay")).toBeVisible();
  await page.locator("#helpOk").click();

  for (let round = 0; round < 5; round++) {
    await page.locator(".dg-start").click();
    await page.locator(".dg-reveal").click();
    const answer = await wordOn(page);
    await page.locator(".dg-reveal").click();
    await expect(page.locator(".dg-secret")).not.toContainText(answer);
    if (round === 0) {
      await drawLine(page);
      await expect(page.locator(".dg-undo")).toBeEnabled();
      await page.locator(".dg-undo").click();
      await expect(page.locator(".dg-undo")).toBeDisabled();
      await page.locator(".dg-guess").fill("sai đáp án");
      await page.locator(".dg-submit").click();
      await expect(page.locator(".dg-guesses")).toContainText("❌ sai đáp án");
      await expect(page.locator(".dg-guess")).toBeEnabled();
    }
    const guess = round === 0 ? answer.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : answer;
    await page.locator(".dg-guess").fill(guess);
    await page.locator(".dg-submit").click();
    await expect(page.locator(".dg-result")).toContainText(answer);
  }
  await expect(page.locator(".dg-scores")).toContainText("P1: 7");
  await expect(page.locator(".dg-scores")).toContainText("P2: 8");
  await expect(page.locator("#winOverlay")).toBeVisible();
  await page.locator("#winReplay").click();
  await expect(page.locator("#replayOverlay")).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.locator("#replayBoard .dg-scores")).toContainText("P1: 7");
  await expect(page.locator("#replayBoard .dg-scores")).toContainText("P2: 8");
  expect(errors).toEqual([]);
});

test("Draw & Guess accepts touch drawing on a phone-sized screen", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
    await page.goto("/#play/drawguess");
    await page.locator("#helpOk").click();
    await page.locator(".dg-start").click();
    const canvas = page.locator(".dg-canvas");
    await canvas.scrollIntoViewIfNeeded();
    const before = await canvas.evaluate((el) => el.toDataURL());
    const box = await canvas.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(".dg-undo")).toBeEnabled();
    await expect.poll(() => canvas.evaluate((el) => el.toDataURL())).not.toBe(before);
    await page.locator(".dg-clear").click();
    await expect.poll(() => canvas.evaluate((el) => el.toDataURL())).toBe(before);
  } finally {
    await context.close();
  }
});

test("Draw & Guess ends a round when 60 seconds expire", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
  await page.goto("/#play/drawguess");
  await page.locator("#helpOk").click();
  await page.clock.install();
  await page.locator(".dg-start").click();
  await page.clock.fastForward(60_500);
  await expect(page.locator(".dg-result")).toContainText("Hết giờ");
  await expect(page.locator(".dg-scores")).toContainText("P1: 1");
  await expect(page.locator(".dg-round")).toHaveText("Vòng 2/5");
});

test("Draw & Guess keeps its secret, drawing, timer and pending guess across online reloads", async ({ browser }) => {
  test.setTimeout(120_000);
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()));
  const errors = [];
  try {
    host.setDefaultTimeout(8_000);
    guest.setDefaultTimeout(8_000);
    for (const page of [host, guest]) {
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
      await page.goto("/");
      await page.locator("#openOnlineHubBtn").click();
    }
    await host.locator("#lobbyGameSelect").selectOption("drawguess");
    await host.locator("#createRoomBtn").click();
    await expect(host.locator("#roomCodeVal")).toHaveText(/^\d{4}$/);
    const code = (await host.locator("#roomCodeVal").textContent()).trim();
    await guest.locator("#joinCodeInput").fill(code);
    await guest.locator("#joinRoomBtn").click();
    for (const page of [host, guest]) {
      await expect(page.locator("#helpOverlay")).toBeVisible();
      await page.locator("#helpOk").click();
    }

    async function roles() {
      const hostDraws = await host.locator(".dg-start").isVisible();
      return hostDraws ? [host, guest] : [guest, host];
    }
    async function guessCorrect(artist, guesser) {
      const answer = await wordOn(artist);
      await expect(guesser.locator(".dg-guess")).toBeVisible();
      await expect(guesser.locator("#boardWrap")).toHaveJSProperty("inert", false);
      await guesser.locator(".dg-guess").fill(answer);
      await guesser.locator(".dg-submit").click();
      for (const page of [host, guest]) await expect(page.locator(".dg-result")).toContainText(answer);
    }

    let [artist, guesser] = await roles();
    await artist.locator(".dg-start").click();
    await expect(artist.locator(".dg-secret")).toContainText("Từ cần vẽ:");
    await expect(guesser.locator(".dg-secret-box")).toBeHidden();
    await drawLine(artist);
    const drawing = await artist.locator(".dg-canvas").evaluate((canvas) => canvas.toDataURL());
    await expect.poll(() => guesser.locator(".dg-canvas").evaluate((canvas) => canvas.toDataURL())).toBe(drawing);
    const before = await artist.evaluate(() => JSON.parse(localStorage.getItem("tpg_online_session")).gameState);
    expect(before.secret).toHaveLength(3);
    await artist.reload();
    await expect(artist.locator("#gameView")).toBeVisible();
    await expect(artist.locator(".dg-secret")).toContainText("Từ cần vẽ:");
    await expect(artist.locator(".dg-canvas").evaluate((canvas) => canvas.toDataURL())).resolves.toBe(drawing);
    await expect(artist.locator(".dg-timer")).toContainText(/⏱ \d+s/);
    await guessCorrect(artist, guesser);

    [artist, guesser] = await roles();
    await artist.locator(".dg-start").click();
    const answer = await wordOn(artist);
    await artist.evaluate(() => { globalThis.Net.disconnect(); globalThis.Net.emit("netdown"); });
    await guesser.locator(".dg-guess").fill(answer);
    await guesser.locator(".dg-submit").click();
    await artist.reload();
    await expect(artist.locator("#gameView")).toBeVisible();
    for (const page of [host, guest]) await expect(page.locator(".dg-result")).toContainText(answer);

    for (let round = 2; round < 5; round++) {
      [artist, guesser] = await roles();
      await artist.locator(".dg-start").click();
      await expect(guesser.locator(".dg-guess")).toBeVisible();
      await guessCorrect(artist, guesser);
    }
    for (const page of [host, guest]) {
      await expect(page.locator("#winOverlay")).toBeVisible();
      await expect(page.locator(".dg-scores")).toContainText("P2: 8");
    }
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
