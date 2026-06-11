/* ============================================================
   Bản dịch tiếng Anh: TÊN + MÔ TẢ + HƯỚNG DẪN (howTo) của từng game.
   main.js dùng khi ngôn ngữ = "en". Không có thì tự về tiếng Việt.
   ============================================================ */
var GAMES_EN_DATA = {
  tictactoe: {
    name: "Tic-Tac-Toe",
    description: "The classic 3-in-a-row. Place X/O, with last-move and winning-line highlights, plus optional larger boards and 3-piece move mode.",
    howTo: [
      "Players take turns placing their mark (X then O) on an empty cell.",
      "Line up 3 of your marks in a row — horizontally, vertically or diagonally — to win.",
      "The last move and the winning line are highlighted to keep things clear.",
      "Optional modes: a larger board, or '3-piece move' where you slide your existing marks once all three are placed.",
    ],
  },
  gomoku: {
    name: "Gomoku (Five in a Row)",
    description: "Place stones on a 15x15 board; the first to line up five in a row wins.",
    howTo: [
      "Take turns placing one stone on any empty intersection of the 15x15 board.",
      "The first player to line up exactly five stones in a row (horizontal, vertical or diagonal) wins.",
      "There is no capturing — pure placement and blocking.",
      "Watch your opponent's open threats and block them before they reach five.",
    ],
  },
  connectfour: {
    name: "Connect Four",
    description: "Drop discs into columns with a bouncy fall animation. First to line up four in a row wins.",
    howTo: [
      "Click a column to drop your disc; it falls to the lowest empty slot.",
      "Connect four of your discs in a row — horizontal, vertical or diagonal — to win.",
      "Block your opponent's three-in-a-row before it becomes four.",
      "Board size and the number needed to win can be customized in the options.",
    ],
  },
  reversi: {
    name: "Reversi (Othello)",
    description: "Flip your opponent's discs by trapping them. Beginner-friendly hints and flip animations.",
    howTo: [
      "Place a disc so it traps a straight line of the opponent's discs between yours.",
      "All trapped discs flip to your color (with a flip animation).",
      "You must play a move that flips at least one disc; if you can't, your turn is skipped.",
      "When the board is full (or no one can move), the player with more discs wins.",
      "Legal moves are highlighted to help beginners.",
    ],
  },
  pentago: {
    name: "Pentago",
    description: "Place a marble, then rotate one quadrant. Get five in a row to win.",
    howTo: [
      "On your turn, place one marble on any empty spot.",
      "Then rotate one of the four quadrants 90° (clockwise or counter-clockwise) — this is mandatory.",
      "Get five of your marbles in a row (after the rotation) to win.",
      "The rotation can both build your line and break your opponent's — plan both.",
    ],
  },
  morris: {
    name: "Nine Men's Morris",
    description: "Place and slide pieces to form mills of three and capture your opponent's pieces.",
    howTo: [
      "Phase 1: take turns placing your pieces on the board's points.",
      "Form a 'mill' (three of your pieces in a line) to remove one enemy piece.",
      "Phase 2: once all pieces are placed, slide them along lines to adjacent empty points.",
      "Keep forming and re-forming mills. Reduce your opponent to two pieces (or block all their moves) to win.",
    ],
  },
  checkers: {
    name: "Checkers (Draughts)",
    description: "The classic diagonal jump-capture game. Forced captures, combo jumps, kinging and a flying-king mode.",
    howTo: [
      "Player 1 uses red pieces (bottom, moving up), Player 2 uses black (top, moving down). Red moves first.",
      "Click your piece — green cells are moves, red cells are captures. Click a highlighted cell to play it.",
      "Men move one step diagonally forward; capture by jumping over an adjacent enemy into the empty square beyond. If a capture is available you MUST take it, and chain jumps continue.",
      "Reach the far row to become a King ♔, which moves and captures in all four diagonal directions.",
      "'Flying king' mode lets kings move and capture along long diagonals. Win by capturing all enemy pieces or blocking all their moves.",
    ],
  },
  isolation: {
    name: "Isolation",
    description: "Move your pawn then remove a tile. Trap your opponent until they cannot move.",
    howTo: [
      "Each turn, move your pawn one step to any adjacent square (including diagonals).",
      "Then remove one empty tile from the board — it can no longer be used.",
      "Removed tiles and the opponent's square are blocked.",
      "The player who cannot make a move loses, so wall your opponent into a corner.",
    ],
  },
  laserchess: {
    name: "Laser Chess",
    description: "Aim mirrors and fire a laser each turn to destroy the opponent's key piece.",
    howTo: [
      "Each turn, move a piece one step or rotate a mirror 90°.",
      "At the end of your turn your laser fires and reflects off mirrors.",
      "A piece hit on a non-mirrored side is destroyed.",
      "Destroy the opponent's key piece (or expose it to your beam) to win.",
    ],
  },
  pathlockduel: {
    name: "Path Lock Duel",
    description: "Race across the grid while walling off your rival's shortest path.",
    howTo: [
      "Move your token toward your goal each turn.",
      "Place walls to lengthen or block your opponent's shortest route.",
      "You may never fully seal off a player's only path to their goal.",
      "First to reach the far side wins.",
    ],
  },
  hunterswarm: {
    name: "Hunter & Swarm",
    description: "One hunter versus a spreading swarm in an asymmetric chase on a grid.",
    howTo: [
      "One side controls 2 strong hunters; the other controls many weak swarm pieces.",
      "Hunters try to capture or corner the swarm; the swarm protects each other and blocks lanes.",
      "Each role has different movement — read the on-screen prompts for your side.",
      "Achieve your side's objective (capture vs. survive/trap) to win.",
    ],
  },
  hex: {
    name: "Hex",
    description: "Connect your two sides of the rhombus board with an unbroken chain before your opponent.",
    howTo: [
      "Take turns placing one stone on any empty hexagon.",
      "Each player owns two opposite edges of the rhombus board.",
      "Build an unbroken chain of your stones connecting your two edges to win.",
      "Hex can never end in a draw — one connection always blocks the other.",
    ],
  },
  quoridor: {
    name: "Quoridor",
    description: "Race your pawn to the far side while placing walls to slow your opponent. Smart AI included.",
    howTo: [
      "On your turn either move your pawn one square, or place a wall.",
      "Walls block movement but you can never completely trap a player from reaching their goal.",
      "Pawns may jump over an adjacent opponent.",
      "First pawn to reach the opposite side of the board wins.",
    ],
  },
  mancala: {
    name: "Mancala",
    description: "Sow seeds around the board and capture into your store. Most seeds wins.",
    howTo: [
      "Pick one of your pits and sow its seeds one-by-one counter-clockwise.",
      "Landing your last seed in your own store grants an extra turn.",
      "Landing in an empty pit on your side can capture the seeds opposite.",
      "When one side empties, the other player collects the rest. Most seeds in your store wins.",
    ],
  },
  dotsandboxes: {
    name: "Dots & Boxes",
    description: "Draw edges between dots; complete a box to claim it and move again. Resizable board with bonus tiles.",
    howTo: [
      "Take turns drawing one edge between two adjacent dots.",
      "Completing the fourth side of a box claims it AND gives you another turn.",
      "Chain boxes together to score many in one turn.",
      "Bonus tiles ⭐ are worth extra. Most boxes when the grid is full wins.",
    ],
  },
  orderchaos: {
    name: "Order & Chaos",
    description: "Order tries to make five in a row; Chaos tries to stop them on a 6x6 board.",
    howTo: [
      "Both players may place either an X or an O on the 6x6 board.",
      "'Order' wins by making five of the same mark in a row (any direction).",
      "'Chaos' wins by filling the board without any five-in-a-row.",
      "Choose your placements carefully — you control both symbols.",
    ],
  },
  nim: {
    name: "Nim",
    description: "Take stones from rows; force your opponent to take the last one (or not). Optimal AI.",
    howTo: [
      "On your turn, take any number of stones (at least one) from a single row.",
      "In normal play, the player who takes the LAST stone wins (misère mode flips this).",
      "Think in terms of balancing the rows (the XOR trick) to force a win.",
      "The Hard AI plays the mathematically optimal move.",
    ],
  },
  stratego: {
    name: "Stratego",
    description: "Hidden-rank army battle: scout, attack and capture the enemy flag.",
    howTo: [
      "Each piece has a hidden rank; only you can see your own.",
      "Move a piece onto an enemy to attack — the higher rank wins, ties remove both.",
      "Special rules: bombs destroy attackers, miners defuse bombs, a spy beats the marshal.",
      "Capture the enemy flag (or leave them with no legal moves) to win.",
    ],
  },
  tankarena: {
    name: "Tank Arena",
    description: "Turn-based tank duel on a grid with terrain, weapons and explosive effects.",
    howTo: [
      "Spend action points each turn to move, rotate and fire.",
      "Use terrain and walls for cover; pick up crates for weapons and items.",
      "Different weapons (shells, rockets, mines) have different range and splash.",
      "Reduce the enemy tank's health to zero to win.",
    ],
  },
  dicebattle: {
    name: "Dice Battle",
    description: "Command a dice army on a grid: move, grab energy and fight with rolls — roll a 6 for a critical hit.",
    howTo: [
      "Move your dice units across the grid and capture energy tiles.",
      "Attack an adjacent enemy by rolling — higher roll deals damage.",
      "Rolling a 6 lands a critical hit.",
      "Eliminate the enemy team to win.",
    ],
  },
  territorywar: {
    name: "Territory War",
    description: "Expand and capture zones across the map to control the most territory.",
    howTo: [
      "Expand your territory into adjacent cells each turn.",
      "Build defensive walls and attack the opponent's zones.",
      "Capture and hold as much of the map as you can.",
      "The player controlling the most territory at the end wins.",
    ],
  },
  crystalconquest: {
    name: "Crystal Conquest",
    description: "Move a mage to capture crystals for mana, then cast lightning, shields, blink, freeze and heal.",
    howTo: [
      "Move your mage around the map; standing on crystals generates mana.",
      "Spend mana on spells: lightning (damage), shield, blink (teleport), freeze and heal.",
      "Control more crystals to out-pace your opponent on mana.",
      "Capture the target number of crystals (or defeat the rival mage) to win.",
    ],
  },
  pong: {
    name: "Pong",
    description: "The arcade classic with power-ups, particle hits, gradual speed-up and multi-ball.",
    howTo: [
      "Control your paddle to bounce the ball back at your opponent.",
      "If the ball passes your paddle, the opponent scores.",
      "The ball speeds up over a rally; grab power-ups for multi-ball and effects.",
      "First to the target score wins. (Local play only.)",
    ],
  },
  poolbattle: {
    name: "Pool Battle",
    description: "Turn-based billiards with physics and power-ups: explosive balls, super shots and wide pockets.",
    howTo: [
      "Drag from the cue ball to aim and set power, then release to shoot.",
      "Pot object balls to score; potting the cue ball is a foul.",
      "Pick up power-ups on the table: exploding ball, super power, wide pockets.",
      "Reach the target score before your opponent to win.",
    ],
  },
  slingshotbattle: {
    name: "Slingshot Battle",
    description: "Drag-and-launch projectiles past obstacles, with chain-reaction barrels and pickups.",
    howTo: [
      "Drag back from your hero to aim and set power, then release to launch.",
      "Choose spells (stone, fireball, ricochet, arcane, cluster) — some cost mana.",
      "Hit explosive barrels 🛢️ to trigger chain reactions; smash crates for mana/health.",
      "Reduce the opponent's HP to zero to win.",
    ],
  },
  timeloopduel: {
    name: "Time Loop Duel",
    description: "Plan moves that replay each loop; outwit your rival across repeating turns.",
    howTo: [
      "Program a sequence of actions for the loop.",
      "Both players' plans replay simultaneously each round.",
      "Use the 'ghosts' of previous loops to your advantage.",
      "Hit the opponent's core while protecting yours to win.",
    ],
  },
  artillery: {
    name: "Artillery",
    description: "Set angle and power (factoring wind) to hit the enemy tank. Destructible terrain, many shells and pickups.",
    howTo: [
      "Two tanks sit at opposite ends. Player 1 (red) left, Player 2 (blue) right. Turn-based.",
      "On your turn, move with ◄ ► (limited fuel ⛽). The dotted line previews where your shot lands (wind included).",
      "Pick a shell: standard (unlimited), cluster (3-point blast), heavy (big, digs terrain). Special ammo is limited — grab 🎯 to refill.",
      "Adjust 'Angle' and 'Power', then press Fire (or Space). Shots follow gravity AND wind, which changes each turn.",
      "Terrain is destructible — each blast carves a crater. Grab pickups: ❤️ heal, 💥 big shot, 🛡️ shield, ⛽ fuel, 🎯 ammo. First to destroy the enemy tank wins.",
    ],
  },
  fishingfrenzy: {
    name: "Fishing Frenzy",
    description: "Aim and time your casts to land the biggest catches before your rival.",
    howTo: [
      "Aim your line and cast at the right moment to hook fish.",
      "Bigger and rarer fish are worth more points.",
      "Watch timing and positioning to beat your opponent's haul.",
      "The higher total score wins.",
    ],
  },
  coopdefense: {
    name: "Co-op Tower Defense",
    description: "Defend the lanes together: many maps, towers and monsters, a base health bar and a shared airstrike.",
    howTo: [
      "Pick a map and place towers in the slots beside the lanes.",
      "Each tower type has its own role: machine gun, cannon (splash), frost (slow), laser (pierce), sniper, tesla (chain), flame (burn), mortar.",
      "Spend the shared gold to build and upgrade; you can still build while a wave runs.",
      "Use the shared Airstrike 💥 to damage all monsters (on cooldown).",
      "Monsters that leak through cost base health. Survive all 10 waves to win together.",
    ],
  },
  basedefenseduel: {
    name: "Base Defense Duel",
    description: "Defend with towers and send 11 unit types (cavalry, artillery, medics...) to smash the enemy base. Upgrade economy, armor, speed and towers.",
    howTo: [
      "Defend your base with towers while sending units down the lanes to attack the enemy base.",
      "Gold accumulates over time — spend it on units, towers and upgrades.",
      "Each of the 11 unit types has a role (cavalry, artillery, healers, etc.).",
      "Upgrade economy, armor, speed and tower power as the match scales up.",
      "Destroy the opponent's main base to win.",
    ],
  },
  robotfactorywar: {
    name: "Robot Factory War",
    description: "Build and deploy robots from your factory to overwhelm your opponent's line.",
    howTo: [
      "Assemble robots from modules (head, body, weapon, legs) on your production line.",
      "Deployed robots automatically march down the lane and fight.",
      "Balance economy and unit composition to counter the enemy.",
      "Break through and destroy the opponent's side to win.",
    ],
  },
  dungeonrival: {
    name: "Dungeon Rival",
    description: "Race through parallel dungeons: fight monsters, loot, level up, shop with gold and sabotage your rival with shadow. First to slay the boss wins.",
    howTo: [
      "Each player explores their own dungeon. On your turn, click a lit cell next to your hero to move and reveal rooms.",
      "👹 monsters / 👺 elites / 🐲 boss fight automatically using your Attack and Defense. Wins grant XP, 🌑 shadow, 💰 gold and sometimes loot.",
      "🧰 treasure gives gear/potions/gold/shadow. ⛩️ shrines raise max HP and heal. 🪤 traps deal damage.",
      "🌀 portals teleport you to the other portal — use them to cross the map fast.",
      "🏪 Shop: spend gold to sharpen weapons, forge armor, buy potions or shadow (does NOT cost a turn).",
      "🌑 Sabotage with shadow: send monsters, plant traps, curse (direct damage) or fog the rival's map.",
      "Reach and slay your 🐲 boss first, or make the rival fall, to win.",
    ],
  },
  battleship: {
    name: "Battleship",
    description: "Place your fleet, use radar/cluster-bomb/torpedo and fire at the enemy grid. Sink all enemy ships to win. (Online only)",
    howTo: [
      "Online only — each player has a hidden fleet.",
      "PLACE SHIPS: pick a ship, rotate with the button (or R / right-click), then click your board to place. Click a placed ship to re-position. Or use '🔀 Random'. When all 5 are set, press 'Ready'.",
      "Once both are ready, take turns firing at the 'Enemy waters'. Red = hit, white = miss; sink a ship by hitting all its cells.",
      "📡 Radar: scans a 2×2 area and only reports the number of ship cells (no damage) — 3 uses.",
      "💥 Cluster bomb: hits a 2×2 block (4 shots at once) — 2 uses.",
      "🚀 Torpedo: fires a straight 4-cell line along a row or column — 2 uses.",
      "One action per turn. Sink the entire enemy fleet first to win.",
    ],
  },
  seabattleplus: {
    name: "Sea Battle+",
    description: "Battleship with manual fleet and minefields, special ships, radar, torpedoes and cluster bombs. (Online only)",
    howTo: [
      "Online only. Place your fleet AND lay a minefield in the setup phase.",
      "Special ships: armored battleship (takes an extra hit), stealth submarine (radar can't count it unless hit dead-center), and source ships that grant abilities.",
      "Use radar (3×3 scan), torpedoes (straight line) and cluster bombs (2×2) on your turn.",
      "Hidden mines punish the attacker who hits them (they lose their next turn).",
      "Sink all of the opponent's special fleet to win.",
    ],
  },
  submarinehunt: {
    name: "Submarine Hunt",
    description: "One pilots a hidden submarine; the other hunts with sonar, drones and depth charges. (Online only)",
    howTo: [
      "Online only. Player 1 is the submarine, Player 2 is the hunter.",
      "P1 secretly picks a dive point in the bottom two rows — the real position is never sent to P2.",
      "Each turn the sub moves one cell, runs silent, or drops a decoy. Reaching the top row wins for the sub.",
      "🌀 Deep dive: the sub skips its move to fully block the next depth charge (limited uses).",
      "P2 uses sonar (near/medium/far), drones (3×3 scan or bearing) and depth charges to deal damage.",
      "A direct charge deals 2 damage, adjacent deals 1. The sub has 3 HP.",
      "Reefs 🪨 block movement and can't be targeted. Read clues to corner the sub before it escapes.",
    ],
  },
  hiddenassassin: {
    name: "Hidden Assassin",
    description: "Deduce and ambush: hide your agent and read your opponent's clues.",
    howTo: [
      "Hide your agent and gather intel on the opponent's position.",
      "Use tracking, profiles, decoys and disguises to narrow them down.",
      "Set traps and make accusations — but a wrong call is risky.",
      "Correctly expose or ambush the enemy agent to win.",
    ],
  },
  trapmansion: {
    name: "Trap Mansion",
    description: "Place hidden traps and lure your rival through the mansion.",
    howTo: [
      "Place hidden traps around the mansion; you see your own traps, the opponent doesn't.",
      "Navigate room to room toward the goal.",
      "Avoid the opponent's hidden traps while steering them into yours.",
      "Reach the objective (or trap your rival out) to win.",
    ],
  },
  minesweeper: {
    name: "Minesweeper Duel",
    description: "Race to clear safe cells with logic; includes a suspicious-cell hint.",
    howTo: [
      "Share one minefield and take turns revealing cells.",
      "Numbers show how many mines touch that cell — use logic to find safe squares.",
      "Hitting a mine scores a point and lets you continue (this is competitive, not solo!).",
      "Use the hint button to flag a suspicious cell. Most mines found wins.",
    ],
  },
  treasure: {
    name: "Treasure Hunt",
    description: "Search the grid and deduce where the hidden treasure lies before your rival.",
    howTo: [
      "Each turn, dig a cell on the grid.",
      "Hot/cold feedback tells you how close you are to the hidden treasure.",
      "Triangulate from your digs to zero in on the spot.",
      "Find the treasure before your opponent to win.",
    ],
  },
  bullscows: {
    name: "Bulls & Cows",
    description: "Set a secret number and race to guess your opponent's. Hints, timer and speed scoring.",
    howTo: [
      "Each player sets a secret digit sequence.",
      "Take turns guessing the opponent's number.",
      "'Bulls' = right digit in the right place; 'Cows' = right digit, wrong place.",
      "Use the feedback (and optional hints/timer) to crack it first and win.",
    ],
  },
  hangman: {
    name: "Hangman",
    description: "Guess the hidden word letter by letter, with difficulty levels (4/6/8 lives) and a hint button.",
    howTo: [
      "One side sets a secret word; the other guesses letters one at a time.",
      "Correct letters reveal their positions; wrong letters cost a life.",
      "Difficulty sets your number of lives (4 / 6 / 8).",
      "Use the hint button if stuck. Reveal the word before running out of lives.",
    ],
  },
  noitu: {
    name: "Word Chain",
    description: "Take turns linking two-syllable words by the previous word's last syllable, with a dictionary hint button.",
    howTo: [
      "Players take turns entering a valid two-syllable word.",
      "Your word must begin with the last syllable of the previous word.",
      "No repeats; the word must exist in the dictionary.",
      "Use the hint button to look one up. Running out of time or ideas loses the round.",
    ],
  },
  auctionwar: {
    name: "Auction War",
    description: "Blind-bid on assets, bluff, manage cash and chase set bonuses. Overbid and you overpay.",
    howTo: [
      "Each round an asset with an estimated value is revealed (the true value stays hidden until the round ends).",
      "Read the 'rumor' tip — it hints whether the asset is worth more or less than the estimate (but rumors can mislead, so don't trust them blindly).",
      "Both players submit a sealed bid; online both lock secretly, on one device you take turns entering bids without seeing each other's.",
      "Highest bid wins the asset but pays its bid — overpay and you lose money. Collect sets for bonuses.",
      "The player with the most net worth at the end wins.",
    ],
  },
  memory: {
    name: "Memory (Match Pairs)",
    description: "Flip cards to find matching pairs, with 3D flip effects, combos, a timer and emoji themes.",
    howTo: [
      "On your turn, flip two cards.",
      "If they match you keep the pair and play again (combo!); if not, they flip back.",
      "Remember card positions from previous flips.",
      "Whoever collects more pairs wins. Try different emoji themes and the timer mode.",
    ],
  },
  pig: {
    name: "Pig (Dice)",
    description: "Push your luck rolling dice — bank before you bust. First to the target score wins.",
    howTo: [
      "On your turn, roll the die repeatedly to add to your turn total.",
      "Rolling a 1 wipes your turn total and ends your turn — so know when to stop.",
      "Choose 'Hold' to bank your turn total into your score safely.",
      "First player to reach the target score wins.",
    ],
  },
  yahtzee: {
    name: "Yahtzee",
    description: "Roll and lock dice to score combinations across the scorecard.",
    howTo: [
      "Roll five dice; you get up to three rolls, locking dice between rolls.",
      "Assign your result to a category (e.g. three-of-a-kind, full house, straight, Yahtzee).",
      "Each category is used once, so choose wisely.",
      "Highest total across the full scorecard wins.",
    ],
  },
  domino: {
    name: "Dominoes",
    description: "Match pip counts to chain dominoes from both ends. First to run out of tiles wins.",
    howTo: [
      "Play a tile that matches the pip count on one open end of the chain.",
      "If you can't play, draw or pass depending on the rules.",
      "Manage your hand to avoid getting stuck with heavy tiles.",
      "The first player to empty their hand wins the round.",
    ],
  },
  reactionduel: {
    name: "Reaction Duel",
    description: "Pure reflex showdown: wait for the light to turn GREEN, then tap as fast as you can. Tap early and you lose the round. First to win enough rounds takes the match.",
    howTo: [
      "Local game on one device (no online play).",
      "Press \"Start round\". The light stays in a WAIT state (red/amber) for a random delay.",
      "When it turns GREEN and shows \"TAP NOW!\", tap fast: Player 1 uses key A (or tap the left zone), Player 2 uses key L (or tap the right zone).",
      "Whoever taps validly first wins the round; the reaction time (ms) is shown.",
      "WARNING: if you tap BEFORE the light turns green, you foul and instantly lose the round.",
      "The first player to win the chosen number of rounds wins the match.",
    ],
  },
  dashdodge: {
    name: "Dash Dodge",
    description: "Real-time dodging race: each player steers a runner to avoid blocks falling down their lane. Survive longer (or reach the goal first) to win.",
    howTo: [
      "Local game on one keyboard (no online play).",
      "The screen splits into two vertical lanes. Player 1 controls the red runner on the left with W (up) / S (down).",
      "Player 2 controls the blue runner on the right with the arrow keys ↑ (up) / ↓ (down).",
      "Blocks keep falling down your lane — move to dodge them; touching one knocks you out immediately.",
      "With a goal distance set, reaching it while your opponent is out wins; in 'Endless' mode, whoever survives longer wins.",
      "If both are knocked out at the same time or both reach the goal, the match is a draw.",
    ],
  },
};

if (typeof window !== "undefined") window.GAMES_EN = GAMES_EN_DATA;
if (typeof module !== "undefined" && module.exports) module.exports = GAMES_EN_DATA;
