import Phaser from "phaser"
import Matter from "matter-js"
import { Howler } from "howler"
import { getSkillDamageMultiplier } from "../data/skills"
import { useGameStore } from "../state/gameStore"
import { getStageMeta } from "../data/stages"
import { buildTerrainLayout } from "../data/terrain"
import { SPRITE_MANIFEST } from "./assets/manifest"

const WORLD_WIDTH = 2200
const WORLD_HEIGHT = 1400
const PLAYER_SPEED = 260
const DASH_DISTANCE = 150
const SYNC_INTERVAL_MS = 160
const SAFE_MARGIN = 18

const ENEMY_PROFILE = {
  slime: { sheet: "enemy-slime-sheet", idle: "enemy-slime-idle", move: "enemy-slime-move", hpMul: 1, atkMul: 1, speed: [86, 116], color: 0xfb7185 },
  golem: { sheet: "enemy-golem-sheet", idle: "enemy-golem-idle", move: "enemy-golem-move", hpMul: 2.1, atkMul: 1.45, speed: [60, 80], color: 0xa3a3a3 },
  bat: { sheet: "enemy-bat-sheet", idle: "enemy-bat-idle", move: "enemy-bat-move", hpMul: 0.72, atkMul: 0.9, speed: [130, 170], color: 0xa78bfa },
  boss: { sheet: "enemy-boss-sheet", idle: "enemy-boss-idle", move: "enemy-boss-move", hpMul: 9.5, atkMul: 2.4, speed: [70, 90], color: 0xdc2626 },
}

const CLASS_PROFILE = {
  warrior: { color: 0x93c5fd, skillQ: "방패 격돌", skillE: "돌진 베기", skillR: "수호의 외침", basicMul: 1.15 },
  mage: { color: 0x22d3ee, skillQ: "서리 폭발", skillE: "마력 탄막", skillR: "운석 낙하", basicMul: 1.0 },
  archer: { color: 0x4ade80, skillQ: "삼연사", skillE: "관통 사격", skillR: "화살 폭우", basicMul: 1.05 },
  thief: { color: 0xfb923c, skillQ: "그림자 난무", skillE: "비도", skillR: "암영 폭발", basicMul: 1.08 },
}

const TUTORIAL_TEXT = [
  "튜토리얼 1/4: 이동해 보세요 (WASD/방향키 또는 조이스틱)",
  "튜토리얼 2/4: 기본공격 J 또는 공격 버튼을 눌러보세요",
  "튜토리얼 3/4: 스킬 Q/E/R 중 하나를 사용해 보세요",
  "튜토리얼 4/4: 몬스터를 처치해 스테이지를 올려보세요",
  "튜토리얼 완료: 성장과 강화를 반복해 전투력을 올리세요",
]

const CHAPTER_THEMES = [
  { floorA: 0x17324d, floorB: 0x214467, grass: 0x84cc16, haze: 0x60a5fa, ambient: 0xe0f2fe },
  { floorA: 0x123a43, floorB: 0x19515e, grass: 0x2dd4bf, haze: 0x22d3ee, ambient: 0xccfbf1 },
  { floorA: 0x263759, floorB: 0x334775, grass: 0x38bdf8, haze: 0xa78bfa, ambient: 0xe9d5ff },
  { floorA: 0x3d2b56, floorB: 0x51376f, grass: 0xf472b6, haze: 0xfb7185, ambient: 0xfce7f3 },
  { floorA: 0x4a3326, floorB: 0x654431, grass: 0xf59e0b, haze: 0xfb923c, ambient: 0xffedd5 },
  { floorA: 0x183526, floorB: 0x24563b, grass: 0x4ade80, haze: 0x86efac, ambient: 0xdcfce7 },
  { floorA: 0x1f2b48, floorB: 0x283966, grass: 0x60a5fa, haze: 0x93c5fd, ambient: 0xdbeafe },
  { floorA: 0x2f2f3f, floorB: 0x46465e, grass: 0xc4b5fd, haze: 0xe879f9, ambient: 0xf5d0fe },
  { floorA: 0x2f2219, floorB: 0x513621, grass: 0xf97316, haze: 0xfb7185, ambient: 0xffedd5 },
  { floorA: 0x320f17, floorB: 0x52141f, grass: 0xdc2626, haze: 0xfca5a5, ambient: 0xfee2e2 },
]

const CHAPTER_BGM = [
  [196, 246.94, 293.66, 392],
  [220, 261.63, 329.63, 440],
  [174.61, 233.08, 277.18, 369.99],
  [207.65, 246.94, 311.13, 415.3],
  [164.81, 220, 293.66, 329.63],
  [196, 261.63, 311.13, 392],
  [185, 246.94, 277.18, 369.99],
  [155.56, 207.65, 261.63, 311.13],
  [146.83, 196, 246.94, 329.63],
  [130.81, 174.61, 220, 293.66],
]

const BOSS_BGM = [110, 146.83, 174.61, 196, 174.61, 146.83]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2)
}

function chooseEnemyType(stage) {
  const meta = getStageMeta(stage)
  if (meta.isBossStage) return "boss"
  const r = Math.random()
  if (r < 0.2 + Math.min(0.2, stage * 0.01)) return "golem"
  if (r < 0.45) return "bat"
  return "slime"
}

function heroSheetKey(classId) {
  return `hero-sheet-${classId}`
}

function heroOverlayKey(classId) {
  return `hero-body-${classId}`
}

function heroHelmetKey(classId) {
  return `hero-helmet-${classId}`
}

function heroWeaponKey(classId) {
  return `hero-weapon-${classId}`
}

function heroWeaponVariantKey(classId, tier) {
  return `${heroWeaponKey(classId)}-${tier}`
}

function heroBodyVariantKey(classId, tier) {
  return `${heroOverlayKey(classId)}-${tier}`
}

function heroHelmetVariantKey(classId, tier) {
  return `${heroHelmetKey(classId)}-${tier}`
}

function resolveWeaponAppearance(weapon = {}) {
  const rarity = weapon.rarity ?? "common"
  const rarityTint = {
    common: 0xe5e7eb,
    uncommon: 0x86efac,
    rare: 0x93c5fd,
    epic: 0xc4b5fd,
    legendary: 0xfde68a,
  }

  return {
    rarity,
    tint: rarityTint[rarity] ?? 0xe5e7eb,
    scale: 1.08 + Math.min(weapon.level ?? 0, 10) * 0.03,
    alpha: rarity === "legendary" ? 1 : 0.94,
    textureTier: rarity === "legendary" ? "legendary" : rarity === "epic" || rarity === "rare" ? "rare" : "common",
  }
}

function resolveEquipmentTier(item = {}) {
  const rarity = item.rarity ?? "common"
  if (rarity === "legendary") return "legendary"
  if (rarity === "epic" || rarity === "rare") return "rare"
  return "common"
}

function getPerformanceProfile(scale) {
  const width = scale?.width ?? 1280
  const height = scale?.height ?? 720
  const isCompact = width < 900 || height < 640
  return {
    ambientDots: isCompact ? 18 : 30,
    arenaDeco: isCompact ? 34 : 54,
    maxEnemies: isCompact ? 9 : 12,
    zoom: width < 720 ? 0.94 : width < 1180 ? 1.02 : 1.12,
  }
}

export class HeroForgeScene extends Phaser.Scene {
  constructor() {
    super("HeroForgeScene")
    this.unsubscribe = null
    this.lastSyncAt = 0
    this.animClock = 0
    this.touchState = {
      joystickPointerId: null,
      joystickVec: new Phaser.Math.Vector2(0, 0),
      joystick: null,
      actions: { basic: false, q: false, e: false, r: false, dash: false },
    }
    this.hitStopActive = false
    this.pendingBossWarning = false
    this.playerDead = false
    this.playerAction = null
    this.actionLockUntil = 0
    this.lastHeroLevel = 1
    this.currentChapter = 1
    this.terrainTick = 0
    this.terrainEffects = { playerSlow: 1, playerAtkMul: 1 }
    this.performanceProfile = getPerformanceProfile({ width: 1280, height: 720 })
  }

  preload() {
    this.load.spritesheet("lpc-idle", "/assets/reference/lpc/body_idle_light.png", { frameWidth: 64, frameHeight: 64 })
    this.load.spritesheet("lpc-walk", "/assets/reference/lpc/body_walk_light.png", { frameWidth: 64, frameHeight: 64 })
    this.load.spritesheet("lpc-slash", "/assets/reference/lpc/body_slash_light.png", { frameWidth: 64, frameHeight: 64 })
    this.load.spritesheet("lpc-hurt", "/assets/reference/lpc/body_hurt_light.png", { frameWidth: 64, frameHeight: 64 })

    for (const [classId, config] of Object.entries(SPRITE_MANIFEST.heroes)) {
      this.load.spritesheet(heroSheetKey(classId), config.sheet, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      })
      this.load.spritesheet(heroBodyVariantKey(classId, "common"), config.bodyVariants.common, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      })
      this.load.spritesheet(heroBodyVariantKey(classId, "rare"), config.bodyVariants.rare, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      })
      this.load.spritesheet(heroBodyVariantKey(classId, "legendary"), config.bodyVariants.legendary, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      })
      this.load.spritesheet(heroHelmetVariantKey(classId, "common"), config.helmetVariants.common, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      })
      this.load.spritesheet(heroHelmetVariantKey(classId, "rare"), config.helmetVariants.rare, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      })
      this.load.spritesheet(heroHelmetVariantKey(classId, "legendary"), config.helmetVariants.legendary, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      })
      this.load.image(heroWeaponVariantKey(classId, "common"), config.weaponVariants.common)
      this.load.image(heroWeaponVariantKey(classId, "rare"), config.weaponVariants.rare)
      this.load.image(heroWeaponVariantKey(classId, "legendary"), config.weaponVariants.legendary)
    }

    this.load.spritesheet("enemy-slime-sheet", SPRITE_MANIFEST.enemies.slime.sheet, {
      frameWidth: SPRITE_MANIFEST.enemies.slime.frameWidth,
      frameHeight: SPRITE_MANIFEST.enemies.slime.frameHeight,
    })
    this.load.spritesheet("enemy-golem-sheet", SPRITE_MANIFEST.enemies.golem.sheet, {
      frameWidth: SPRITE_MANIFEST.enemies.golem.frameWidth,
      frameHeight: SPRITE_MANIFEST.enemies.golem.frameHeight,
    })
    this.load.spritesheet("enemy-bat-sheet", SPRITE_MANIFEST.enemies.bat.sheet, {
      frameWidth: SPRITE_MANIFEST.enemies.bat.frameWidth,
      frameHeight: SPRITE_MANIFEST.enemies.bat.frameHeight,
    })
    this.load.spritesheet("enemy-boss-sheet", SPRITE_MANIFEST.enemies.boss.sheet, {
      frameWidth: SPRITE_MANIFEST.enemies.boss.frameWidth,
      frameHeight: SPRITE_MANIFEST.enemies.boss.frameHeight,
    })

    this.load.image("fx-projectile", SPRITE_MANIFEST.fx.projectile.sheet)
    this.load.spritesheet("fx-slashing", SPRITE_MANIFEST.fx.slashing.sheet, {
      frameWidth: SPRITE_MANIFEST.fx.slashing.frameWidth,
      frameHeight: SPRITE_MANIFEST.fx.slashing.frameHeight,
    })
    this.load.spritesheet("fx-healing", SPRITE_MANIFEST.fx.healing.sheet, {
      frameWidth: SPRITE_MANIFEST.fx.healing.frameWidth,
      frameHeight: SPRITE_MANIFEST.fx.healing.frameHeight,
    })
    this.load.spritesheet("fx-strike", SPRITE_MANIFEST.fx.strike.sheet, {
      frameWidth: SPRITE_MANIFEST.fx.strike.frameWidth,
      frameHeight: SPRITE_MANIFEST.fx.strike.frameHeight,
    })
    this.load.spritesheet("fx-rings", SPRITE_MANIFEST.fx.rings.sheet, {
      frameWidth: SPRITE_MANIFEST.fx.rings.frameWidth,
      frameHeight: SPRITE_MANIFEST.fx.rings.frameHeight,
    })
  }

  create() {
    this.store = useGameStore
    const initial = this.store.getState()

    this.classId = initial.hero.classId
    this.classProfile = CLASS_PROFILE[this.classId] || CLASS_PROFILE.warrior
    this.useLpcSprite = false
    this.currentChapter = initial.chapter ?? getStageMeta(initial.stage).chapter
    this.lastHeroLevel = initial.hero.level
    this.performanceProfile = getPerformanceProfile(this.scale)

    this.heroStats = {
      maxHp: initial.hero.maxHp,
      atk: initial.hero.atk,
      def: initial.hero.def,
      critRate: initial.hero.critRate,
      critDmg: initial.hero.critDmg,
      name: initial.hero.className,
      skillLevels: initial.hero.skillLevels ?? { q: 1, e: 1, r: 1 },
      weapon: initial.hero.weapon,
      armor: initial.hero.armor,
      helmet: initial.hero.helmet,
    }
    this.enemyStats = {
      maxHp: initial.enemy.maxHp,
      atk: initial.enemy.atk,
      def: initial.enemy.def,
    }
    this.heroHp = initial.hero.hp
    this.skillMax = { basic: 0.34, q: 4, e: 5.5, r: 8, dash: 1.8 }
    this.skillCooldowns = { ...this.skillMax, basic: 0, q: 0, e: 0, r: 0, dash: 0 }
    this.stageClearKills = 0
    this.facing = new Phaser.Math.Vector2(1, 0)

    this.tutorialStep = 0
    this.hasMoved = false
    this.hasBasicAttacked = false
    this.hasUsedSkill = false

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setBackgroundColor("#0f172a")
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.setZoom(this.performanceProfile.zoom)

    this.drawArena(this.getChapterTheme(this.currentChapter))
    this.createParallaxBackdrop()
    if (this.useLpcSprite) {
      this.createLpcAnimations()
    } else {
      this.createPlayerAnimations()
    }
    this.createEnemyAnimations()
    this.createFxAnimations()

    this.player = this.physics.add.sprite(420, 300, this.useLpcSprite ? "lpc-idle" : heroSheetKey(this.classId), 0)
    this.player.setCollideWorldBounds(true)
    this.player.setDrag(700, 700)
    this.player.setDepth(20)
    this.applyClassTint()
    if (!this.useLpcSprite) this.player.setScale(1.9)
    if (!this.useLpcSprite) this.createPlayerEquipmentLayers()

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)

    this.enemies = this.physics.add.group()
    this.projectiles = this.physics.add.group()
    this.createTerrainFeatures()
    this.bindTerrainCollisions()

    for (let i = 0; i < this.performanceProfile.maxEnemies; i += 1) this.spawnEnemy()

    this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
      this.hitEnemy(enemy, projectile.getData("damage") || 1)
      projectile.destroy()
    })

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    })
    this.cursors = this.input.keyboard.createCursorKeys()

    this.fxLayer = this.add.layer().setDepth(50)
    this.overlay = this.add.text(16, 16, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#e2e8f0",
      backgroundColor: "rgba(2,6,23,0.55)",
      padding: { x: 8, y: 6 },
    })
    this.overlay.setScrollFactor(0).setDepth(100)

    this.playerHpBarBg = this.add.rectangle(170, 116, 210, 12, 0x0f172a, 0.95).setScrollFactor(0).setDepth(101)
    this.playerHpBar = this.add.rectangle(65, 116, 200, 8, 0x22c55e, 1).setOrigin(0, 0.5).setScrollFactor(0).setDepth(102)

    this.objectiveText = this.add.text(16, 138, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#fde68a",
      backgroundColor: "rgba(15,23,42,0.6)",
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(103)

    this.createCooldownHud()
    this.setupTouchControls()
    this.setupAudioEngine()
    this.setupMatterEngine()
    this.scale.on("resize", this.handleResize, this)
    this.handleResize(this.scale.gameSize)

    this.unsubscribe = this.store.subscribe((state) => {
      this.heroStats = {
        maxHp: state.hero.maxHp,
        atk: state.hero.atk,
        def: state.hero.def,
        critRate: state.hero.critRate,
        critDmg: state.hero.critDmg,
        name: state.hero.className,
        skillLevels: state.hero.skillLevels ?? { q: 1, e: 1, r: 1 },
        weapon: state.hero.weapon,
        armor: state.hero.armor,
        helmet: state.hero.helmet,
      }
      this.enemyStats = {
        maxHp: state.enemy.maxHp,
        atk: state.enemy.atk,
        def: state.enemy.def,
      }

      if (this.classId !== state.hero.classId) {
        this.classId = state.hero.classId
        this.classProfile = CLASS_PROFILE[this.classId] || CLASS_PROFILE.warrior
        if (!this.useLpcSprite) {
          this.player.setTexture(heroSheetKey(this.classId), 0)
          this.playerBodyOverlay?.setTexture(heroBodyVariantKey(this.classId, "common"), 0)
          this.playerHelmet?.setTexture(heroHelmetVariantKey(this.classId, "common"), 0)
          this.playerWeapon?.setTexture(heroWeaponVariantKey(this.classId, "common"))
        }
        this.applyClassTint()
      }

      const nextChapter = state.chapter ?? getStageMeta(state.stage).chapter
      if (nextChapter !== this.currentChapter) {
        this.currentChapter = nextChapter
        this.refreshChapterTheme()
        this.showChapterBanner(nextChapter)
      }

      if (state.hero.level > this.lastHeroLevel) {
        this.lastHeroLevel = state.hero.level
        this.emitLevelBurst(this.player.x, this.player.y)
      }

      this.heroHp = clamp(this.heroHp, 1, this.heroStats.maxHp)
    })
  }

  getChapterTheme(chapter) {
    return CHAPTER_THEMES[Math.max(0, Math.min(CHAPTER_THEMES.length - 1, chapter - 1))]
  }

  refreshChapterTheme() {
    this.arenaLayer?.destroy()
    this.parallaxLayer?.destroy()
    this.clearTerrainFeatures()
    this.drawArena(this.getChapterTheme(this.currentChapter))
    this.createParallaxBackdrop()
    this.createTerrainFeatures()
    this.bindTerrainCollisions()
  }

  createParallaxBackdrop() {
    const theme = this.getChapterTheme(this.currentChapter)
    this.parallaxLayer = this.add.layer().setDepth(1)
    this.parallaxDots = []

    const glowA = this.add.ellipse(280, 220, 420, 240, theme.haze, 0.16).setScrollFactor(0.12, 0.08)
    const glowB = this.add.ellipse(WORLD_WIDTH - 320, 280, 360, 220, theme.ambient, 0.1).setScrollFactor(0.18, 0.1)
    this.parallaxLayer.add([glowA, glowB])

    for (let i = 0; i < this.performanceProfile.ambientDots; i += 1) {
      const dot = this.add.circle(
        Phaser.Math.Between(0, WORLD_WIDTH),
        Phaser.Math.Between(0, WORLD_HEIGHT),
        Phaser.Math.Between(2, 7),
        theme.ambient,
        Phaser.Math.FloatBetween(0.08, 0.22)
      )
      dot.setScrollFactor(Phaser.Math.FloatBetween(0.15, 0.45), Phaser.Math.FloatBetween(0.12, 0.35))
      this.parallaxLayer.add(dot)
      this.parallaxDots.push(dot)
    }
  }

  applyClassTint() {
    if (!this.player) return
    if (!this.useLpcSprite) return
    this.player.setTint(this.classProfile.color)
  }

  createLpcAnimations() {
    if (!this.anims.exists("lpc-idle-anim")) {
      this.anims.create({
        key: "lpc-idle-anim",
        frames: [{ key: "lpc-idle", frame: 4 }, { key: "lpc-idle", frame: 5 }],
        frameRate: 3,
        repeat: -1,
      })
    }

    if (!this.anims.exists("lpc-run-anim")) {
      this.anims.create({
        key: "lpc-run-anim",
        frames: Array.from({ length: 9 }, (_, i) => ({ key: "lpc-walk", frame: 18 + i })),
        frameRate: 12,
        repeat: -1,
      })
    }

    if (!this.anims.exists("lpc-attack-anim")) {
      this.anims.create({
        key: "lpc-attack-anim",
        frames: Array.from({ length: 6 }, (_, i) => ({ key: "lpc-slash", frame: 12 + i })),
        frameRate: 12,
        repeat: 0,
      })
    }

    if (!this.anims.exists("lpc-hit-anim")) {
      this.anims.create({
        key: "lpc-hit-anim",
        frames: Array.from({ length: 6 }, (_, i) => ({ key: "lpc-hurt", frame: i })),
        frameRate: 12,
        repeat: 0,
      })
    }

    if (!this.anims.exists("lpc-dead-anim")) {
      this.anims.create({
        key: "lpc-dead-anim",
        frames: [{ key: "lpc-hurt", frame: 4 }, { key: "lpc-hurt", frame: 5 }],
        frameRate: 3,
        repeat: 0,
      })
    }
  }

  createPlayerActionFrames() {
    // Intersect 시트 기반으로 전환되면서 별도 파생 프레임 생성은 사용하지 않는다.
  }

  createDerivedFrame(baseKey, newKey, mode, frame) {
    if (this.textures.exists(newKey)) return

    const canvasTexture = this.textures.createCanvas(newKey, 64, 64)
    const ctx = canvasTexture.context
    const baseImage = this.textures.get(baseKey).getSourceImage()

    ctx.clearRect(0, 0, 64, 64)
    ctx.drawImage(baseImage, 0, 0, 64, 64)

    if (mode === "attack") {
      ctx.strokeStyle = "rgba(250, 204, 21, 0.95)"
      ctx.lineWidth = frame === 1 ? 4 : 5
      ctx.beginPath()
      if (frame === 1) {
        ctx.moveTo(12, 52)
        ctx.lineTo(52, 10)
      } else {
        ctx.moveTo(10, 16)
        ctx.lineTo(56, 40)
      }
      ctx.stroke()
    }

    if (mode === "hit") {
      ctx.fillStyle = frame === 1 ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.3)"
      ctx.fillRect(0, 0, 64, 64)
    }

    if (mode === "dead") {
      ctx.fillStyle = "rgba(0,0,0,0.35)"
      ctx.fillRect(0, 0, 64, 64)
      ctx.strokeStyle = "rgba(2,6,23,0.8)"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(22, 22)
      ctx.lineTo(28, 28)
      ctx.moveTo(28, 22)
      ctx.lineTo(22, 28)
      ctx.moveTo(36, 22)
      ctx.lineTo(42, 28)
      ctx.moveTo(42, 22)
      ctx.lineTo(36, 28)
      ctx.stroke()
      if (frame === 2) {
        ctx.globalAlpha = 0.6
        ctx.fillStyle = "rgba(15,23,42,0.8)"
        ctx.fillRect(0, 0, 64, 64)
        ctx.globalAlpha = 1
      }
    }

    canvasTexture.refresh()
  }

  createPlayerAnimations() {
    for (const [classId, config] of Object.entries(SPRITE_MANIFEST.heroes)) {
      const idleKey = `${classId}-idle-anim`
      const runKey = `${classId}-run-anim`
      const attackKey = `${classId}-attack-anim`
      const hitKey = `${classId}-hit-anim`
      const deadKey = `${classId}-dead-anim`
      const sheetKey = heroSheetKey(classId)

      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          key: idleKey,
          frames: [{ key: sheetKey, frame: config.idleFrame }],
          frameRate: 2,
          repeat: -1,
        })
      }

      if (!this.anims.exists(runKey)) {
        this.anims.create({
          key: runKey,
          frames: config.runFrames.map((frame) => ({ key: sheetKey, frame })),
          frameRate: 7,
          repeat: -1,
        })
      }

      if (!this.anims.exists(attackKey)) {
        this.anims.create({
          key: attackKey,
          frames: config.runFrames.slice(0, 3).map((frame) => ({ key: sheetKey, frame })),
          frameRate: 12,
          repeat: 0,
        })
      }

      if (!this.anims.exists(hitKey)) {
        this.anims.create({
          key: hitKey,
          frames: [{ key: sheetKey, frame: config.idleFrame }, { key: sheetKey, frame: config.runFrames[1] ?? config.idleFrame }],
          frameRate: 10,
          repeat: 0,
        })
      }

      if (!this.anims.exists(deadKey)) {
        this.anims.create({
          key: deadKey,
          frames: [{ key: sheetKey, frame: 12 }, { key: sheetKey, frame: 13 }],
          frameRate: 4,
          repeat: 0,
        })
      }
    }
  }

  createPlayerEquipmentLayers() {
    const classConfig = SPRITE_MANIFEST.heroes[this.classId]
    if (!classConfig) return

    this.playerBodyOverlay = this.add.sprite(this.player.x, this.player.y, heroBodyVariantKey(this.classId, "common"), classConfig.idleFrame)
      .setDepth(21)
      .setScale(this.player.scaleX, this.player.scaleY)
    this.playerHelmet = this.add.sprite(this.player.x, this.player.y, heroHelmetVariantKey(this.classId, "common"), classConfig.idleFrame)
      .setDepth(22)
      .setScale(this.player.scaleX, this.player.scaleY)
    this.playerWeapon = this.add.image(this.player.x, this.player.y, heroWeaponVariantKey(this.classId, "common"))
      .setDepth(19)
      .setScale(1.25)

    this.syncPlayerEquipmentLayers()
  }

  syncPlayerEquipmentLayers() {
    if (!this.playerBodyOverlay || !this.playerHelmet || !this.playerWeapon || this.useLpcSprite) return

    const classConfig = SPRITE_MANIFEST.heroes[this.classId]
    const weaponOffset = classConfig?.weaponOffset ?? { x: 12, y: 6 }
    const facingLeft = this.player.flipX
    const offsetX = facingLeft ? -weaponOffset.x : weaponOffset.x
    const weaponAppearance = resolveWeaponAppearance(this.heroStats.weapon)
    const bodyTexture = heroBodyVariantKey(this.classId, resolveEquipmentTier(this.heroStats.armor))
    const helmetTexture = heroHelmetVariantKey(this.classId, resolveEquipmentTier(this.heroStats.helmet))
    const weaponTexture = heroWeaponVariantKey(this.classId, weaponAppearance.textureTier)

    if (this.playerBodyOverlay.texture?.key !== bodyTexture) this.playerBodyOverlay.setTexture(bodyTexture, 0)
    if (this.playerHelmet.texture?.key !== helmetTexture) this.playerHelmet.setTexture(helmetTexture, 0)

    this.playerBodyOverlay.setPosition(this.player.x, this.player.y)
    this.playerBodyOverlay.setScale(this.player.scaleX, this.player.scaleY)
    this.playerBodyOverlay.setFlipX(facingLeft)
    this.playerBodyOverlay.setFrame(this.player.frame.name)

    this.playerHelmet.setPosition(this.player.x, this.player.y)
    this.playerHelmet.setScale(this.player.scaleX, this.player.scaleY)
    this.playerHelmet.setFlipX(facingLeft)
    this.playerHelmet.setFrame(this.player.frame.name)

    if (this.playerWeapon.texture?.key !== weaponTexture) this.playerWeapon.setTexture(weaponTexture)
    this.playerWeapon.setPosition(this.player.x + offsetX, this.player.y + weaponOffset.y)
    this.playerWeapon.setFlipX(facingLeft)
    this.playerWeapon.setRotation(facingLeft ? -0.22 : 0.22)
    this.playerWeapon.setScale((this.classId === "mage" ? 1.1 : 1.25) * weaponAppearance.scale)
    this.playerWeapon.setTint(weaponAppearance.tint)
    this.playerWeapon.setAlpha(weaponAppearance.alpha)
  }

  createEnemyAnimations() {
    for (const [enemyType, config] of Object.entries(SPRITE_MANIFEST.enemies)) {
      const profile = ENEMY_PROFILE[enemyType]
      if (!profile) continue

      if (!this.anims.exists(profile.idle)) {
        this.anims.create({
          key: profile.idle,
          frames: config.idleFrames.map((frame) => ({ key: profile.sheet, frame })),
          frameRate: 5,
          repeat: -1,
        })
      }

      if (!this.anims.exists(profile.move)) {
        this.anims.create({
          key: profile.move,
          frames: config.moveFrames.map((frame) => ({ key: profile.sheet, frame })),
          frameRate: 7,
          repeat: -1,
        })
      }
    }
  }

  createFxAnimations() {
    const configs = [
      { key: "fx-slashing-anim", sheet: "fx-slashing", frames: SPRITE_MANIFEST.fx.slashing.frames, frameRate: 18 },
      { key: "fx-healing-anim", sheet: "fx-healing", frames: SPRITE_MANIFEST.fx.healing.frames, frameRate: 18 },
      { key: "fx-strike-anim", sheet: "fx-strike", frames: SPRITE_MANIFEST.fx.strike.frames, frameRate: 18 },
      { key: "fx-rings-anim", sheet: "fx-rings", frames: SPRITE_MANIFEST.fx.rings.frames, frameRate: 18 },
    ]

    for (const config of configs) {
      if (this.anims.exists(config.key)) continue
      this.anims.create({
        key: config.key,
        frames: Array.from({ length: config.frames }, (_, frame) => ({ key: config.sheet, frame })),
        frameRate: config.frameRate,
        repeat: 0,
      })
    }
  }

  createCooldownHud() {
    this.cooldownHud = {
      basic: this.createSkillBadge("공", "basic", 0, 0, 32),
      q: this.createSkillBadge("Q", "q", 0, 0, 24),
      e: this.createSkillBadge("E", "e", 0, 0, 24),
      r: this.createSkillBadge("R", "r", 0, 0, 24),
      dash: this.createSkillBadge("회", "dash", 0, 0, 22),
    }
  }

  createSkillBadge(label, keyName, x, y, radius) {
    const bg = this.add.circle(x, y, radius, 0x1e293b, 0.5).setScrollFactor(0).setDepth(118)
    bg.setStrokeStyle(2, 0x94a3b8, 0.7)
    const cooldownMask = this.add.graphics().setScrollFactor(0).setDepth(119)
    const text = this.add.text(x, y, label, { fontFamily: "monospace", fontSize: "13px", color: "#e2e8f0" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(121)
    const remain = this.add.text(x, y + radius + 7, "", { fontFamily: "monospace", fontSize: "10px", color: "#cbd5e1" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(121)
    return { keyName, x, y, radius, bg, cooldownMask, text, remain }
  }

  updateCooldownHud() {
    for (const hud of Object.values(this.cooldownHud)) {
      const remain = this.skillCooldowns[hud.keyName]
      const max = this.skillMax[hud.keyName]
      const ratio = max <= 0 ? 0 : clamp(remain / max, 0, 1)

      hud.cooldownMask.clear()
      if (ratio > 0.001) {
        hud.cooldownMask.fillStyle(0x020617, 0.62)
        hud.cooldownMask.beginPath()
        hud.cooldownMask.moveTo(hud.x, hud.y)
        hud.cooldownMask.arc(hud.x, hud.y, hud.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false)
        hud.cooldownMask.closePath()
        hud.cooldownMask.fillPath()
        hud.remain.setText(remain.toFixed(1))
      } else {
        hud.remain.setText("")
      }
    }
  }

  setupAudioEngine() {
    this.audioCtx = null
    this.musicStep = 0
    this.musicMode = null
    this.musicTimer = null
    Howler.volume(0.25)
  }

  setupMatterEngine() {
    this.matterEngine = Matter.Engine.create({ gravity: { x: 0, y: 0 } })
    this.matterPlayer = Matter.Bodies.circle(this.player.x, this.player.y, 18, { isSensor: true })
    Matter.World.add(this.matterEngine.world, [this.matterPlayer])
  }

  playTone(freq, duration = 0.08, type = "sine", gainValue = 0.02) {
    try {
      if (!this.audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        this.audioCtx = new Ctx()
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {})
      }

      const osc = this.audioCtx.createOscillator()
      const gain = this.audioCtx.createGain()
      osc.type = type
      osc.frequency.value = freq
      gain.gain.value = gainValue
      osc.connect(gain)
      gain.connect(this.audioCtx.destination)
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration)
      osc.stop(this.audioCtx.currentTime + duration)
    } catch {
      // ignore audio issues
    }
  }

  getMusicPattern(mode) {
    if (mode === "boss") return BOSS_BGM
    return CHAPTER_BGM[Math.max(0, Math.min(CHAPTER_BGM.length - 1, this.currentChapter - 1))]
  }

  setMusicMode(mode) {
    if (this.musicMode === mode) return
    this.musicMode = mode
    this.musicStep = 0
    this.musicTimer?.remove(false)
    this.musicTimer = this.time.addEvent({
      delay: mode === "boss" ? 320 : 430,
      loop: true,
      callback: () => this.playMusicTick(),
    })
  }

  playMusicTick() {
    const pattern = this.getMusicPattern(this.musicMode)
    if (!pattern?.length) return
    const freq = pattern[this.musicStep % pattern.length]
    const gain = this.musicMode === "boss" ? 0.013 : 0.009
    const type = this.musicMode === "boss" ? "sawtooth" : "triangle"
    this.playTone(freq, this.musicMode === "boss" ? 0.24 : 0.2, type, gain)
    if (this.musicStep % 2 === 0) {
      this.playTone(freq / 2, this.musicMode === "boss" ? 0.18 : 0.14, "sine", gain * 0.55)
    }
    this.musicStep += 1
  }

  updateMusicState() {
    const bossAlive = this.enemies?.children?.getChildren?.().some((enemy) => enemy?.active && enemy.getData("enemyType") === "boss")
    this.setMusicMode(bossAlive ? "boss" : "field")
  }

  setupTouchControls() {
    this.isTouchMode = this.sys.game.device.input.touch
    if (!this.isTouchMode) return

    this.joyBase = this.add.circle(90, this.scale.height - 90, 58, 0x0f172a, 0.35).setScrollFactor(0).setDepth(120)
    this.joyCap = this.add.circle(90, this.scale.height - 90, 28, 0x94a3b8, 0.6).setScrollFactor(0).setDepth(121)

    const joyPlugin = this.plugins.get("rexVirtualJoystick")
    if (joyPlugin) {
      this.touchState.joystick = joyPlugin.add(this, {
        x: this.joyBase.x,
        y: this.joyBase.y,
        radius: 46,
        base: this.joyBase,
        thumb: this.joyCap,
        forceMin: 8,
      })
    }

    this.bindTouchBadge("basic")
    this.bindTouchBadge("q")
    this.bindTouchBadge("e")
    this.bindTouchBadge("r")
    this.bindTouchBadge("dash")
  }

  bindTouchBadge(keyName) {
    const hud = this.cooldownHud[keyName]
    if (!hud) return
    const hitCircle = this.add.circle(hud.x, hud.y, hud.radius, 0x000000, 0.001).setScrollFactor(0).setDepth(122)
    hitCircle.setInteractive(new Phaser.Geom.Circle(0, 0, hud.radius), Phaser.Geom.Circle.Contains)
    hitCircle.on("pointerdown", () => {
      this.touchState.actions[keyName] = true
    })
  }

  consumeTouchAction(name) {
    const value = this.touchState.actions[name]
    this.touchState.actions[name] = false
    return value
  }

  update(_time, delta) {
    const dt = delta / 1000
    this.animClock += delta
    Matter.Engine.update(this.matterEngine, delta)

    for (const key of Object.keys(this.skillCooldowns)) {
      this.skillCooldowns[key] = Math.max(0, this.skillCooldowns[key] - dt)
    }

    const movement = this.movePlayer()
    const autoHunt = this.store.getState().autoHunt

    if (!movement.manual && autoHunt && !this.playerDead) {
      this.applyAutoHuntBehavior()
    }

    this.animatePlayer(movement.isMoving)
    this.syncPlayerEquipmentLayers()
    this.updateEnemyAI(dt)
    this.handleInputs(movement.manual)
    this.updateTutorialState()
    this.updateOverlay()
    this.updateObjectiveText()
    this.updateCooldownHud()
    this.updateEnvironmentFx(delta)
    this.updateTerrainEffects(dt)
    this.updateMusicState()
    Matter.Body.setPosition(this.matterPlayer, { x: this.player.x, y: this.player.y })

    if (this.time.now - this.lastSyncAt > SYNC_INTERVAL_MS) {
      const nearest = this.getNearestEnemy()
      this.store.getState().syncRealtimeCombat({
        heroHp: this.heroHp,
        enemyHp: nearest ? nearest.getData("hp") : this.store.getState().enemy.hp,
      })
      this.lastSyncAt = this.time.now
    }
  }

  updateEnvironmentFx(delta) {
    if (!this.parallaxDots) return
    const drift = delta * 0.004
    for (const dot of this.parallaxDots) {
      dot.y += drift * (dot.scrollFactorY * 24)
      dot.x += Math.sin((this.animClock + dot.y) * 0.0008) * 0.08
      dot.alpha = 0.08 + Math.abs(Math.sin((this.animClock + dot.x) * 0.0012)) * 0.18
      if (dot.y > WORLD_HEIGHT + 30) {
        dot.y = -20
        dot.x = Phaser.Math.Between(0, WORLD_WIDTH)
      }
    }
  }

  drawArena(theme) {
    const terrainLayout = buildTerrainLayout(this.currentChapter, WORLD_WIDTH, WORLD_HEIGHT)
    const g = this.add.graphics()
    g.fillStyle(theme.floorA, 1)
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    for (let y = 0; y < WORLD_HEIGHT; y += 80) {
      for (let x = 0; x < WORLD_WIDTH; x += 80) {
        const shade = (x / 80 + y / 80) % 2 === 0 ? theme.floorA : theme.floorB
        g.fillStyle(shade, 0.24)
        g.fillRect(x + 2, y + 2, 76, 76)
      }
    }

    for (const band of terrainLayout.pathBands) {
      g.fillStyle(theme.ambient, 0.08)
      g.fillRoundedRect(band.x - band.width / 2, band.y - band.height / 2, band.width, band.height, 34)
    }

    for (let i = 0; i < this.performanceProfile.arenaDeco; i += 1) {
      const x = Phaser.Math.Between(40, WORLD_WIDTH - 40)
      const y = Phaser.Math.Between(40, WORLD_HEIGHT - 40)
      g.fillStyle(theme.grass, 0.18)
      g.fillCircle(x, y, Phaser.Math.Between(12, 26))
    }

    terrainLayout.decoClusters.forEach((cluster, index) => {
      g.fillStyle(index % 2 === 0 ? theme.grass : theme.ambient, 0.12)
      g.fillCircle(cluster.x, cluster.y, cluster.radius)
      g.fillStyle(theme.floorB, 0.16)
      g.fillCircle(cluster.x + 14, cluster.y - 8, cluster.radius * 0.45)
    })

    g.setDepth(0)
    this.arenaLayer = g
    this.terrainLayout = terrainLayout
  }

  createTerrainFeatures() {
    const theme = this.getChapterTheme(this.currentChapter)
    const layout = this.terrainLayout ?? buildTerrainLayout(this.currentChapter, WORLD_WIDTH, WORLD_HEIGHT)
    this.terrainColliders = this.physics.add.staticGroup()
    this.terrainHazards = []
    this.terrainBlessings = []
    this.terrainVisuals = this.add.layer().setDepth(7)

    layout.obstacleRects.forEach((rect, index) => {
      const block = this.add.rectangle(rect.x, rect.y, rect.width, rect.height, theme.floorB, 0.85)
        .setDepth(8)
        .setStrokeStyle(2, theme.ambient, 0.22)
      const shadow = this.add.ellipse(rect.x, rect.y + rect.height * 0.38, rect.width * 0.82, 28, 0x020617, 0.18).setDepth(6)
      this.physics.add.existing(block, true)
      this.terrainColliders.add(block)
      this.terrainVisuals.add([shadow, block])

      const topper = this.add.rectangle(rect.x, rect.y - rect.height * 0.22, rect.width * 0.62, 12 + index * 2, theme.grass, 0.28).setDepth(9)
      this.terrainVisuals.add(topper)
    })

    layout.rockCircles.forEach((rock, index) => {
      const stone = this.add.circle(rock.x, rock.y, rock.radius, theme.floorB, 0.92).setDepth(8).setStrokeStyle(2, theme.ambient, 0.18)
      const moss = this.add.circle(rock.x - rock.radius * 0.25, rock.y - rock.radius * 0.3, rock.radius * 0.34, theme.grass, 0.24).setDepth(9)
      this.physics.add.existing(stone, true)
      this.terrainColliders.add(stone)
      this.terrainVisuals.add([stone, moss])
      if (index % 2 === 0) {
        const rim = this.add.circle(rock.x + rock.radius * 0.2, rock.y + rock.radius * 0.15, rock.radius * 0.24, theme.ambient, 0.12).setDepth(9)
        this.terrainVisuals.add(rim)
      }
    })

    layout.hazardZones.forEach((zone) => {
      const ring = this.add.circle(zone.x, zone.y, zone.radius, 0x7f1d1d, 0.12).setDepth(5).setStrokeStyle(3, 0xf97316, 0.32)
      const core = this.add.circle(zone.x, zone.y, zone.radius * 0.55, 0xfb7185, 0.08).setDepth(5)
      const label = this.add.text(zone.x, zone.y - zone.radius - 16, zone.label, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#fdba74",
        backgroundColor: "rgba(67,20,7,0.58)",
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5).setDepth(10)
      this.terrainVisuals.add([ring, core, label])
      this.terrainHazards.push({ ...zone, ring, core, label, tick: 0 })
    })

    layout.blessingZones.forEach((zone) => {
      const ring = this.add.circle(zone.x, zone.y, zone.radius, theme.haze, 0.09).setDepth(5).setStrokeStyle(2, theme.ambient, 0.28)
      const core = this.add.circle(zone.x, zone.y, zone.radius * 0.42, theme.ambient, 0.08).setDepth(5)
      const label = this.add.text(zone.x, zone.y - zone.radius - 16, zone.label, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#bfdbfe",
        backgroundColor: "rgba(15,23,42,0.52)",
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5).setDepth(10)
      this.terrainVisuals.add([ring, core, label])
      this.terrainBlessings.push({ ...zone, ring, core, label })
    })
  }

  clearTerrainFeatures() {
    this.terrainVisuals?.destroy()
    this.terrainColliders?.clear(true, true)
    this.terrainColliders = null
    this.terrainHazards = []
    this.terrainBlessings = []
  }

  bindTerrainCollisions() {
    this.terrainColliderBindings?.forEach((binding) => binding.destroy())
    this.terrainColliderBindings = []
    if (!this.terrainColliders) return
    this.terrainColliderBindings.push(this.physics.add.collider(this.player, this.terrainColliders))
    this.terrainColliderBindings.push(this.physics.add.collider(this.enemies, this.terrainColliders))
    this.terrainColliderBindings.push(this.physics.add.collider(this.projectiles, this.terrainColliders, (projectile) => {
      projectile.destroy()
    }))
  }

  handleResize(gameSize) {
    this.performanceProfile = getPerformanceProfile(gameSize)
    this.cameras.main.setZoom(this.performanceProfile.zoom)
    this.layoutScreenUi(gameSize)
  }

  layoutScreenUi(gameSize) {
    const width = gameSize?.width ?? this.scale.width
    const height = gameSize?.height ?? this.scale.height
    const compact = width < 780
    const left = SAFE_MARGIN
    const top = SAFE_MARGIN
    const bottom = height - SAFE_MARGIN
    const right = width - SAFE_MARGIN

    this.overlay?.setPosition(left, top)
    this.overlay?.setWordWrapWidth(Math.min(width * 0.58, compact ? width - 32 : 520))

    this.playerHpBarBg?.setPosition(left + 106, top + 92)
    this.playerHpBar?.setPosition(left + 1, top + 92)
    this.objectiveText?.setPosition(left, top + 110)
    this.objectiveText?.setWordWrapWidth(Math.min(width * 0.48, compact ? width - 32 : 420))

    if (this.cooldownHud) {
      const clusterX = right - (compact ? 86 : 110)
      const clusterY = bottom - (compact ? 76 : 92)
      this.positionSkillBadge(this.cooldownHud.basic, clusterX, clusterY, 32)
      this.positionSkillBadge(this.cooldownHud.q, clusterX - 88, clusterY - 42, 24)
      this.positionSkillBadge(this.cooldownHud.e, clusterX - 40, clusterY - 92, 24)
      this.positionSkillBadge(this.cooldownHud.r, clusterX + 8, clusterY - 42, 24)
      this.positionSkillBadge(this.cooldownHud.dash, clusterX - 140, clusterY + 2, 22)
    }

    if (this.joyBase && this.joyCap) {
      this.joyBase.setPosition(left + 70, bottom - 56)
      this.joyCap.setPosition(this.joyBase.x, this.joyBase.y)
      this.touchState.joystick?.setPosition(this.joyBase.x, this.joyBase.y)
    }
  }

  positionSkillBadge(hud, x, y, radius) {
    if (!hud) return
    hud.x = x
    hud.y = y
    hud.radius = radius
    hud.bg.setPosition(x, y)
    hud.bg.setRadius(radius)
    hud.text.setPosition(x, y)
    hud.remain.setPosition(x, y + radius + 7)
  }

  movePlayer() {
    let vx = 0
    let vy = 0
    let manual = false

    if (this.keys.left.isDown || this.cursors.left.isDown) {
      vx -= 1
      manual = true
    }
    if (this.keys.right.isDown || this.cursors.right.isDown) {
      vx += 1
      manual = true
    }
    if (this.keys.up.isDown || this.cursors.up.isDown) {
      vy -= 1
      manual = true
    }
    if (this.keys.down.isDown || this.cursors.down.isDown) {
      vy += 1
      manual = true
    }

    const joy = this.touchState.joystick
    if (joy) {
      vx += joy.forceX / 100
      vy += joy.forceY / 100
      if (Math.abs(joy.forceX) > 1 || Math.abs(joy.forceY) > 1) manual = true
    }

    if (this.playerDead) {
      this.player.setVelocity(0, 0)
      return { isMoving: false, manual }
    }

    if (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) {
      const vec = new Phaser.Math.Vector2(vx, vy).normalize()
      this.player.setVelocity(vec.x * PLAYER_SPEED * (this.terrainEffects.playerSlow ?? 1), vec.y * PLAYER_SPEED * (this.terrainEffects.playerSlow ?? 1))
      this.facing = vec
      this.hasMoved = true
      return { isMoving: true, manual }
    }

    if (this.playerAction == null) this.player.setVelocity(0, 0)
    return { isMoving: false, manual }
  }

  applyAutoHuntBehavior() {
    const target = this.getNearestEnemy(9999)
    if (!target) return

    const d = distance(this.player.x, this.player.y, target.x, target.y)
    const dir = new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y).normalize()
    this.facing = dir

    if (d > 95 && this.playerAction == null) {
      this.player.setVelocity(dir.x * PLAYER_SPEED * 0.85 * (this.terrainEffects.playerSlow ?? 1), dir.y * PLAYER_SPEED * 0.85 * (this.terrainEffects.playerSlow ?? 1))
    } else if (this.playerAction == null) {
      this.player.setVelocity(0, 0)
    }

    if (d < 120 && this.skillCooldowns.basic <= 0) {
      this.basicAttack()
      this.skillCooldowns.basic = this.skillMax.basic
    }

    if (d < 160 && this.skillCooldowns.q <= 0) {
      this.castSkillQ()
      this.skillCooldowns.q = this.skillMax.q
    }

    if (d < 280 && this.skillCooldowns.e <= 0) {
      this.castSkillE()
      this.skillCooldowns.e = this.skillMax.e
    }

    if ((d < 220 || target.getData("enemyType") === "boss") && this.skillCooldowns.r <= 0) {
      this.castSkillR()
      this.skillCooldowns.r = this.skillMax.r
    }
  }

  animatePlayer(isMoving) {
    if (this.playerDead) return

    const now = this.time.now
    if (this.playerAction && now < this.actionLockUntil) return
    if (this.playerAction && now >= this.actionLockUntil) this.playerAction = null

    const animKey = this.useLpcSprite
      ? (isMoving ? "lpc-run-anim" : "lpc-idle-anim")
      : (isMoving ? `${this.classId}-run-anim` : `${this.classId}-idle-anim`)
    if (this.player.anims.currentAnim?.key !== animKey) this.player.anims.play(animKey, true)

    if (isMoving) {
      const bob = Math.sin(this.animClock * 0.018) * 0.035
      this.player.setScale(1 + bob)
    } else {
      this.player.setScale(1)
    }

    this.player.setFlipX(this.facing.x < -0.2)
  }

  playActionAnim(type, lockMs) {
    if (this.playerDead) return
    const key = this.useLpcSprite ? `lpc-${type}-anim` : `${this.classId}-${type}-anim`
    if (!this.anims.exists(key)) return

    this.playerAction = type
    this.actionLockUntil = this.time.now + lockMs
    this.player.anims.play(key, true)
  }

  handleInputs(manualInput) {
    if (this.playerDead) return

    const basicPressed = Phaser.Input.Keyboard.JustDown(this.keys.j) || this.consumeTouchAction("basic")
    const qPressed = Phaser.Input.Keyboard.JustDown(this.keys.q) || this.consumeTouchAction("q")
    const ePressed = Phaser.Input.Keyboard.JustDown(this.keys.e) || this.consumeTouchAction("e")
    const rPressed = Phaser.Input.Keyboard.JustDown(this.keys.r) || this.consumeTouchAction("r")
    const dashPressed = Phaser.Input.Keyboard.JustDown(this.keys.space) || this.consumeTouchAction("dash")

    if (basicPressed && this.skillCooldowns.basic <= 0) {
      this.basicAttack()
      this.skillCooldowns.basic = this.skillMax.basic
      this.hasBasicAttacked = true
    }

    if (qPressed && this.skillCooldowns.q <= 0) {
      this.castSkillQ()
      this.skillCooldowns.q = this.skillMax.q
      this.hasUsedSkill = true
    }

    if (ePressed && this.skillCooldowns.e <= 0) {
      this.castSkillE()
      this.skillCooldowns.e = this.skillMax.e
      this.hasUsedSkill = true
    }

    if (rPressed && this.skillCooldowns.r <= 0) {
      this.castSkillR()
      this.skillCooldowns.r = this.skillMax.r
      this.hasUsedSkill = true
    }

    if (dashPressed && this.skillCooldowns.dash <= 0) {
      const targetX = this.player.x + this.facing.x * DASH_DISTANCE
      const targetY = this.player.y + this.facing.y * DASH_DISTANCE
      this.player.setPosition(clamp(targetX, 24, WORLD_WIDTH - 24), clamp(targetY, 24, WORLD_HEIGHT - 24))
      this.emitRing(this.player.x, this.player.y, this.classProfile.color)
      this.playTone(180, 0.06, "triangle", 0.02)
      this.skillCooldowns.dash = this.skillMax.dash
    }

    if (!manualInput && this.store.getState().autoHunt) return
  }

  updateTutorialState() {
    if (this.tutorialStep === 0 && this.hasMoved) this.tutorialStep = 1
    if (this.tutorialStep === 1 && this.hasBasicAttacked) this.tutorialStep = 2
    if (this.tutorialStep === 2 && this.hasUsedSkill) this.tutorialStep = 3
    if (this.tutorialStep === 3 && this.stageClearKills >= 1) this.tutorialStep = 4
  }

  updateObjectiveText() {
    const stageMeta = getStageMeta(this.store.getState().stage)

    if (stageMeta.isBossStage) {
      this.objectiveText.setText(`현재 목표: 챕터 ${stageMeta.chapter} 보스 처치`)
      this.objectiveText.setColor("#fca5a5")
    } else {
      this.objectiveText.setText(`현재 목표: 몬스터 ${stageMeta.killTarget}마리 처치`)
      this.objectiveText.setColor("#fde68a")
    }
  }

  basicAttack() {
    const enemy = this.getNearestEnemy(104)
    if (!enemy) return
    this.playActionAnim("attack", 150)
    this.hitEnemy(enemy, this.rollHeroDamage(this.classProfile.basicMul))
    this.emitSlash(enemy.x, enemy.y, this.classProfile.color)
    this.emitSparkBurst(enemy.x, enemy.y, this.classProfile.color, 5)
    this.playTone(260, 0.05, "square", 0.018)
  }

  castSkillQ() {
    const skillLevelMul = getSkillDamageMultiplier("q", this.heroStats.skillLevels?.q ?? 1)
    this.playActionAnim("attack", 220)
    this.cameras.main.shake(70, 0.002)
    this.playTone(380, 0.08, "sawtooth", 0.024)

    if (this.classId === "warrior") {
      const range = 150
      this.enemies.children.iterate((enemy) => {
        if (!enemy?.active) return
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= range) {
          this.hitEnemy(enemy, this.rollHeroDamage(2.0 * skillLevelMul))
        }
      })
      this.emitRing(this.player.x, this.player.y, 0xfde68a)
      this.emitSparkBurst(this.player.x, this.player.y, 0xfde68a, 10)
      this.applyHitStop(45)
      return
    }

    if (this.classId === "mage") {
      const range = 180
      this.enemies.children.iterate((enemy) => {
        if (!enemy?.active) return
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= range) {
          this.hitEnemy(enemy, this.rollHeroDamage(1.75 * skillLevelMul))
        }
      })
      this.emitRing(this.player.x, this.player.y, 0x67e8f9)
      this.emitSparkBurst(this.player.x, this.player.y, 0x67e8f9, 10)
      this.applyHitStop(35)
      return
    }

    if (this.classId === "archer") {
      this.spawnProjectile(this.facing, this.rollHeroDamage(1.35 * skillLevelMul), 700)
      this.spawnProjectile(this.facing.clone().rotate(0.15), this.rollHeroDamage(1.25 * skillLevelMul), 700)
      this.spawnProjectile(this.facing.clone().rotate(-0.15), this.rollHeroDamage(1.25 * skillLevelMul), 700)
      return
    }

    const target = this.getNearestEnemy(210)
    if (!target) return
    this.player.setPosition(target.x - 18, target.y - 18)
    this.hitEnemy(target, this.rollHeroDamage(2.35 * skillLevelMul))
    this.emitRing(target.x, target.y, 0xfb923c)
    this.emitSparkBurst(target.x, target.y, 0xfb923c, 12)
    this.applyHitStop(40)
  }

  castSkillE() {
    const skillLevelMul = getSkillDamageMultiplier("e", this.heroStats.skillLevels?.e ?? 1)
    this.playActionAnim("attack", 200)
    this.playTone(320, 0.08, "triangle", 0.022)

    if (this.classId === "warrior") {
      const before = new Phaser.Math.Vector2(this.player.x, this.player.y)
      const tx = clamp(this.player.x + this.facing.x * 180, 24, WORLD_WIDTH - 24)
      const ty = clamp(this.player.y + this.facing.y * 180, 24, WORLD_HEIGHT - 24)
      this.player.setPosition(tx, ty)

      this.enemies.children.iterate((enemy) => {
        if (!enemy?.active) return
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, tx, ty)
        const dist2 = Phaser.Math.Distance.Between(enemy.x, enemy.y, before.x, before.y)
        if (Math.min(dist, dist2) < 86) this.hitEnemy(enemy, this.rollHeroDamage(1.7 * skillLevelMul))
      })
      this.emitSlash(tx, ty, 0x93c5fd)
      this.emitSparkBurst(tx, ty, 0x93c5fd, 9)
      return
    }

    if (this.classId === "mage") {
      this.spawnProjectile(this.facing, this.rollHeroDamage(1.6 * skillLevelMul), 640)
      this.spawnProjectile(this.facing.clone().rotate(0.28), this.rollHeroDamage(1.45 * skillLevelMul), 620)
      this.spawnProjectile(this.facing.clone().rotate(-0.28), this.rollHeroDamage(1.45 * skillLevelMul), 620)
      return
    }

    if (this.classId === "archer") {
      this.spawnProjectile(this.facing, this.rollHeroDamage(2.05 * skillLevelMul), 920)
      return
    }

    for (let i = -2; i <= 2; i += 1) this.spawnProjectile(this.facing.clone().rotate(i * 0.17), this.rollHeroDamage(1.15 * skillLevelMul), 750)
  }

  castSkillR() {
    const skillLevelMul = getSkillDamageMultiplier("r", this.heroStats.skillLevels?.r ?? 1)
    this.playActionAnim("attack", 250)
    this.playTone(520, 0.1, "sine", 0.025)

    if (this.classId === "warrior") {
      this.heroHp = clamp(this.heroHp + this.heroStats.maxHp * (0.18 * skillLevelMul), 0, this.heroStats.maxHp)
      this.emitFxAnimation(this.player.x, this.player.y, "fx-healing", "fx-healing-anim", { scale: 1.6 })
      this.emitRing(this.player.x, this.player.y, 0xe2e8f0)
      this.emitSparkBurst(this.player.x, this.player.y, 0xe2e8f0, 14)
      return
    }

    if (this.classId === "mage") {
      const target = this.getNearestEnemy(420)
      if (!target) return
      this.emitFxAnimation(target.x, target.y, "fx-strike", "fx-strike-anim", { scale: 1.25, tint: 0x67e8f9 })
      this.emitRing(target.x, target.y, 0x22d3ee)
      this.time.delayedCall(180, () => {
        this.enemies.children.iterate((enemy) => {
          if (!enemy?.active) return
          if (Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y) < 145) this.hitEnemy(enemy, this.rollHeroDamage(2.7 * skillLevelMul))
        })
      })
      this.cameras.main.shake(100, 0.003)
      this.emitSparkBurst(target.x, target.y, 0x22d3ee, 16)
      this.applyHitStop(55)
      return
    }

    if (this.classId === "archer") {
      const target = this.getNearestEnemy(420)
      if (!target) return
      for (let i = 0; i < 9; i += 1) {
        this.time.delayedCall(i * 80, () => {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
          const radius = Phaser.Math.Between(20, 120)
            const x = target.x + Math.cos(angle) * radius
            const y = target.y + Math.sin(angle) * radius
            this.emitSlash(x, y, 0x4ade80)
            this.enemies.children.iterate((enemy) => {
              if (!enemy?.active) return
              if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < 55) this.hitEnemy(enemy, this.rollHeroDamage(1.2 * skillLevelMul))
            })
          })
        }
      return
    }

    const range = 150
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active) return
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= range) this.hitEnemy(enemy, this.rollHeroDamage(2.15 * skillLevelMul))
    })
    this.heroHp = clamp(this.heroHp + this.heroStats.maxHp * (0.08 * skillLevelMul), 0, this.heroStats.maxHp)
    this.emitRing(this.player.x, this.player.y, 0xfb923c)
    this.emitSparkBurst(this.player.x, this.player.y, 0xfb923c, 14)
    this.applyHitStop(45)
  }

  applyHitStop(ms = 40) {
    if (this.hitStopActive) return
    this.hitStopActive = true
    this.time.timeScale = 0.3
    this.time.delayedCall(ms, () => {
      this.time.timeScale = 1
      this.hitStopActive = false
    })
  }

  spawnProjectile(direction, damage, speed) {
    const projectile = this.projectiles.create(this.player.x, this.player.y, "fx-projectile")
    projectile.setDepth(40)
    projectile.setData("damage", damage)
    projectile.body.setAllowGravity(false)
    projectile.setScale(0.85)
    projectile.setVelocity(direction.x * speed, direction.y * speed)

    this.time.delayedCall(1100, () => {
      if (projectile.active) projectile.destroy()
    })
  }

  rollHeroDamage(multiplier) {
    const base = this.heroStats.atk * multiplier * (this.terrainEffects.playerAtkMul ?? 1)
    const variance = Phaser.Math.FloatBetween(0.9, 1.12)
    const crit = Math.random() <= this.heroStats.critRate
    const damage = base * variance * (crit ? 1 + this.heroStats.critDmg : 1)
    return Math.max(1, Math.floor(damage))
  }

  updateEnemyAI(dt) {
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active) return

      const hp = enemy.getData("hp")
      if (hp <= 0) return

      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y)
      const attackCd = Math.max(0, (enemy.getData("attackCd") || 0) - dt)
      enemy.setData("attackCd", attackCd)

      let speedMul = 1
      if (this.terrainHazards?.some((zone) => distance(enemy.x, enemy.y, zone.x, zone.y) <= zone.radius * 0.9)) {
        speedMul *= 0.82
      }

      if (dist < 300) {
        this.physics.moveToObject(enemy, this.player, (enemy.getData("speed") || 80) * speedMul)
      } else {
        enemy.setVelocity(0, 0)
      }

      const profile = ENEMY_PROFILE[enemy.getData("enemyType")] || ENEMY_PROFILE.slime
      const moving = Math.abs(enemy.body.velocity.x) + Math.abs(enemy.body.velocity.y) > 15
      const animKey = moving ? profile.move : profile.idle
      if (enemy.anims.currentAnim?.key !== animKey) enemy.anims.play(animKey, true)
      this.updateEnemyHpBar(enemy)

      if (enemy.getData("enemyType") === "boss") {
        const wave = Math.sin(this.animClock * 0.01) * 0.045
        enemy.setScale(1.3 + wave)
      }

      if (dist < (enemy.getData("enemyType") === "boss" ? 60 : 42) && attackCd <= 0) {
        const incoming = Math.max(1, Math.floor((enemy.getData("atk") || this.enemyStats.atk) - this.heroStats.def * 0.22))
        this.heroHp = clamp(this.heroHp - incoming, 0, this.heroStats.maxHp)
        enemy.setData("attackCd", enemy.getData("enemyType") === "boss" ? 1.4 : 1.05)
        this.emitDamageText(this.player.x, this.player.y - 28, incoming, 0xfca5a5)
        this.emitSparkBurst(this.player.x, this.player.y, 0xfda4af, enemy.getData("enemyType") === "boss" ? 12 : 6)
        this.triggerHitAnimation()
        this.playTone(140, 0.04, "triangle", 0.015)

        if (enemy.getData("enemyType") === "boss") this.telegraphBossSlam(enemy)
        if (this.heroHp <= 0) this.onHeroDead()
      }
    })
  }

  triggerHitAnimation() {
    if (this.playerDead) return
    this.playActionAnim("hit", 120)
  }

  telegraphBossSlam(boss) {
    const ring = this.add.circle(boss.x, boss.y, 20, 0xf87171, 0.12).setDepth(40)
    this.tweens.add({
      targets: ring,
      radius: 90,
      alpha: 0.35,
      duration: 450,
      onComplete: () => ring.destroy(),
    })

    this.time.delayedCall(440, () => {
      if (!boss.active) return
      const dist = distance(boss.x, boss.y, this.player.x, this.player.y)
      if (dist < 95) {
        const incoming = Math.max(2, Math.floor((boss.getData("atk") || this.enemyStats.atk) * 0.85))
        this.heroHp = clamp(this.heroHp - incoming, 0, this.heroStats.maxHp)
        this.emitDamageText(this.player.x, this.player.y - 30, incoming, 0xfda4af)
        this.emitSparkBurst(this.player.x, this.player.y, 0xfda4af, 12)
        this.triggerHitAnimation()
        this.cameras.main.shake(110, 0.004)
      }
    })
  }

  hitEnemy(enemy, damage) {
    const hp = Math.max(0, (enemy.getData("hp") || 0) - damage)
    enemy.setData("hp", hp)
    this.updateEnemyHpBar(enemy)
    this.emitDamageText(enemy.x, enemy.y - 22, damage, 0xfef08a)
    if (damage > this.heroStats.atk * 1.8) {
      this.emitFxAnimation(enemy.x, enemy.y, "fx-strike", "fx-strike-anim", { scale: 1.05, tint: 0xfde68a })
    }

    if (hp <= 0) {
      const isBoss = enemy.getData("enemyType") === "boss"
      const stageMeta = getStageMeta(this.store.getState().stage)

      this.stageClearKills += isBoss ? stageMeta.killTarget : 1
      this.destroyEnemyBars(enemy)
      enemy.destroy()
      this.emitRing(enemy.x, enemy.y, isBoss ? 0xfca5a5 : 0xfda4af)
      this.emitSparkBurst(enemy.x, enemy.y, isBoss ? 0xfca5a5 : this.classProfile.color, isBoss ? 20 : 9)
      this.playTone(isBoss ? 860 : 720, isBoss ? 0.15 : 0.06, "square", 0.02)
      this.cameras.main.shake(isBoss ? 150 : 80, isBoss ? 0.005 : 0.002)

      if (this.stageClearKills >= stageMeta.killTarget) {
        this.stageClearKills = 0
        this.store.getState().onEnemyDefeated()
        this.pendingBossWarning = !stageMeta.isFinalStage && getStageMeta(this.store.getState().stage).isBossStage
      }

      this.time.delayedCall(isBoss ? 1200 : 500, () => this.spawnEnemy())
    }
  }

  onHeroDead() {
    this.store.getState().onHeroDefeated()
    this.heroHp = this.store.getState().hero.maxHp
    this.playerDead = true
    this.playActionAnim("dead", 900)
    this.player.setVelocity(0, 0)
    this.emitRing(this.player.x, this.player.y, 0xfb7185)
    this.emitSparkBurst(this.player.x, this.player.y, 0xfb7185, 18)
    this.playTone(90, 0.12, "sawtooth", 0.03)

    this.time.delayedCall(900, () => {
      this.playerDead = false
      this.playerAction = null
      this.player.setPosition(420, 300)
      this.player.anims.play(this.useLpcSprite ? "lpc-idle-anim" : `${this.classId}-idle-anim`, true)
    })

    this.enemies.children.iterate((enemy) => this.destroyEnemyBars(enemy))
    this.enemies.clear(true, true)
    for (let i = 0; i < 10; i += 1) this.spawnEnemy()
  }

  spawnEnemy() {
    const stage = this.store.getState().stage
    const stageMeta = getStageMeta(stage)
    const enemyType = chooseEnemyType(stage)
    const profile = ENEMY_PROFILE[enemyType]

    if (enemyType === "boss" && this.pendingBossWarning) {
      this.showBossWarning(stageMeta)
      this.pendingBossWarning = false
    }

    const { x, y } = this.findSpawnPoint()
    const enemy = this.enemies.create(x, y, profile.sheet, 0)
    enemy.setDepth(enemyType === "boss" ? 22 : 18)
    enemy.play(profile.idle, true)
    enemy.setScale(enemyType === "boss" ? 1.3 : enemyType === "golem" ? 1.12 : 1)

    const hp = this.enemyStats.maxHp * profile.hpMul
    const atk = this.enemyStats.atk * profile.atkMul

    enemy.setData("enemyType", enemyType)
    enemy.setData("hp", hp)
    enemy.setData("maxHp", hp)
    enemy.setData("atk", atk)
    enemy.setData("speed", Phaser.Math.Between(profile.speed[0], profile.speed[1]))
    enemy.setData("attackCd", Phaser.Math.FloatBetween(0, enemyType === "boss" ? 1.6 : 0.8))
    enemy.setCollideWorldBounds(true)

    const barW = enemyType === "boss" ? 72 : 40
    const barBg = this.add.rectangle(x, y - (enemyType === "boss" ? 50 : 30), barW, 6, 0x0f172a, 0.95).setDepth(25)
    const bar = this.add.rectangle(x - barW / 2 + 1, y - (enemyType === "boss" ? 50 : 30), barW - 2, 4, profile.color, 0.95).setOrigin(0, 0.5).setDepth(26)
    enemy.setData("barBg", barBg)
    enemy.setData("bar", bar)

    if (enemyType === "boss") {
      const label = this.add.text(x, y - 66, `챕터 ${stageMeta.chapter} 보스`, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#fecaca",
        backgroundColor: "rgba(127,29,29,0.7)",
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(27)
      enemy.setData("label", label)
    }
  }

  showBossWarning(stageMeta) {
    const warning = this.add.text(this.cameras.main.midPoint.x, 72, `경고: 챕터 ${stageMeta.chapter} 최종 보스 등장`, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#fecaca",
      backgroundColor: "rgba(127,29,29,0.86)",
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(140)

    const flash = this.add.rectangle(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, this.scale.width, this.scale.height, 0x7f1d1d, 0.18)
      .setScrollFactor(0)
      .setDepth(139)

    this.playTone(120, 0.18, "sawtooth", 0.03)
    this.emitSparkBurst(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, 0xfca5a5, 26)

    this.tweens.add({
      targets: warning,
      alpha: 0,
      duration: 1600,
      delay: 500,
      onComplete: () => warning.destroy(),
    })
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 620,
      onComplete: () => flash.destroy(),
    })
  }

  updateEnemyHpBar(enemy) {
    const barBg = enemy.getData("barBg")
    const bar = enemy.getData("bar")
    const label = enemy.getData("label")
    if (!barBg || !bar) return

    const maxHp = enemy.getData("maxHp") || this.enemyStats.maxHp
    const hpRate = clamp((enemy.getData("hp") || 0) / maxHp, 0, 1)
    const yOffset = enemy.getData("enemyType") === "boss" ? 50 : 30

    barBg.setPosition(enemy.x, enemy.y - yOffset)
    bar.setPosition(enemy.x - barBg.width / 2 + 1, enemy.y - yOffset)
    bar.width = (barBg.width - 2) * hpRate

    if (label) label.setPosition(enemy.x, enemy.y - yOffset - 16)
  }

  destroyEnemyBars(enemy) {
    const barBg = enemy?.getData?.("barBg")
    const bar = enemy?.getData?.("bar")
    const label = enemy?.getData?.("label")
    if (barBg?.active) barBg.destroy()
    if (bar?.active) bar.destroy()
    if (label?.active) label.destroy()
  }

  getNearestEnemy(maxRange = 9999) {
    let nearest = null
    let nearestDist = maxRange

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active) return
      const hp = enemy.getData("hp") || 0
      if (hp <= 0) return

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y)
      if (dist < nearestDist) {
        nearest = enemy
        nearestDist = dist
      }
    })

    return nearest
  }

  emitDamageText(x, y, value, color) {
    const txt = this.add.text(x, y, `${value}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      stroke: "#020617",
      strokeThickness: 3,
    })
    txt.setDepth(60)
    this.fxLayer.add(txt)

    this.tweens.add({
      targets: txt,
      y: y - 26,
      alpha: 0,
      duration: 460,
      ease: "Sine.easeOut",
      onComplete: () => txt.destroy(),
    })
  }

  emitRing(x, y, color) {
    const ring = this.add.sprite(x, y, "fx-rings", 0).setDepth(45).setScale(1.4).setTint(color)
    this.fxLayer.add(ring)
    ring.play("fx-rings-anim")
    ring.once("animationcomplete", () => ring.destroy())
  }

  emitFxAnimation(x, y, texture, animKey, options = {}) {
    const fx = this.add.sprite(x, y, texture, 0).setDepth(options.depth ?? 45)
    if (options.scale) fx.setScale(options.scale)
    if (options.rotation) fx.setRotation(options.rotation)
    if (options.tint) fx.setTint(options.tint)
    this.fxLayer.add(fx)
    fx.play(animKey)
    fx.once("animationcomplete", () => fx.destroy())
  }

  emitSparkBurst(x, y, color, count = 8) {
    for (let i = 0; i < count; i += 1) {
      const spark = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 0.9)
      spark.setDepth(46)
      this.fxLayer.add(spark)
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const distancePx = Phaser.Math.Between(22, 74)
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distancePx,
        y: y + Math.sin(angle) * distancePx,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(220, 420),
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy(),
      })
    }
  }

  emitLevelBurst(x, y) {
    const label = this.add.text(x, y - 42, "레벨 업!", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#fde68a",
      stroke: "#713f12",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(70)
    this.fxLayer.add(label)
    this.emitSparkBurst(x, y, 0xfde68a, 18)
    this.emitRing(x, y, 0xfacc15)
    this.tweens.add({
      targets: label,
      y: y - 84,
      alpha: 0,
      duration: 900,
      ease: "Sine.easeOut",
      onComplete: () => label.destroy(),
    })
  }

  showChapterBanner(chapter) {
    const theme = this.getChapterTheme(chapter)
    const banner = this.add.text(this.cameras.main.midPoint.x, 112, `챕터 ${chapter} 진입`, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#f8fafc",
      backgroundColor: Phaser.Display.Color.IntegerToColor(theme.haze).rgba,
      padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(141)
    this.emitSparkBurst(this.cameras.main.midPoint.x, 112, theme.ambient, 20)
    this.tweens.add({
      targets: banner,
      alpha: 0,
      y: 84,
      duration: 1800,
      delay: 350,
      onComplete: () => banner.destroy(),
    })
  }

  emitSlash(x, y, color) {
    this.emitFxAnimation(x, y, "fx-slashing", "fx-slashing-anim", {
      scale: 1.15,
      rotation: Phaser.Math.FloatBetween(-0.9, 0.9),
      tint: color,
    })
  }

  updateOverlay() {
    const nearest = this.getNearestEnemy()
    const enemyHp = nearest ? Math.floor(nearest.getData("hp")) : 0
    const stage = this.store.getState().stage
    const stageMeta = getStageMeta(stage)
    const autoHunt = this.store.getState().autoHunt

    this.playerHpBar.width = 200 * clamp(this.heroHp / this.heroStats.maxHp, 0, 1)

    this.overlay.setText(
      [
        `직업 ${this.heroStats.name} · 챕터 ${stageMeta.chapter}-${stageMeta.stageInChapter} · 전체 ${stageMeta.globalStage} · 자동사냥 ${autoHunt ? "ON" : "OFF"}`,
        `HP ${Math.floor(this.heroHp)} / ${Math.floor(this.heroStats.maxHp)} · 공격 ${Math.floor(this.heroStats.atk)} · 방어 ${Math.floor(this.heroStats.def)} · 타겟 HP ${enemyHp}`,
        `이동 WASD/방향키 · 공격 J · 스킬 Q/E/R · 대시 Space · 처치 ${this.stageClearKills}/${stageMeta.killTarget}`,
        TUTORIAL_TEXT[this.tutorialStep],
      ].join("\n")
    )
  }

  findSpawnPoint() {
    for (let tries = 0; tries < 16; tries += 1) {
      const x = Phaser.Math.Between(80, WORLD_WIDTH - 80)
      const y = Phaser.Math.Between(80, WORLD_HEIGHT - 80)
      if (this.isWalkablePoint(x, y, 54)) return { x, y }
    }
    return { x: WORLD_WIDTH * 0.75, y: WORLD_HEIGHT * 0.5 }
  }

  isWalkablePoint(x, y, padding = 0) {
    const layout = this.terrainLayout
    if (!layout) return true
    if (distance(x, y, this.player?.x ?? 420, this.player?.y ?? 300) < (layout.spawnSafeRadius ?? 90) + padding) return false

    const hitRect = layout.obstacleRects.some((rect) => (
      x > rect.x - rect.width / 2 - padding &&
      x < rect.x + rect.width / 2 + padding &&
      y > rect.y - rect.height / 2 - padding &&
      y < rect.y + rect.height / 2 + padding
    ))
    if (hitRect) return false

    return !layout.rockCircles.some((rock) => distance(x, y, rock.x, rock.y) < rock.radius + padding)
  }

  updateTerrainEffects(dt) {
    this.terrainTick += dt
    const inHazard = this.terrainHazards?.find((zone) => distance(this.player.x, this.player.y, zone.x, zone.y) <= zone.radius)
    const inBlessing = this.terrainBlessings?.find((zone) => distance(this.player.x, this.player.y, zone.x, zone.y) <= zone.radius)

    this.terrainEffects.playerSlow = inHazard ? inHazard.slow : 1
    this.terrainEffects.playerAtkMul = inBlessing ? inBlessing.atkMul : 1

    if (inHazard && this.terrainTick >= 0.35) {
      const damage = Math.max(1, Math.floor(inHazard.dps * 0.5))
      this.heroHp = clamp(this.heroHp - damage, 0, this.heroStats.maxHp)
      this.emitDamageText(this.player.x, this.player.y - 30, damage, 0xfb7185)
      this.emitSparkBurst(this.player.x, this.player.y, 0xfb7185, 3)
      this.terrainTick = 0
      if (this.heroHp <= 0) this.onHeroDead()
    }

    if (inBlessing) {
      this.heroHp = clamp(this.heroHp + this.heroStats.maxHp * inBlessing.regen * dt, 0, this.heroStats.maxHp)
    }
  }

  shutdown() {
    this.enemies?.children?.iterate((enemy) => this.destroyEnemyBars(enemy))
    this.playerBodyOverlay?.destroy()
    this.playerHelmet?.destroy()
    this.playerWeapon?.destroy()
    this.touchState.joystick?.destroy()
    this.musicTimer?.remove(false)
    this.scale.off("resize", this.handleResize, this)
    this.terrainColliderBindings?.forEach((binding) => binding.destroy())
    this.clearTerrainFeatures()
    if (this.unsubscribe) this.unsubscribe()
  }
}
