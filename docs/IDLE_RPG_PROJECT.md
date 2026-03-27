# CLAUDE.md — Idle RPG Project

## Project Overview

A production-quality, browser-based 2D idle RPG inspired by MapleStory Idle (메이플 키우기).
Built in pure JavaScript, targeting deployment on Vercel/Netlify as a static site.

**This is NOT**: a Vampire Survivors clone, a top-down game, a roguelike, or a clicker.
**This IS**: A 2D platformer-map idle RPG with auto-battle, deep equipment enhancement,
companion gacha, multiple dungeon types, and offline progression.

## Tech Stack (STRICT — do not deviate)

-   **Language**: JavaScript (ES2024+). NOT TypeScript.
-   **ECS**: bitECS v0.4 (`npm i bitecs`) — entities are uint32 IDs, components are TypedArray SoA
-   **Renderer**: PixiJS v8 (`npm i pixi.js`) — rendering ONLY, no game logic in PixiJS
-   **UI Layer**: Preact (`npm i preact`) + CSS Modules — overlaid on PixiJS canvas
-   **Bundler**: Vite (`npm i vite`)
-   **Storage**: IndexedDB via idb (`npm i idb`) — NO localStorage
-   **Tilemap Editor**: Tiled JSON format (loaded at runtime)
-   **Spritesheet**: TexturePacker JSON Hash format

## Architecture Rules (MUST follow)

1. **ECS everywhere**: Entity = number, Component = TypedArray, System = pure function
2. **Logic/Render split**: Systems in `src/systems/logic/` NEVER touch PixiJS.
   Systems in `src/systems/render/` are read-only on ECS data.
   → Removing all render systems must produce a headless simulation.
3. **Fixed timestep**: Logic runs at 20 ticks/sec. Render runs at rAF.
   Use alpha interpolation for smooth visuals.
4. **Event entities**: Damage, loot drops, level-ups are ECS entities, not function calls.
5. **Data-driven**: ALL game balance lives in `src/data/*.json`. Zero magic numbers in code.
6. **Zero GC in hot path**: Object pools for particles, damage numbers, projectiles.
   No `new` or object literals inside per-frame systems.
7. **Spatial hash**: Use grid-based spatial hashing for collision and range queries.

## Build & Run

```bash
npm install
npm run dev      # Vite dev server on localhost:5173
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Test

```bash
npm test                    # Run all tests
npm run test:damage         # Damage formula verification
npm run test:gacha          # Gacha probability verification (10k rolls)
npm run test:offline        # Offline reward consistency
npm run test:enhancement    # Scroll/starforce/potential probability check
```

## Project Structure

```
src/
  main.js                     # Entry point
  core/                       # GameLoop, World, ObjectPool, SpatialHash, SaveManager
  components/                 # bitECS component definitions (TypedArray schemas)
  systems/
    logic/                    # Headless systems (Input, AI, Physics, Combat, Loot, etc.)
    render/                   # PixiJS sync systems (Sprite, Camera, Particle, UIBridge)
    meta/                     # Game meta systems (Equipment, Gacha, Dungeon, Arena, etc.)
  render/                     # PixiJS setup, SpriteFactory, TilemapRenderer, Effects
  ui/                         # Preact components (screens, HUD, modals)
  data/                       # JSON game data (chapters, monsters, jobs, equipment, etc.)
  workers/                    # Web Worker for offline simulation
assets/
  sprites/                    # Character/monster spritesheets (TexturePacker format)
  tilemaps/                   # Tiled JSON tilemaps per chapter
  ui/                         # UI icons and frames
  audio/                      # BGM and SFX
tools/
  balance-sim.js              # CLI balance simulator
tests/
  *.test.js                   # Vitest unit tests
```

## Code Style

-   Use concise variable names in hot paths (eid, dt, dx, dy)
-   Systems are exported functions: `export function PhysicsSystem(world, dt) {}`
-   System pipeline is an explicit ordered array in GameLoop.js
-   Preact components use functional style + hooks
-   CSS Modules for all UI styling (no Tailwind, no inline styles)
-   No classes for game entities — ECS only. Classes OK for infrastructure (ObjectPool, SpatialHash).

## Git Conventions

-   Commit per system/feature: `feat(physics): add platform collision + gravity`
-   Branch per phase: `phase/01-platformer-autobattle`
-   Run tests before commit

---

# FULL GAME SPECIFICATION

## Table of Contents

1. Core Loop & Map
2. Character & Jobs
3. Stat System
4. Combat & Damage Formula
5. Equipment System
6. Weapon System
7. Slot Enhancement (Scroll / Starforce / Potential)
8. Warrior's Power & Ability
9. Companion System
10. Relic System
11. Skill & Mastery
12. Content: Chapter Hunting & Chapter Challenge
13. Content: 5 Growth Dungeons
14. Content: World Boss & Boss Raid
15. Content: Arena (PvP)
16. Content: Guild
17. Content: Party Quest
18. Costume System
19. Daily Quest / Achievement / Attendance
20. Offline Rewards & Quick Hunt
21. Currency System
22. Save/Load & Deployment

---

## 1. Core Loop & Map

### Game Loop

-   Fixed timestep: logic at 20 tick/s (50ms), render at rAF
-   Accumulator pattern with max 5 catchup ticks
-   Alpha interpolation for render smoothing

### Map Structure

-   2D platformer maps (NOT top-down, NOT single-line horizontal)
-   Multiple platform layers with ladders connecting them
-   Camera follows player character
-   Tilemap loaded from Tiled JSON
-   Each chapter = 1 map with unique tileset + background + monster set
-   Monsters spawn at fixed points, respawn after N seconds when killed

### Auto-Battle

-   Default ON: character auto-moves to nearest monster, auto-attacks
-   Pathfinding: simple platform-aware navigation (same-level walk, ladder up/down)
-   When auto is ON, skills auto-fire on cooldown
-   Player can toggle auto OFF and use manual controls:
    -   Arrow keys / touch joystick: move left/right
    -   Space / button: jump
    -   Down+Space: drop through platform

### Physics (custom, no library)

-   Gravity: 980 px/s², terminal velocity 600 px/s
-   AABB collision with tilemap
-   One-way platforms (drop-through on down+jump)
-   Ladder: disable gravity, allow up/down movement

---

## 2. Character & Jobs

### Job Selection (at game start)

4 classes × 2-3 jobs each = 10 jobs total:

-   Warrior: Hero, Dark Knight, Paladin
-   Mage: Archmage (Ice/Lightning), Archmage (Fire/Poison)
-   Archer: Bowmaster, Marksman
-   Thief: Night Lord, Shadower

**Job is permanent — cannot be changed after selection.**

### Job Advancement (전직)

-   Lv.10 → 1st advancement (choose sub-job)
-   Lv.30 → 2nd advancement (stat bonus + new skill)
-   Lv.60 → 3rd advancement (new skill)
-   Lv.100 → 4th advancement (ultimate skill unlocked)
-   Advancement quest: kill N specific monsters (trivial difficulty)

### Base Stats per Job

Each job has different growth rates for:
STR, DEX, INT, LUK, HP, MP, ATK, DEF, ATK_SPEED, CRIT_RATE, CRIT_DMG

Data: `jobs.json`

---

## 3. Stat System

### Level-Up Stat Allocation

-   Each level-up grants **5 ability points**
-   Player distributes points into: Main Stat, ATK, HP, DEF, etc.
-   Every 25 points spent → **Maple Grade** increases
-   Maple Grade increase grants **special ability points** (separate pool)

### Stat Sources (all additive/multiplicative as specified)

| Source                 | Type               |
| ---------------------- | ------------------ |
| Base (job + level)     | Flat               |
| Level-up allocation    | Flat               |
| Equipment base stats   | Flat               |
| Scroll enhancement     | Flat               |
| Starforce              | Flat               |
| Potential options      | % or Flat          |
| Companion equip effect | Flat or %          |
| Companion own effect   | Flat or %          |
| Relic active effect    | %                  |
| Relic passive effect   | %                  |
| Warrior's Power        | Flat               |
| Ability options        | Flat or %          |
| Guild buffs            | %                  |
| Costume                | NONE (visual only) |

### Combat Power

A single number summarizing character strength.
Formula: weighted sum of ATK, HP, DEF, CRIT, and equipped companion stats.
**Only companion "equip effects" count toward combat power.**

Data: `stats.json`, `balance.json`

---

## 4. Combat & Damage Formula

### Damage Calculation

```
base_damage = ATK × skill_multiplier × (0.95 + random × 0.10)

defense_reduction = target_DEF × (1 - armor_penetration_rate)
after_defense = max(1, base_damage - defense_reduction)

// Crit check
if (random < CRIT_RATE):
  after_crit = after_defense × CRIT_DMG_MULTIPLIER
else:
  after_crit = after_defense

// Damage multipliers (all multiplicative with each other)
final = after_crit
  × (1 + damage_percent / 100)
  × (1 + boss_damage_percent / 100)        // only vs bosses
  × (1 + normal_monster_damage_percent / 100)  // only vs normal
  × (1 + skill_damage_percent / 100)        // only when using skill
  × (1 + final_damage_percent / 100)
  × max_damage_multiplier                   // clamp

// Apply min/max damage range
final = clamp(final, min_damage_ratio × final, max_damage_ratio × final)
```

### Hit/Miss System

-   If attacker's ACCURACY < target's EVASION → MISS
-   Excess ACCURACY beyond EVASION grants bonus damage (1% per N accuracy)

### Attack Speed

-   Affects auto-attack interval: `interval = base_interval / (1 + atk_speed_pct / 100)`
-   Normal attack is ~80%+ of total DPS; skills are burst cooldown abilities

Data: `balance.json`

---

## 5. Equipment System (Armor)

### Slots (10 total — matches MapleStory Idle exactly):

Hat, Top, Bottom, Gloves, Shoes, Cape, Shoulder, Belt, Necklace, Ring
Each slot has a UNIQUE primary special option that only that slot can roll:

-   Hat: Skill cooldown reduction
-   Top: Basic attack target count increase (critical for farming)
-   Bottom: Final damage %
-   Gloves: Critical damage % (highest priority for starforce/cube)
-   Shoes: Movement speed / MP recovery
-   Cape: Final damage %
-   Shoulder: Armor penetration
-   Belt: Buff duration increase
-   Necklace: Boss damage %
-   Ring: Obtained from Party Quest only (separate acquisition path)

### Grades: Normal → Rare → Epic → Unique → Legendary

### Equipment Acquisition — Elite Monster Summoning

-   Spend **Monster Points** to summon an Elite Monster
-   Kill it → equipment drops
-   **Elite Summon Level** (raised with Armor Stones) determines drop grade probability
-   Unwanted equipment → Disassemble → Armor Stones
-   "Auto Summon" button: auto-repeat summon + kill loop
-   Equipment level = player's current level at time of acquisition

### Equipment Stats

-   Primary stat (fixed per slot type)
-   Sub-options: up to 3 (Epic grade and above), random from pool

Data: `equipment.json`, `elite_monsters.json`

---

## 6. Weapon System (SEPARATE from equipment!)

-   Weapons have their own upgrade path using **weapon materials** from Weapon Dungeon
-   Weapon grade progression (independent of equipment grades)
-   Weapon enhancement increases base ATK
-   Different weapon types per job class

Data: `weapons.json`

---

## 7. Slot Enhancement (3 sub-systems)

**CRITICAL**: Enhancements are on the SLOT, not the item.
Swapping equipment keeps all enhancement progress.

### 7a. Scroll Enhancement

-   Consume scrolls to add flat stat bonuses
-   Success / fail probability (fail = scroll consumed, no stat change)
-   Scroll types: 70% success (low bonus), 30% success (high bonus), 100% success (tiny bonus)
-   Max scroll slots per equipment slot

### 7b. Starforce

-   Spend **Starforce Scrolls** (from Arena weekly rewards + Arena shop + events) to add ★
-   ★0 → ★25 max
-   Success/maintain/fail/destroy probabilities per star level
-   ★10+ can fail and drop stars
-   ★12 unlocks **Additional Cube** slot for that equipment slot
-   Each ★ adds small all-stat bonus
-   Starforce Scrolls are scarce — key bottleneck resource
-   Recommended progression: all ★3 → all ★5 → gloves ★12 → bottom ★10 → ...

### 7c. Potential Options

-   Epic+ grade equipment has potential option slots (up to 3 lines)
-   **Normal Cube**: reroll potential options from normal pool
-   **Additional Cube**: ONLY available on slots with ★12+ starforce
    Rerolls from a separate additional pool
-   **Miracle Cube**: premium version with higher grade-up chance
-   Potential grades: Rare → Epic → Unique → Legendary → Mythic
-   Each slot has unique special options (see slot table in Section 5)
-   Options: main stat %, ATK %, boss damage %, crit rate %, etc.

### 7d. Scroll Saving System

-   Failed scroll does NOT destroy progress
-   "Save" function allows re-attempting from last success point
-   Level 85+ equipment has significantly better scroll efficiency

Data: `scrolls.json`, `starforce.json`, `potentials.json`

---

## 8. Warrior's Power & Ability

### Warrior's Power

-   Spend **Warrior Tokens** (from Warrior Training dungeon) to raise stats
-   Structured as tiers — fill all stats in a tier to unlock next tier
-   Higher tiers grant more stats + unlock more Ability slots
-   Priority: Accuracy > Damage > Main Stat > ATK > HP > DEF

### Ability System (sub-system within Warrior's Power)

-   **Honor Medals** (currency) consumed to reroll ability options
-   Up to 4 option slots
-   Each option has grade: Rare → Epic → Unique → Legendary → Mythic
-   **Lock** desired options with a padlock (increases reroll cost)
-   **Preset** system: multiple saved configurations
-   **Ability Transformation Level**: increases with total rerolls, improves high-grade odds
-   Option pool: armor penetration, damage%, main stat, ATK, crit damage%, ATK speed, exp gain, etc.

Data: `abilities.json`

---

## 9. Companion System

### Companions

-   NPC allies that fight alongside the player
-   Max 4 equipped at once
-   Each companion has a job class + unique passive
-   **Equip Effect**: active when companion is in party (counts toward combat power)
-   **Own Effect**: always active just by owning the companion (does NOT count toward combat power)

### Gacha

-   Spend **Gems** (premium currency)
-   1-pull or 10-pull (10-pull guarantees SR+)
-   Rates: R 80%, SR 17%, SSR 3% — defined in `companions.json`
-   Duplicate → ★ rank up (★1~★5, each ★ = +20% stats)

### Synergy

-   Specific companion combinations grant bonus buffs
-   Example: 2 Warriors = DEF +10%, Mage+Archer = Skill DMG +5%

Data: `companions.json`, `synergies.json`

---

## 10. Relic System

### Relics

-   Passive items with TWO effect types:
    1. **Active Effect**: only works in specific content (e.g., "Chapter Hunt: final damage +5%")
    2. **Passive Effect**: always active just by owning (e.g., "Boss damage +2%")
-   Max 3 relics equipped
-   Grades: Rare → Epic → Unique → Legendary
-   Acquisition: Boss Raid rewards, events

Data: `relics.json`

---

## 11. Skill & Mastery

### Skill Structure

-   **Normal Attack**: auto, no cooldown, ~80%+ of total DPS
-   **Active Skills (1~3)**: cooldown-based, AoE or burst
-   **Ultimate**: unlocked at 4th job advancement, 40~60s cooldown, massive damage
-   All skills are AoE (range attacks) — no single-target-only skills

### Skill Enhancement

-   Spend skill materials to level up skills
-   Higher level = more damage multiplier

### Mastery Tree

-   Branching tree that unlocks additional effects for each skill
-   Nodes: increased AoE, reduced cooldown, extra hits, debuff application
-   Mastery points earned from leveling + specific dungeons

Data: `skills.json`, `mastery_tree.json`

---

## 12. Chapter Hunting & Chapter Challenge

### Chapter Hunting (main auto-battle field)

-   Select a chapter → enter its platformer map → auto-hunt monsters
-   Monsters respawn continuously
-   Drops: EXP, Gold, Monster Points
-   Higher chapters = stronger monsters = more rewards
-   Map terrain matters — some maps have inefficient layouts

### Chapter Challenge (boss gate)

-   Separate mode: fight a chapter boss within time limit
-   Must clear to unlock next chapter
-   Fail → return to previous chapter's hunting field
-   Boss has attack patterns (telegraphed AoE)

Data: `chapters.json`, `chapter_bosses.json`

---

## 13. 5 Growth Dungeons

Each dungeon has daily entry limits (reset at 00:00) and difficulty tiers (1~10+).

| Dungeon             | Purpose                         | Format                    |
| ------------------- | ------------------------------- | ------------------------- |
| Weapon Dungeon      | Weapon materials                | Wave survival, 60s        |
| EXP Dungeon         | Massive EXP                     | Infinite spawn, 90s       |
| Equipment Dungeon   | Monster Points + gear materials | 1v1 boss                  |
| Warrior's Training  | Warrior Tokens                  | Escalating waves, survive |
| Enhancement Dungeon | Scrolls, cubes                  | Mini-stage with gimmicks  |

Data: `dungeons.json`

---

## 14. World Boss & Boss Raid

### World Boss

-   Simulated server-wide boss (single player → fake leaderboard with AI)
-   Time-limited: deal max damage within the window
-   Boss HP is massive (not meant to be killed solo)
-   Reward based on damage contribution rank
-   World Boss Coins → World Boss Shop

### Boss Raid (includes Zakum Raid)

-   20 difficulty tiers for standard bosses
-   **Zakum Raid**: special raid, requires minimum combat power to enter
    -   Drops unique slot: **Face Accessory** (11th equipment slot)
    -   Drops Zakum Helmet (special hat)
    -   Has death counter (shared across party in multiplayer, solo = personal)
    -   Difficulty tiers: Easy / Normal / Hard
    -   Pattern closely mirrors original MapleStory Chaos Zakum
-   Each boss has unique patterns:
    -   Telegraphed AoE (red zone → 2s → damage)
    -   Minion summon
    -   Self-buff (ATK increase)
-   120s time limit per attempt
-   Boss Coins → Boss Shop (SSR equipment exchange)
-   Weekly entry limit (3 base, expandable with premium currency)

Data: `bosses.json`

---

## 15. Arena (PvP)

### Async PvP

-   NOT real-time — load opponent's saved data, AI vs AI battle
-   Single player → opponents are AI-generated profiles
-   My team (char + 4 companions) vs opponent team
-   60s time limit, auto-battle
-   Same combat power ≠ same result (composition matters)

### Rewards

-   Arena Points per win → Arena Shop
-   Weekly ranking → rank-based rewards

Data: `arena.json`

---

## 16. Guild

-   Join/create a guild
-   Single player → guild members are AI-generated
-   **Guild Skills**: unlocked by guild level, passive buffs for all members
-   **Guild Shop**: buy items with Guild Coins
-   **Guild Buffs**: time-limited boosts
-   **Guild Boss Battle**: all members' damage summed to kill guild boss → Guild Coins

Data: `guild.json`

---

## 17. Party Quest (2 types)

1. **First Companion** (킹슬라임 파티퀘스트):

    - Cooperative quest: kill King Slime
    - Minimum 3 party members (single player → AI party members fill slots)
    - Easy and Normal difficulty
    - Clear time: ~40-60 seconds
    - **Key strategy**: kill small slimes first before attacking King Slime
    - **Unique reward: Party Quest Ring** (exclusive equipment slot item)
    - Ring has unique options not available elsewhere
    - Auto-matching system for party formation

2. **Dimensional Rift**: cooperative boss fight with AI party members
    - Harder difficulty, different reward pool

Both have daily limits and unique reward pools.

Data: `party_quests.json`

---

## 18. Costume System

-   Visual-only items (NO stat bonuses)
-   Slots: Hat, Top, Bottom, Shoes, Weapon Skin
-   Acquisition: events, special shop, costume gacha
-   Applied as sprite overlay on character render layer

Data: `costumes.json`

---

## 19. Daily Quest / Achievement / Attendance

### Daily Quests

-   5~8 tasks per day (kill N monsters, enter dungeon N times, enhance once, etc.)
-   Each completed task grants rewards + activity points
-   Activity point milestones → bonus reward chests
-   Reset at 00:00

### Achievements

-   Lifetime cumulative goals (total kills, total enhancements, total gacha pulls, etc.)
-   Each achievement grants one-time reward
-   Achievement tiers (bronze → silver → gold → diamond)

### Attendance (Login Bonus)

-   Daily login reward (escalating over 28-day cycle)
-   Consecutive login bonus
-   Reset monthly

Data: `daily_quests.json`, `achievements.json`, `attendance.json`

---

## 20. Offline Rewards & Quick Hunt

### Offline Rewards

-   App fully closed → after 5 minutes, offline mode activates
-   Earnings: (elapsed minutes × kills_per_minute × efficiency_rate)
-   kills_per_minute based on current chapter monster stats vs player stats
-   Efficiency: 60% of online rate (online must always be better)
-   Max accumulation: 24 hours
-   On login → popup showing rewards → [Claim] button

### Quick Hunt (빠른사냥)

-   Spend Gems to instantly receive N hours of hunting rewards
-   Daily limit: 3 times

Data: `offline.json`

---

## 21. Currency System

| Currency                     | Source                                      | Use                                 |
| ---------------------------- | ------------------------------------------- | ----------------------------------- |
| Gold (메소)                  | Hunting, dungeons                           | Enhancement, starforce, shops       |
| Gems (보석)                  | Achievements, attendance, (IAP placeholder) | Gacha, quick hunt                   |
| Red Diamonds (레드다이아)    | Premium currency                            | Extra dungeon entries, premium shop |
| Monster Points               | Chapter hunting, equipment dungeon          | Elite monster summon                |
| Armor Stones                 | Equipment disassembly                       | Raise elite summon level            |
| Weapon Materials             | Weapon dungeon                              | Weapon upgrade                      |
| Warrior Tokens (용사의 증표) | Warrior's training dungeon                  | Warrior's Power                     |
| Honor Medals (명예의 훈장)   | Daily quests, boss rewards                  | Ability reroll                      |
| Dungeon Coins (per type)     | Growth dungeons                             | Dungeon shop                        |
| Boss Coins                   | Boss raid                                   | Boss shop                           |
| World Boss Coins             | World boss                                  | World boss shop                     |
| Arena Points                 | Arena wins                                  | Arena shop                          |
| Guild Coins                  | Guild boss, guild quests                    | Guild shop                          |
| Scrolls (70%/30%/15%)        | Enhancement dungeon, shops                  | Scroll enhancement                  |
| Starforce Scrolls            | Arena weekly, arena shop, events            | Starforce enhancement               |
| Normal Cubes                 | Enhancement dungeon, shops                  | Potential reroll                    |
| Additional Cubes             | Weekly shop (limited), ★12+ unlock          | Additional potential reroll         |
| Miracle Cubes                | Events, premium                             | Premium potential reroll            |
| Mastery Points               | Level-up, dungeons                          | Mastery tree nodes                  |

Note: Red Diamonds serve as the "premium" convenience currency.
Extra dungeon entries cost 2,000 / 3,000 / 5,000 Red Diamonds each.

Data: `currencies.json`, `shops.json`

---

## 22. Save/Load & Deployment

### Save System

-   IndexedDB with idb wrapper
-   Auto-save every 30 seconds + on every important action
-   Save data: full ECS world state (serialized TypedArray) + meta (timestamps, settings)
-   Manual export: download JSON backup file
-   Manual import: upload JSON to restore

### Deployment

-   `npm run build` → static files in `dist/`
-   Deploy to Vercel or Netlify (zero-config)
-   No server required — fully client-side

### Mobile Support

-   Responsive canvas scaling
-   Touch controls: virtual joystick (left), action buttons (right)
-   UI scales to viewport

---

---

## 23. Visual Design & Asset Pipeline

### Design Philosophy

This game MUST look good from day one. No colored rectangles.
Every entity rendered on screen uses real pixel art sprites from the start.
Visual quality is a TOP PRIORITY, not a polish step.

### Art Style: 16-bit Fantasy Pixel Art

-   Consistent pixel scale: **32x32 base** for characters/monsters, **16x16 tiles**
    (tiles render at 2x so they match 32px characters)
-   Color palette: warm, saturated fantasy tones (NOT grimdark)
-   Parallax scrolling backgrounds per chapter (3+ layers: sky, far, mid, near)
-   Smooth sprite animations: minimum 4 frames per action (idle, run, jump, attack, death)

### Primary Asset Source: ansimuz (itch.io)

Use **Ansimuz Legacy Collection** as the foundation.

-   URL: https://ansimuz.itch.io/gothicvania-patreon-collection
-   Free 16-bit pixel art: characters, enemies, tilesets, backgrounds, VFX
-   Covers multiple biomes (forest, cave, cemetery, castle, town)
-   All assets share consistent art style = visual coherence
-   License: free for personal/commercial use, credit required

### Supplementary Assets

| Category                                  | Asset Pack                                       | Source                 |
| ----------------------------------------- | ------------------------------------------------ | ---------------------- |
| Hero characters (job variants)            | GandalfHardcore Sidescroller Pack 32x32          | itch.io (free)         |
| Additional monsters                       | Monsters Creatures Fantasy (Pixel Frog)          | itch.io (free)         |
| Skill/spell effects                       | Super Pixel Effects Gigapack (unTied Games)      | itch.io (free)         |
| UI frame/panel                            | Complete UI Essential Pack (Crusenho)            | itch.io (free)         |
| RPG icons (equipment, skills, currencies) | 420 Pixel Art Icons for RPGs                     | opengameart.org (free) |
| Damage number font                        | Pixel bitmap font (e.g., m5x7 or Press Start 2P) | Google Fonts (free)    |
| Parallax backgrounds                      | ansimuz Parallax Backgrounds                     | itch.io (free)         |

### Tilemap Workflow

1. Download tilesets → import into **Tiled Map Editor** (free)
2. Design each chapter map in Tiled: platforms, ladders, spawn points, decorations
3. Export as Tiled JSON → place in `assets/tilemaps/chapter_XX.json`
4. TilemapRenderer.js loads Tiled JSON directly at runtime
5. **Parallax layers**: defined as separate Tiled layers, rendered with depth-based scroll speed

### Spritesheet Workflow

1. Individual frame PNGs → pack with **free-tex-packer** (npm package, runs in CLI)
   OR use Shoebox (free) / TexturePacker (free version)
2. Output: `atlas.json` + `atlas.png` in TexturePacker JSON Hash format
3. PixiJS loads atlas directly: `PIXI.Assets.load('atlas.json')`
4. SpriteFactory.js creates AnimatedSprites from atlas frame names

### Visual Effects (CRITICAL for game feel)

These are NOT optional polish — they must exist from Phase 1:

1. **Damage numbers**: float up with easing, color-coded (white=normal, yellow=crit, red=player hit)

    - Use BitmapText + object pool for zero GC
    - Scale pop on crit (1.0 → 1.5 → 1.0 ease)

2. **Hit flash**: sprite turns white for 2 frames on taking damage

3. **Death animation**: enemy plays death anim → fades out → loot particles burst

4. **Loot particles**: small colored circles (gold=yellow, exp=blue) fly toward HUD counters

5. **Skill effects**: animated sprite overlays (slash, explosion, ice, fire, lightning)

    - Sourced from Super Pixel Effects pack
    - Played at skill impact point, auto-removed after animation completes

6. **Screen shake**: 2-4px random offset for 100ms on boss hits / crits

7. **Parallax scrolling**: 3+ background layers scroll at different speeds as camera moves

8. **Smooth camera**: camera lerps toward player position (never snaps)

9. **Monster spawn**: fade-in or "poof" particle when monster respawns

10. **Level-up effect**: golden particle burst + "LEVEL UP!" text popup

### UI Design Rules

-   UI sits on top of PixiJS canvas as Preact HTML overlay
-   Dark semi-transparent panels with pixel-art styled borders (from UI asset pack)
-   Consistent color scheme for grades:
    Normal=#AAAAAA, Rare=#5B9BD5, Epic=#9B59B6, Unique=#F39C12, Legendary=#27AE60
-   Tab bar at bottom: icon + label, active tab highlighted
-   Modals: centered, dimmed background overlay, slide-in animation
-   Tooltips on long-press/hover with stat comparison
-   All text uses pixel bitmap font (not system font) for visual consistency
-   Gacha pull animation: card flip with glow border matching grade color
-   Enhancement animation: sparks + success/fail flash

### Audio (basic but important)

-   BGM: 1 looping track per chapter biome (8-bit/chiptune style)
    Source: freesound.org, opengameart.org, or CC0 chiptune packs
-   SFX (minimum set):
    -   attack_hit.wav, attack_miss.wav
    -   skill_fire.wav, skill_ice.wav, skill_slash.wav
    -   monster_death.wav
    -   loot_pickup.wav
    -   level_up.wav
    -   ui_click.wav, ui_open.wav, ui_close.wav
    -   enhance_success.wav, enhance_fail.wav
    -   gacha_pull.wav, gacha_reveal_ssr.wav
-   Volume controls in settings UI
-   PixiJS sound or Howler.js for audio playback

---

## Implementation Priority (Phases for Claude Code)

### Phase 0 — Asset Preparation (BEFORE any code!)

-   Download all asset packs listed above
-   Organize into assets/ folder structure
-   Pack spritesheets with free-tex-packer
-   Create first chapter tilemap in Tiled
-   Verify all sprite frame naming conventions
-   Prepare bitmap font atlas

### Phase 1 — Foundation (MUST look good from frame 1)

1. Project setup (bitECS + PixiJS + Preact + Vite)
2. Tilemap renderer + parallax backgrounds + smooth camera
3. Character sprite + animations (idle/run/jump/attack) + gravity + platform collision
4. Monster sprites + spawn + death animation + auto-battle + damage numbers
5. HUD with pixel art panels (HP bar, level, stage name, loot fly-to-counter)
6. Hit flash, screen shake, loot particles — all visual juice from day 1

### Phase 2 — Core Growth Loop

6. Job selection + advancement
7. Stat allocation + Maple grade
8. Full damage formula + hit/miss
9. Equipment + elite monster summoning
10. Weapon system
11. Scroll + starforce + potential (normal + additional)

### Phase 3 — Deep Systems

12. Warrior's Power + Ability
13. Skill system + mastery tree
14. Companion + gacha + synergy
15. Relic system

### Phase 4 — Content

16. Chapter hunting + chapter challenge (boss gate)
17. 5 growth dungeons
18. World boss + boss raid
19. Arena PvP
20. Guild system
21. Party quests

### Phase 5 — Retention & Polish

22. Daily quests + achievements + attendance
23. Costume system
24. Offline rewards + quick hunt
25. Currency & shop consolidation
26. Asset integration (sprites, tilemaps, SFX)
27. Mobile touch controls
28. Balance tuning (use tools/balance-sim.js)
29. Final testing + deployment
