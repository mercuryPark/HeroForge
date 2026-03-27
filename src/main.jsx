import { Application } from 'pixi.js'
import { addComponent, addEntity } from 'bitecs'
import { render } from 'preact'
import { App } from './ui/App'
import { createGameWorld } from '@core/World'
import { createGameLoop } from '@core/GameLoop'
import { SpatialHash } from '@core/SpatialHash'
import { EventBus } from '@core/EventBus'
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
import { UIBridgeSystem } from '@systems/logic/UIBridgeSystem'
import { createDamageNumberSystem } from '@systems/render/DamageNumberSystem'
import { Position, PrevPosition, Velocity } from '@components/transform'
import { Gravity as GravityComp, Collider } from '@components/physics'
import { PlayerTag, Level } from '@components/character'
import { Stats, Combat } from '@components/combat'
import { AnimState } from '@components/sprite'
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

  // 5. Generate tilemap
  const tilemap = createTilemap(worldContainer)
  world.tilemap = tilemap

  // 6. Create systems
  const tileCollisionSystem = createTileCollisionSystem(tilemap.grid, tilemap.tileSize)
  const cameraSystem = createCameraSystem(worldContainer, tilemap.width, tilemap.height, SCREEN_W, SCREEN_H)
  const parallaxSystem = createParallaxSystem(bgContainer, SCREEN_W, SCREEN_H)
  const lootSystem = createLootSystem()
  lootSystem.init(world)
  world.playerState = lootSystem.playerState

  const damageNumberSystem = createDamageNumberSystem(worldContainer, world.eventBus)

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
  gameLoop.addLogicSystem(UIBridgeSystem)

  // Render pipeline (display refresh rate)
  gameLoop.addRenderSystem(SpriteSystem)
  gameLoop.addRenderSystem(AnimationSystem)
  gameLoop.addRenderSystem(cameraSystem)
  gameLoop.addRenderSystem(parallaxSystem)
  gameLoop.addRenderSystem(damageNumberSystem)

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

  addComponent(world, playerEid, Stats)
  Stats.hp[playerEid] = 500
  Stats.maxHp[playerEid] = 500
  Stats.mp[playerEid] = 100
  Stats.maxMp[playerEid] = 100
  Stats.atk[playerEid] = 50
  Stats.def[playerEid] = 10
  Stats.critRate[playerEid] = 15
  Stats.critDmg[playerEid] = 1.5
  Stats.atkSpeed[playerEid] = 100
  Stats.accuracy[playerEid] = 80
  Stats.evasion[playerEid] = 10

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

  createSprite(worldContainer, playerEid, 'player')

  world.playerEid = playerEid

  // 9. Spawn monsters at tilemap spawn points
  tilemap.spawnPoints.monsters.forEach((sp, i) => {
    const mid = spawnMonster(world, sp.x, sp.y, i % 5)
    createSprite(worldContainer, mid, 'monster')
  })

  // 10. Mount Preact UI
  render(<App pixiApp={pixiApp} world={world} gameLoop={gameLoop} playerState={lootSystem.playerState} />, document.getElementById('ui-root'))

  // 11. Start game loop
  gameLoop.start()
}

boot().catch(console.error)
