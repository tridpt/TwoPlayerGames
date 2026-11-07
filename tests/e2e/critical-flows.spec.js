"use strict";
const { test, expect } = require("@playwright/test");

async function prepare(page) {
  await page.addInitScript(() => localStorage.setItem("tpg_onboarded", "1"));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#gameGrid .game-card").first()).toBeVisible();
}

async function openOnlineHub(page) {
  await prepare(page);
  await page.locator("#openOnlineHubBtn").click();
  await expect(page.locator("#lobbyView")).toBeVisible();
}

async function dismissHelp(page) {
  await expect(page.locator("#helpOverlay")).toBeVisible();
  await page.locator("#helpOk").click();
  await expect(page.locator("#helpOverlay")).toBeHidden();
}

test("plays a complete local Tic-Tac-Toe game", async ({ page }) => {
  await prepare(page);
  await page.locator("#gameSearch").fill("Caro 3x3");
  await page.locator(".game-card", { hasText: "Caro 3x3" }).click();
  await page.locator("#detailPlayBtn").click();
  await page.locator("#modeLocal").click();
  await dismissHelp(page);

  const cells = page.locator(".ttt-cell");
  await expect(cells).toHaveCount(9);
  for (const index of [0, 3, 1, 4, 2]) await cells.nth(index).click();
  await expect(page.locator("#winOverlay")).toBeVisible();
});

test("does not carry a pending AI move into a restarted game", async ({ page }) => {
  await prepare(page);
  await page.locator("#gameSearch").fill("Caro 3x3");
  await page.locator(".game-card", { hasText: "Caro 3x3" }).click();
  await page.locator("#detailPlayBtn").click();
  await page.locator("#modeAI").click();
  await dismissHelp(page);

  await page.locator(".ttt-cell").first().evaluate((cell) => {
    cell.click();
    cell.ownerDocument.querySelector("#restartBtn").click();
  });
  await expect(page.locator(".ttt-cell svg")).toHaveCount(0);
  await page.waitForTimeout(650);
  await expect(page.locator(".ttt-cell svg")).toHaveCount(0);
  await expect(page.locator("#boardWrap")).not.toHaveClass(/ai-thinking/);
});

test("syncs an online move and chat between two browsers", async ({ browser }) => {
  const hostContext = await browser.newContext({ serviceWorkers: "block" });
  const guestContext = await browser.newContext({ serviceWorkers: "block" });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  try {
    await openOnlineHub(host);
    await host.locator("#createNameInput").fill("Host E2E");
    await host.locator("#lobbyGameSelect").selectOption("tictactoe");
    await host.locator("#createRoomBtn").click();
    await expect(host.locator("#roomCodeBox")).toBeVisible();
    const code = (await host.locator("#roomCodeVal").textContent()).trim();
    expect(code).toMatch(/^\d{4}$/);

    await openOnlineHub(guest);
    await guest.locator("#joinNameInput").fill("Guest E2E");
    await guest.locator("#joinCodeInput").fill(code);
    await guest.locator("#joinRoomBtn").click();
    await expect(host.locator("#gameView")).toBeVisible();
    await expect(guest.locator("#gameView")).toBeVisible();
    await Promise.all([dismissHelp(host), dismissHelp(guest)]);

    const hostCell = host.locator(".ttt-cell").nth(0);
    const guestCell = guest.locator(".ttt-cell").nth(0);
    await hostCell.click();
    if (await hostCell.locator("svg").count() === 0) await guestCell.click();
    await expect(hostCell.locator("svg")).toHaveCount(1);
    await expect(guestCell.locator("svg")).toHaveCount(1);

    await host.locator("#chatInput").fill("Xin chao tu E2E");
    await host.locator("#chatForm").evaluate((form) => form.requestSubmit());
    await expect(guest.locator("#chatMessages")).toContainText("Xin chao tu E2E");

    await guest.reload({ waitUntil: "domcontentloaded" });
    await expect(guest.locator("#gameView")).toBeVisible();
    await expect(guest.locator(".ttt-cell").nth(0).locator("svg")).toHaveCount(1);
    await expect(guest.locator("#gameRoomState")).toContainText("Đã kết nối lại");
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

test("awards ELO from a completed online game", async ({ browser, request }) => {
  const suffix = Date.now().toString(36);
  const users = [`rank${suffix}a`, `rank${suffix}b`];
  const registrations = await Promise.all(users.map((username) =>
    request.post("/api/register", { data: { username, password: "secure-e2e-password" } })));
  expect(registrations.every((response) => response.ok())).toBeTruthy();
  const credentials = await Promise.all(registrations.map((response) => response.json()));

  const contexts = await Promise.all(credentials.map(async (account) => {
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.addInitScript(({ token, username }) => {
      localStorage.setItem("tpg_auth_token", token);
      localStorage.setItem("tpg_auth_user", username);
      localStorage.setItem("tpg_onboarded", "1");
    }, account);
    return context;
  }));
  const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()));

  try {
    await openOnlineHub(host);
    await host.locator("#lobbyGameSelect").selectOption("tictactoe");
    await host.locator("#createRoomBtn").click();
    await expect(host.locator("#roomCodeBox")).toBeVisible();
    const code = (await host.locator("#roomCodeVal").textContent()).trim();

    await openOnlineHub(guest);
    await guest.locator("#joinCodeInput").fill(code);
    await guest.locator("#joinRoomBtn").click();
    await Promise.all([dismissHelp(host), dismissHelp(guest)]);
    await expect(host.locator("#onlineBadge")).toContainText("Xếp hạng ELO");
    await expect(guest.locator("#onlineBadge")).toContainText("Xếp hạng ELO");

    const hostFirst = (await host.locator("#onlineBadge").textContent()).includes("đi trước");
    const players = hostFirst ? [host, guest] : [guest, host];
    for (const [turn, cell] of [0, 3, 1, 4, 2].entries()) {
      const player = players[turn % 2];
      await player.locator(".ttt-cell").nth(cell).click();
      await expect(host.locator(".ttt-cell").nth(cell).locator("svg")).toHaveCount(1);
      await expect(guest.locator(".ttt-cell").nth(cell).locator("svg")).toHaveCount(1);
    }
    await expect(host.locator("#winOverlay")).toBeVisible();
    await expect(guest.locator("#winOverlay")).toBeVisible();
    await expect(players[0].locator("#winTitle")).toHaveText("Chiến thắng!");
    await expect(players[1].locator("#winTitle")).toHaveText("Thua mất rồi!");
    await expect(host.locator("#chatMessages")).toContainText("ELO:");
    await expect(guest.locator("#chatMessages")).toContainText("ELO:");

    const ratings = await Promise.all(credentials.map((account) =>
      request.get("/api/rating", { headers: { Authorization: `Bearer ${account.token}` } })));
    const data = await Promise.all(ratings.map((response) => response.json()));
    expect(data.map((rating) => rating.played)).toEqual([1, 1]);
    expect(data[hostFirst ? 0 : 1].wins).toBe(1);
    expect(data[hostFirst ? 1 : 0].losses).toBe(1);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("registers, logs out, and signs back in", async ({ page }) => {
  await prepare(page);
  const username = `e2e_${Date.now().toString(36)}`;
  const password = "secure-e2e-password";

  await page.locator("#profileChip").click();
  await page.locator("#accUser").fill(username);
  await page.locator("#accPass").fill(password);
  await page.locator("#accRegisterBtn").click();
  await expect(page.locator("#accountSignedIn")).toBeVisible();
  await expect(page.locator("#accWho")).toHaveText(username);

  await page.locator("#accLogoutBtn").click();
  await expect(page.locator("#accountSignedOut")).toBeVisible();
  await page.locator("#accUser").fill(username);
  await page.locator("#accPass").fill(password);
  await page.locator("#accLoginBtn").click();
  await expect(page.locator("#accountSignedIn")).toBeVisible();
  await expect(page.locator("#accWho")).toHaveText(username);
});
