import Phaser from "phaser"
import Matter from "matter-js"
import { Howler } from "howler"
import { useGameStore } from "../state/gameStore"
import { SPRITE_MANIFEST, heroTextureKey } from "./assets/manifest"

const WORLD_WIDTH = 2200
const WORLD_HEIGHT = 1400
const PLAYER_SPEED = 260
const DASH_DISTANCE = 150
const SYNC_INTERVAL_MS = 160

const ENEMY_PROFILE = {
  slime: { idle: "enemy-slime-idle", move: "enemy-slime-move", hpMul: 1, atkMul: 1, speed: [86, 116], color: 0xfb7185 },
  golem: { idle: "enemy-golem-idle", move: "enemy-golem-move", hpMul: 2.1, atkMul: 1.45, speed: [60, 80], color: 0xa3a3a3 },
  bat: { idle: "enemy-bat-idle", move: "enemy-bat-move", hpMul: 0.72, atkMul: 0.9, speed: [130, 170], color: 0xa78bfa },
  boss: { idle: "enemy-boss-idle", move: "enemy-boss-idle", hpMul: 9.5, atkMul: 2.4, speed: [70, 90], color: 0xdc2626 },
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2)
}

function chooseEnemyType(stage) {
  if (stage % 5 === 0) return "boss"
  const r = Math.random()
  if (r < 0.2 + Math.min(0.2, stage * 0.01)) return "golem"
  if (r < 0.45) return "bat"
  return "slime"
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
  }

  preload() {
    this.load.spritesheet("lpc-idle", "/assets/reference/lpc/body_idle_light.png", { frameWidth: 64, frameHeight: 64 })
    this.load.spritesheet("lpc-walk", "/assets/reference/lpc/body_walk_light.png", { frameWidth: 64, frameHeight: 64 })
    this.load.spritesheet("lpc-slash", "/assets/reference/lpc/body_slash_light.png", { frameWidth: 64, frameHeight: 64 })
    this.load.spritesheet("lpc-hurt", "/assets/reference/lpc/body_hurt_light.png", { frameWidth: 64, frameHeight: 64 })

    for (const [classId, paths] of Object.entries(SPRITE_MANIFEST.heroes)) {
      this.load.svg(heroTextureKey(classId, "idle"), paths.idle, { width: 64, height: 64 })
      this.load.svg(heroTextureKey(classId, "run"), paths.run, { width: 64, height: 64 })
    }

    this.load.svg("enemy-slime-idle", SPRITE_MANIFEST.enemies.slimeIdle, { width: 48, height: 48 })
    this.load.svg("enemy-slime-move", SPRITE_MANIFEST.enemies.slimeMove, { width: 48, height: 48 })
    this.load.svg("enemy-golem-idle", SPRITE_MANIFEST.enemies.golemIdle, { width: 56, height: 56 })
    this.load.svg("enemy-golem-move", SPRITE_MANIFEST.enemies.golemMove, { width: 56, height: 56 })
    this.load.svg("enemy-bat-idle", SPRITE_MANIFEST.enemies.batIdle, { width: 52, height: 52 })
    this.load.svg("enemy-bat-move", SPRITE_MANIFEST.enemies.batMove, { width: 52, height: 52 })
    this.load.svg("enemy-boss-idle", SPRITE_MANIFEST.enemies.bossIdle, { width: 84, height: 84 })
    this.load.svg("fx-projectile", SPRITE_MANIFEST.fx.projectile, { width: 24, height: 24 })
  }

  create() {
    this.store = useGameStore
    const initial = this.store.getState()

    this.classId = initial.hero.classId
    this.classProfile = CLASS_PROFILE[this.classId] || CLASS_PROFILE.warrior
    this.useLpcSprite = true

    this.heroStats = {
      maxHp: initial.hero.maxHp,
      atk: initial.hero.atk,
      def: initial.hero.def,
      critRate: initial.hero.critRate,
      critDmg: initial.hero.critDmg,
      name: initial.hero.className,
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
    this.cameras.main.setZoom(1.18)

    this.drawArena()
    if (this.useLpcSprite) {
      this.createLpcAnimations()
    } else {
      this.createPlayerActionFrames()
      this.createPlayerAnimations()
    }

    this.player = this.physics.add.sprite(420, 300, this.useLpcSprite ? "lpc-idle" : heroTextureKey(this.classId, "idle"))
    this.player.setCollideWorldBounds(true)
    this.player.setDrag(700, 700)
    this.player.setDepth(20)
    this.applyClassTint()

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)

    this.enemies = this.physics.add.group()
    this.projectiles = this.physics.add.group()

    for (let i = 0; i < 12; i += 1) this.spawnEnemy()

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
      fontSize: "14px",
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

    this.unsubscribe = this.store.subscribe((state) => {
      this.heroStats = {
        maxHp: state.hero.maxHp,
        atk: state.hero.atk,
        def: state.hero.def,
        critRate: state.hero.critRate,
        critDmg: state.hero.critDmg,
        name: state.hero.className,
      }
      this.enemyStats = {
        maxHp: state.enemy.maxHp,
        atk: state.enemy.atk,
        def: state.enemy.def,
      }

      if (this.classId !== state.hero.classId) {
        this.classId = state.hero.classId
        this.classProfile = CLASS_PROFILE[this.classId] || CLASS_PROFILE.warrior
        this.applyClassTint()
      }

      this.heroHp = clamp(this.heroHp, 1, this.heroStats.maxHp)
    })
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
    const classes = Object.keys(CLASS_PROFILE)

    for (const classId of classes) {
      const baseKey = heroTextureKey(classId, "idle")
      for (let frame = 1; frame <= 2; frame += 1) {
        this.createDerivedFrame(baseKey, heroTextureKey(classId, `attack-${frame}`), "attack", frame)
        this.createDerivedFrame(baseKey, heroTextureKey(classId, `hit-${frame}`), "hit", frame)
        this.createDerivedFrame(baseKey, heroTextureKey(classId, `dead-${frame}`), "dead", frame)
      }
    }
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
    for (const classId of Object.keys(CLASS_PROFILE)) {
      const idleKey = `${classId}-idle-anim`
      const runKey = `${classId}-run-anim`
      const attackKey = `${classId}-attack-anim`
      const hitKey = `${classId}-hit-anim`
      const deadKey = `${classId}-dead-anim`

      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          key: idleKey,
          frames: [{ key: heroTextureKey(classId, "idle") }],
          frameRate: 2,
          repeat: -1,
        })
      }

      if (!this.anims.exists(runKey)) {
        this.anims.create({
          key: runKey,
          frames: [{ key: heroTextureKey(classId, "idle") }, { key: heroTextureKey(classId, "run") }],
          frameRate: 7,
          repeat: -1,
        })
      }

      if (!this.anims.exists(attackKey)) {
        this.anims.create({
          key: attackKey,
          frames: [{ key: heroTextureKey(classId, "attack-1") }, { key: heroTextureKey(classId, "attack-2") }],
          frameRate: 12,
          repeat: 0,
        })
      }

      if (!this.anims.exists(hitKey)) {
        this.anims.create({
          key: hitKey,
          frames: [{ key: heroTextureKey(classId, "hit-1") }, { key: heroTextureKey(classId, "hit-2") }],
          frameRate: 10,
          repeat: 0,
        })
      }

      if (!this.anims.exists(deadKey)) {
        this.anims.create({
          key: deadKey,
          frames: [{ key: heroTextureKey(classId, "dead-1") }, { key: heroTextureKey(classId, "dead-2") }],
          frameRate: 4,
          repeat: 0,
        })
      }
    }
  }

  createCooldownHud() {
    this.cooldownHud = {
      basic: this.createSkillBadge("공", "basic", this.scale.width - 88, this.scale.height - 90, 32),
      q: this.createSkillBadge("Q", "q", this.scale.width - 170, this.scale.height - 134, 24),
      e: this.createSkillBadge("E", "e", this.scale.width - 122, this.scale.height - 182, 24),
      r: this.createSkillBadge("R", "r", this.scale.width - 74, this.scale.height - 134, 24),
      dash: this.createSkillBadge("회", "dash", this.scale.width - 226, this.scale.height - 86, 22),
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
    return { keyName, x, y, radius, cooldownMask, text, remain }
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
    this.updateEnemyAI(dt)
    this.handleInputs(movement.manual)
    this.updateTutorialState()
    this.updateOverlay()
    this.updateObjectiveText()
    this.updateCooldownHud()
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

  drawArena() {
    const g = this.add.graphics()
    g.fillStyle(0x13233b, 1)
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    for (let y = 0; y < WORLD_HEIGHT; y += 80) {
      for (let x = 0; x < WORLD_WIDTH; x += 80) {
        const shade = (x / 80 + y / 80) % 2 === 0 ? 0x1b2f4e : 0x1f3558
        g.fillStyle(shade, 0.24)
        g.fillRect(x + 2, y + 2, 76, 76)
      }
    }

    for (let i = 0; i < 90; i += 1) {
      const x = Phaser.Math.Between(40, WORLD_WIDTH - 40)
      const y = Phaser.Math.Between(40, WORLD_HEIGHT - 40)
      g.fillStyle(0x84cc16, 0.18)
      g.fillCircle(x, y, Phaser.Math.Between(12, 26))
    }

    g.setDepth(0)
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
      this.player.setVelocity(vec.x * PLAYER_SPEED, vec.y * PLAYER_SPEED)
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
      this.player.setVelocity(dir.x * PLAYER_SPEED * 0.85, dir.y * PLAYER_SPEED * 0.85)
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
    const stage = this.store.getState().stage
    const bossStage = stage % 5 === 0

    if (bossStage) {
      this.objectiveText.setText("현재 목표: 보스 처치 후 스테이지 돌파")
      this.objectiveText.setColor("#fca5a5")
    } else {
      this.objectiveText.setText("현재 목표: 몬스터 5마리 처치")
      this.objectiveText.setColor("#fde68a")
    }
  }

  basicAttack() {
    const enemy = this.getNearestEnemy(104)
    if (!enemy) return
    this.playActionAnim("attack", 150)
    this.hitEnemy(enemy, this.rollHeroDamage(this.classProfile.basicMul))
    this.emitSlash(enemy.x, enemy.y, this.classProfile.color)
    this.playTone(260, 0.05, "square", 0.018)
  }

  castSkillQ() {
    this.playActionAnim("attack", 220)
    this.cameras.main.shake(70, 0.002)
    this.playTone(380, 0.08, "sawtooth", 0.024)

    if (this.classId === "warrior") {
      const range = 150
      this.enemies.children.iterate((enemy) => {
        if (!enemy?.active) return
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= range) {
          this.hitEnemy(enemy, this.rollHeroDamage(2.0))
        }
      })
      this.emitRing(this.player.x, this.player.y, 0xfde68a)
      this.applyHitStop(45)
      return
    }

    if (this.classId === "mage") {
      const range = 180
      this.enemies.children.iterate((enemy) => {
        if (!enemy?.active) return
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= range) {
          this.hitEnemy(enemy, this.rollHeroDamage(1.75))
        }
      })
      this.emitRing(this.player.x, this.player.y, 0x67e8f9)
      this.applyHitStop(35)
      return
    }

    if (this.classId === "archer") {
      this.spawnProjectile(this.facing, this.rollHeroDamage(1.35), 700)
      this.spawnProjectile(this.facing.clone().rotate(0.15), this.rollHeroDamage(1.25), 700)
      this.spawnProjectile(this.facing.clone().rotate(-0.15), this.rollHeroDamage(1.25), 700)
      return
    }

    const target = this.getNearestEnemy(210)
    if (!target) return
    this.player.setPosition(target.x - 18, target.y - 18)
    this.hitEnemy(target, this.rollHeroDamage(2.35))
    this.emitRing(target.x, target.y, 0xfb923c)
    this.applyHitStop(40)
  }

  castSkillE() {
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
        if (Math.min(dist, dist2) < 86) this.hitEnemy(enemy, this.rollHeroDamage(1.7))
      })
      this.emitSlash(tx, ty, 0x93c5fd)
      return
    }

    if (this.classId === "mage") {
      this.spawnProjectile(this.facing, this.rollHeroDamage(1.6), 640)
      this.spawnProjectile(this.facing.clone().rotate(0.28), this.rollHeroDamage(1.45), 620)
      this.spawnProjectile(this.facing.clone().rotate(-0.28), this.rollHeroDamage(1.45), 620)
      return
    }

    if (this.classId === "archer") {
      this.spawnProjectile(this.facing, this.rollHeroDamage(2.05), 920)
      return
    }

    for (let i = -2; i <= 2; i += 1) this.spawnProjectile(this.facing.clone().rotate(i * 0.17), this.rollHeroDamage(1.15), 750)
  }

  castSkillR() {
    this.playActionAnim("attack", 250)
    this.playTone(520, 0.1, "sine", 0.025)

    if (this.classId === "warrior") {
      this.heroHp = clamp(this.heroHp + this.heroStats.maxHp * 0.18, 0, this.heroStats.maxHp)
      this.emitRing(this.player.x, this.player.y, 0xe2e8f0)
      return
    }

    if (this.classId === "mage") {
      const target = this.getNearestEnemy(420)
      if (!target) return
      this.emitRing(target.x, target.y, 0x22d3ee)
      this.time.delayedCall(180, () => {
        this.enemies.children.iterate((enemy) => {
          if (!enemy?.active) return
          if (Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y) < 145) this.hitEnemy(enemy, this.rollHeroDamage(2.7))
        })
      })
      this.cameras.main.shake(100, 0.003)
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
            if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < 55) this.hitEnemy(enemy, this.rollHeroDamage(1.2))
          })
        })
      }
      return
    }

    const range = 150
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active) return
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= range) this.hitEnemy(enemy, this.rollHeroDamage(2.15))
    })
    this.heroHp = clamp(this.heroHp + this.heroStats.maxHp * 0.08, 0, this.heroStats.maxHp)
    this.emitRing(this.player.x, this.player.y, 0xfb923c)
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
    projectile.setTint(this.classProfile.color)
    projectile.setVelocity(direction.x * speed, direction.y * speed)

    this.time.delayedCall(1100, () => {
      if (projectile.active) projectile.destroy()
    })
  }

  rollHeroDamage(multiplier) {
    const base = this.heroStats.atk * multiplier
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

      if (dist < 300) {
        this.physics.moveToObject(enemy, this.player, enemy.getData("speed") || 80)
      } else {
        enemy.setVelocity(0, 0)
      }

      const profile = ENEMY_PROFILE[enemy.getData("enemyType")] || ENEMY_PROFILE.slime
      const moving = Math.abs(enemy.body.velocity.x) + Math.abs(enemy.body.velocity.y) > 15
      enemy.setTexture(moving ? profile.move : profile.idle)
      this.updateEnemyHpBar(enemy)

      if (enemy.getData("enemyType") === "boss") {
        const wave = Math.sin(this.animClock * 0.01) * 0.045
        enemy.setScale(1.08 + wave)
      }

      if (dist < (enemy.getData("enemyType") === "boss" ? 60 : 42) && attackCd <= 0) {
        const incoming = Math.max(1, Math.floor((enemy.getData("atk") || this.enemyStats.atk) - this.heroStats.def * 0.22))
        this.heroHp = clamp(this.heroHp - incoming, 0, this.heroStats.maxHp)
        enemy.setData("attackCd", enemy.getData("enemyType") === "boss" ? 1.4 : 1.05)
        this.emitDamageText(this.player.x, this.player.y - 28, incoming, 0xfca5a5)
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

    if (hp <= 0) {
      const isBoss = enemy.getData("enemyType") === "boss"

      this.stageClearKills += isBoss ? 5 : 1
      this.destroyEnemyBars(enemy)
      enemy.destroy()
      this.emitRing(enemy.x, enemy.y, isBoss ? 0xfca5a5 : 0xfda4af)
      this.playTone(isBoss ? 860 : 720, isBoss ? 0.15 : 0.06, "square", 0.02)
      this.cameras.main.shake(isBoss ? 150 : 80, isBoss ? 0.005 : 0.002)

      if (this.stageClearKills >= 5) {
        this.stageClearKills = 0
        this.store.getState().onEnemyDefeated()
        this.pendingBossWarning = this.store.getState().stage % 5 === 0
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
    const enemyType = chooseEnemyType(stage)
    const profile = ENEMY_PROFILE[enemyType]

    if (enemyType === "boss" && this.pendingBossWarning) {
      this.showBossWarning(stage)
      this.pendingBossWarning = false
    }

    const x = Phaser.Math.Between(80, WORLD_WIDTH - 80)
    const y = Phaser.Math.Between(80, WORLD_HEIGHT - 80)
    const enemy = this.enemies.create(x, y, profile.idle)
    enemy.setDepth(enemyType === "boss" ? 22 : 18)

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
      const label = this.add.text(x, y - 66, "보스", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#fecaca",
        backgroundColor: "rgba(127,29,29,0.7)",
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(27)
      enemy.setData("label", label)
    }
  }

  showBossWarning(stage) {
    const warning = this.add.text(this.cameras.main.midPoint.x, 72, `경고: 스테이지 ${stage} 보스 등장`, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#fecaca",
      backgroundColor: "rgba(127,29,29,0.86)",
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(140)

    this.playTone(120, 0.18, "sawtooth", 0.03)

    this.tweens.add({
      targets: warning,
      alpha: 0,
      duration: 1600,
      delay: 500,
      onComplete: () => warning.destroy(),
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
    const ring = this.add.circle(x, y, 12, color, 0.15).setStrokeStyle(2, color, 0.9)
    ring.setDepth(45)
    this.fxLayer.add(ring)

    this.tweens.add({
      targets: ring,
      radius: 58,
      alpha: 0,
      duration: 340,
      onComplete: () => ring.destroy(),
    })
  }

  emitSlash(x, y, color) {
    const slash = this.add.rectangle(x, y, 54, 10, color, 0.9)
    slash.setDepth(45)
    slash.setRotation(Phaser.Math.FloatBetween(-0.9, 0.9))
    this.fxLayer.add(slash)

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.4,
      duration: 180,
      onComplete: () => slash.destroy(),
    })
  }

  updateOverlay() {
    const nearest = this.getNearestEnemy()
    const enemyHp = nearest ? Math.floor(nearest.getData("hp")) : 0
    const stage = this.store.getState().stage
    const autoHunt = this.store.getState().autoHunt

    this.playerHpBar.width = 200 * clamp(this.heroHp / this.heroStats.maxHp, 0, 1)

    this.overlay.setText(
      [
        `직업: ${this.heroStats.name} | 스테이지 ${stage} | 처치 ${this.stageClearKills}/5 | 자동사냥: ${autoHunt ? "ON" : "OFF"}`,
        `체력 ${Math.floor(this.heroHp)} / ${Math.floor(this.heroStats.maxHp)} | 공격 ${Math.floor(this.heroStats.atk)} 방어 ${Math.floor(this.heroStats.def)}`,
        `기본공격(J) · 스킬(Q:${this.classProfile.skillQ} / E:${this.classProfile.skillE} / R:${this.classProfile.skillR})`,
        `대시(Space) · 이동(WASD/방향키) · 현재 타겟 체력: ${enemyHp}`,
        TUTORIAL_TEXT[this.tutorialStep],
      ].join("\n")
    )
  }

  shutdown() {
    this.enemies?.children?.iterate((enemy) => this.destroyEnemyBars(enemy))
    this.touchState.joystick?.destroy()
    if (this.unsubscribe) this.unsubscribe()
  }
}
