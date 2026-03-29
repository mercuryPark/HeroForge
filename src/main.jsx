import { Application } from 'pixi.js'
import { addComponent, addEntity } from 'bitecs'
import { render } from 'preact'
import { App } from './ui/App'
import { createGameWorld } from '@core/World'
import { createGameLoop } from '@core/GameLoop'
import { SpatialHash } from '@core/SpatialHash'
import { EventBus } from '@core/EventBus'
import { SaveManager } from '@core/SaveManager'
import { SPATIAL_CELL_SIZE, GRAVITY, PIXEL } from '@data/constants'
import { createWorldContainer } from '@render/PixiApp'
import { createTilemap } from '@render/TilemapRenderer'
import { createSprite } from '@render/SpriteFactory'
import { createCameraSystem } from '@systems/render/CameraSystem'
import { createParallaxSystem } from '@systems/render/ParallaxSystem'
import { SpriteSystem } from '@systems/render/SpriteSystem'
import { AnimationSystem } from '@systems/render/AnimationSystem'
import { createTileCollisionSystem } from '@systems/logic/TileCollisionSystem'
import { InputSystem } from '@systems/logic/InputSystem'
import { PhysicsSystem } from '@systems/logic/PhysicsSystem'
import { AISystem } from '@systems/logic/AISystem'
import { CombatSystem } from '@systems/logic/CombatSystem'
import { spawnMonster, SpawnSystem } from '@systems/logic/SpawnSystem'
import { createLootSystem } from '@systems/logic/LootSystem'
import { createGrowthSystem } from '@systems/logic/GrowthSystem'
import { UIBridgeSystem } from '@systems/render/UIBridgeSystem'
import { addLootPopup } from '@ui/hud/LootCounter'
import { createDamageNumberSystem } from '@systems/render/DamageNumberSystem'
import { createEffectsSystem } from '@systems/render/EffectsSystem'
import { createParticleSystem } from '@systems/render/ParticleSystem'
import { Position, PrevPosition, Velocity } from '@components/transform'
import { Gravity as GravityComp, Collider } from '@components/physics'
import { PlayerTag, Level, Job, StatAllocation, AdvancementQuest } from '@components/character'
import { WeaponSlot } from '@components/weapon'
import { WarriorPower, AbilityOption } from '@components/warrior'
import { SkillSlot, MasteryProgress } from '@components/skill'
import { SkillCooldownSystem } from '@systems/meta/SkillSystem'
import { Stats, Combat } from '@components/combat'
import { AnimState } from '@components/sprite'
import { loadAtlases } from '@render/AtlasLoader'
import { buildNavGraph } from '@core/NavGraph'
import './index.css'

const SCREEN_W = 1280
const SCREEN_H = 720

async function boot() {
  // 1. Create ECS world
  const world = createGameWorld()

  // 2. Attach shared services
  world.spatialHash = new SpatialHash(SPATIAL_CELL_SIZE)
  world.eventBus = new EventBus()

  // 3. PixiJS v8 async init
  const pixiApp = new Application()
  await pixiApp.init({
    width: SCREEN_W,
    height: SCREEN_H,
    background: '#1a1a2e',
    antialias: false,
    preference: 'webgl',
  })
  document.getElementById('game-canvas').appendChild(pixiApp.canvas)
  world.pixiApp = pixiApp

  // 4. Set up rendering layers
  const { bgContainer, worldContainer, uiContainer } = createWorldContainer(pixiApp)
  world.containers = { bg: bgContainer, world: worldContainer, ui: uiContainer }

  // 4.5. Load sprite atlases
  await loadAtlases()

  // 5. Generate tilemap
  const tilemap = createTilemap(worldContainer)
  world.tilemap = tilemap

  // 5.5. Build navigation graph for platform-aware AI pathfinding
  world.navGraph = buildNavGraph(tilemap.grid, tilemap.tileSize)

  // 6. Create systems
  const tileCollisionSystem = createTileCollisionSystem(tilemap.grid, tilemap.tileSize)
  const cameraSystem = createCameraSystem(worldContainer, tilemap.width, tilemap.height, SCREEN_W, SCREEN_H, world.eventBus)
  const parallaxSystem = createParallaxSystem(bgContainer, SCREEN_W, SCREEN_H)
  const lootSystem = createLootSystem()
  lootSystem.init(world)
  world.playerState = lootSystem.playerState

  const growthSystem = createGrowthSystem()
  growthSystem.init(world)

  // Bridge loot events to UI popups
  world.eventBus.on('loot:drop', (e) => {
    if (e.gold > 0) addLootPopup('gold', e.gold)
    if (e.exp > 0) addLootPopup('exp', e.exp)
  })

  const damageNumberSystem = createDamageNumberSystem(worldContainer, world.eventBus)
  const effectsSystem = createEffectsSystem(worldContainer, world.eventBus)
  const particleSystem = createParticleSystem(worldContainer, uiContainer, world.eventBus)

  // 7. Create game loop and register systems
  const gameLoop = createGameLoop(world)

  // Logic pipeline (fixed timestep)
  gameLoop.addLogicSystem(InputSystem)
  gameLoop.addLogicSystem(AISystem)
  gameLoop.addLogicSystem(PhysicsSystem)
  gameLoop.addLogicSystem(tileCollisionSystem)
  gameLoop.addLogicSystem(CombatSystem)
  gameLoop.addLogicSystem(SpawnSystem)
  gameLoop.addLogicSystem(lootSystem.system)
  gameLoop.addLogicSystem(growthSystem.system)
  gameLoop.addLogicSystem(SkillCooldownSystem)

  // Render pipeline (display refresh rate)
  gameLoop.addRenderSystem(UIBridgeSystem)
  gameLoop.addRenderSystem(SpriteSystem)
  gameLoop.addRenderSystem(AnimationSystem)
  gameLoop.addRenderSystem(cameraSystem)
  gameLoop.addRenderSystem(parallaxSystem)
  gameLoop.addRenderSystem(damageNumberSystem)
  gameLoop.addRenderSystem(effectsSystem)
  gameLoop.addRenderSystem(particleSystem)

  // 8. Spawn player entity
  const playerEid = addEntity(world)
  addComponent(world, playerEid, Position)
  addComponent(world, playerEid, PrevPosition)
  addComponent(world, playerEid, Velocity)
  addComponent(world, playerEid, GravityComp)
  addComponent(world, playerEid, Collider)
  addComponent(world, playerEid, PlayerTag)

  Position.x[playerEid] = tilemap.spawnPoints.player.x
  Position.y[playerEid] = tilemap.spawnPoints.player.y
  PrevPosition.x[playerEid] = tilemap.spawnPoints.player.x
  PrevPosition.y[playerEid] = tilemap.spawnPoints.player.y
  Velocity.x[playerEid] = 0
  Velocity.y[playerEid] = 0
  GravityComp.value[playerEid] = GRAVITY
  Collider.width[playerEid] = PIXEL.CHAR_SIZE
  Collider.height[playerEid] = PIXEL.CHAR_SIZE
  Collider.offsetX[playerEid] = 0
  Collider.offsetY[playerEid] = 0

  // Stats will be initialized by GrowthSystem.applyJob() when job is selected
  addComponent(world, playerEid, Stats)

  // Job, stat allocation, and advancement quest — populated on job selection
  addComponent(world, playerEid, Job)
  addComponent(world, playerEid, StatAllocation)
  addComponent(world, playerEid, AdvancementQuest)
  addComponent(world, playerEid, WeaponSlot)
  addComponent(world, playerEid, WarriorPower)
  addComponent(world, playerEid, AbilityOption)
  addComponent(world, playerEid, SkillSlot)
  addComponent(world, playerEid, MasteryProgress)

  addComponent(world, playerEid, Combat)
  Combat.target[playerEid] = 0
  Combat.attackTimer[playerEid] = 0
  Combat.attackRange[playerEid] = 50

  addComponent(world, playerEid, Level)
  Level.current[playerEid] = 1
  Level.xp[playerEid] = 0
  Level.xpToNext[playerEid] = 100

  addComponent(world, playerEid, AnimState)
  AnimState.current[playerEid] = 0
  AnimState.speed[playerEid] = 8
  AnimState.loop[playerEid] = 1
  AnimState.flipX[playerEid] = 0

  createSprite(worldContainer, playerEid, 'player', 0)

  world.playerEid = playerEid

  // 10.5. Initialize SaveManager and wire auto-save
  const saveManager = new SaveManager()
  await saveManager.init()

  // Auto-save every 30s
  saveManager.startAutoSave(async () => {
    await saveManager.save('main', saveManager.serializeState(world, lootSystem.playerState))
  })

  // 9. Spawn monsters at tilemap spawn points
  tilemap.spawnPoints.monsters.forEach((sp, i) => {
    const mid = spawnMonster(world, sp.x, sp.y, i % 5)
    createSprite(worldContainer, mid, 'monster', i % 5)
  })

  // 10. Mount Preact UI — game loop started by App after job selection or continue
  render(<App pixiApp={pixiApp} world={world} gameLoop={gameLoop} playerState={lootSystem.playerState} saveManager={saveManager} growthSystem={growthSystem} />, document.getElementById('ui-root'))
}

boot().catch(console.error)
