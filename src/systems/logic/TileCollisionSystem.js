/**
 * TileCollisionSystem — AABB vs tilemap collision resolution.
 *
 * Factory function: call createTileCollisionSystem(grid, tileSize) to produce
 * a system function bound to a specific collision grid.
 *
 * Collision grid values:
 *   0 = empty
 *   1 = solid (blocks from all sides)
 *   2 = one-way platform (blocks only when falling from above)
 */
import { query, hasComponent, addComponent, removeComponent } from 'bitecs'
import { Position, Velocity } from '@components/transform'
import { Collider, Grounded, OnPlatform, OnLadder } from '@components/physics'
import { Input } from './InputSystem'

/**
 * Read a tile from the collision grid with bounds checking.
 * @param {number[][]} grid - 2D collision grid [row][col]
 * @param {number} row
 * @param {number} col
 * @returns {number} tile value (0 if out of bounds)
 */
function getTile(grid, row, col) {
  if (!grid || row < 0 || col < 0 || row >= grid.length || !grid[row] || col >= grid[row].length) {
    return 0
  }
  return grid[row][col]
}

/**
 * @param {number[][]} collisionGrid - 2D array where 1=solid, 2=one-way-platform
 * @param {number} tileSize - pixel size of each tile after scaling
 * @returns {function} TileCollisionSystem(world) -> world
 */
export function createTileCollisionSystem(collisionGrid, tileSize) {

  return function TileCollisionSystem(world) {
    const ents = query(world, [Position, Velocity, Collider])

    for (let i = 0; i < ents.length; i++) {
      const eid = ents[i]
      const vx = Velocity.x[eid]
      const vy = Velocity.y[eid]
      const cw = Collider.width[eid]
      const ch = Collider.height[eid]
      const ox = Collider.offsetX[eid]
      const oy = Collider.offsetY[eid]

      let grounded = false

      // --- Y-axis resolution (vertical first) ---

      if (vy > 0) {
        // Falling: check tiles at the bottom edge
        const bottom = Position.y[eid] + oy + ch
        const tileBottom = Math.floor((bottom - 1) / tileSize)
        const tileLeft = Math.floor((Position.x[eid] + ox) / tileSize)
        const tileRight = Math.floor((Position.x[eid] + ox + cw - 1) / tileSize)

        for (let tx = tileLeft; tx <= tileRight; tx++) {
          const tile = getTile(collisionGrid, tileBottom, tx)
          if (tile === 1 || tile === 2) {
            // Snap entity so its collider bottom rests on top of the tile
            const tileTopY = tileBottom * tileSize
            Position.y[eid] = tileTopY - oy - ch
            Velocity.y[eid] = 0
            grounded = true

            if (tile === 2) {
              if (!hasComponent(world, eid, OnPlatform)) addComponent(world, eid, OnPlatform)
              OnPlatform.platformY[eid] = tileTopY
            }
            break
          }
        }
      } else if (vy < 0) {
        // Rising: check tiles at the top edge (solid only, ignore one-way platforms)
        const top = Position.y[eid] + oy
        const tileTop = Math.floor(top / tileSize)
        const tileLeft = Math.floor((Position.x[eid] + ox) / tileSize)
        const tileRight = Math.floor((Position.x[eid] + ox + cw - 1) / tileSize)

        for (let tx = tileLeft; tx <= tileRight; tx++) {
          if (getTile(collisionGrid, tileTop, tx) === 1) {
            Position.y[eid] = (tileTop + 1) * tileSize - oy
            Velocity.y[eid] = 0
            break
          }
        }
      }

      // --- X-axis resolution (after Y so vertical snap is settled) ---

      const newLeft = Position.x[eid] + ox
      const newRight = Position.x[eid] + ox + cw
      const ntTop = Math.floor((Position.y[eid] + oy) / tileSize)
      const ntBottom = Math.floor((Position.y[eid] + oy + ch - 1) / tileSize)

      if (vx > 0) {
        const checkCol = Math.floor((newRight - 1) / tileSize)
        for (let ty = ntTop; ty <= ntBottom; ty++) {
          if (getTile(collisionGrid, ty, checkCol) === 1) {
            Position.x[eid] = checkCol * tileSize - ox - cw
            Velocity.x[eid] = 0
            break
          }
        }
      } else if (vx < 0) {
        const checkCol = Math.floor(newLeft / tileSize)
        for (let ty = ntTop; ty <= ntBottom; ty++) {
          if (getTile(collisionGrid, ty, checkCol) === 1) {
            Position.x[eid] = (checkCol + 1) * tileSize - ox
            Velocity.x[eid] = 0
            break
          }
        }
      }

      // --- Ladder detection (grid value 3) ---
      const centerX = Math.floor((Position.x[eid] + ox + cw / 2) / tileSize)
      const centerY = Math.floor((Position.y[eid] + oy + ch / 2) / tileSize)
      const onLadderTile = getTile(collisionGrid, centerY, centerX) === 3

      if (onLadderTile && (Input.up || Input.down)) {
        if (!hasComponent(world, eid, OnLadder)) addComponent(world, eid, OnLadder)
        // Disable gravity, allow vertical movement
        Velocity.y[eid] = Input.up ? -120 : Input.down ? 120 : 0
        Velocity.x[eid] = 0
        grounded = false
      } else if (hasComponent(world, eid, OnLadder) && !onLadderTile) {
        removeComponent(world, eid, OnLadder)
      }

      // --- Platform dropdown (Down + Jump on one-way platform) ---
      if (Input.down && Input.jump && hasComponent(world, eid, OnPlatform)) {
        // Drop through: push entity below platform
        Position.y[eid] += 2
        Velocity.y[eid] = 50
        grounded = false
        removeComponent(world, eid, OnPlatform)
        if (hasComponent(world, eid, Grounded)) removeComponent(world, eid, Grounded)
      }

      // --- Update Grounded tag ---
      if (grounded) {
        if (!hasComponent(world, eid, Grounded)) addComponent(world, eid, Grounded)
      } else {
        if (hasComponent(world, eid, Grounded)) removeComponent(world, eid, Grounded)
        if (hasComponent(world, eid, OnPlatform)) removeComponent(world, eid, OnPlatform)
      }
    }

    return world
  }
}
