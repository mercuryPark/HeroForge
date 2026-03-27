/**
 * NavGraph — Platform-based navigation graph for 2D platformer pathfinding.
 *
 * Builds a graph of platform nodes from the collision grid and connects them
 * with walk, fall, and jump edges so monsters can navigate between platforms.
 *
 * Grid values: 0=empty, 1=solid, 2=oneway
 * Coordinates: pixel-space, y increases downward.
 */

// Jump physics heuristics (matches TileCollisionSystem + PhysicsSystem)
const JUMP_VELOCITY = -400   // px/s, upward
const GRAVITY_ACCEL = 980    // px/s²

// Derived max jump height: v² = v0² + 2*a*h → h = v0²/(2*g)
const MAX_JUMP_HEIGHT_PX = Math.ceil((JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY_ACCEL))
// Max time to apex: t = |v0|/g; total air time = 2t
const JUMP_APEX_TIME = Math.abs(JUMP_VELOCITY) / GRAVITY_ACCEL
// Horizontal reach during full jump arc (using monster speed ~105 px/s)
const JUMP_HORIZ_REACH_PX = 192  // ~6 tiles at 32px

// Walk edge: allow crossing a gap of at most this many tiles
const MAX_WALK_GAP_TILES = 2

/**
 * @typedef {{ id: number, row: number, colStart: number, colEnd: number, type: 'solid'|'oneway',
 *             xMin: number, xMax: number, yTop: number }} PlatformNode
 * @typedef {{ from: number, to: number, action: 'walk'|'jump'|'fall',
 *             takeoffX: number, landX: number }} NavEdge
 * @typedef {{ nodes: PlatformNode[], edges: NavEdge[][] }} NavGraph
 */

/**
 * Build the navigation graph from a collision grid.
 * @param {Uint8Array[]} grid - grid[row][col] = 0|1|2
 * @param {number} tileSize   - pixel size per tile (e.g. 32)
 * @returns {NavGraph}
 */
export function buildNavGraph(grid, tileSize) {
  const rows = grid.length
  const cols = grid[0].length

  // --- Step 1: Extract platform nodes (contiguous solid/oneway runs per row) ---
  const nodes = []
  let idCounter = 0

  for (let row = 0; row < rows; row++) {
    let col = 0
    while (col < cols) {
      const val = grid[row][col]
      if (val === 0) { col++; continue }

      // Start of a run
      const runStart = col
      const runType = val === 1 ? 'solid' : 'oneway'
      while (col < cols && grid[row][col] !== 0) col++

      const runEnd = col - 1 // inclusive

      // Only register as a platform if the row ABOVE the run has at least one
      // empty cell (entities can stand on it). For the bottom of the map this
      // is always fine; skip purely internal/underground solid blocks.
      let hasStandable = false
      if (row === 0) {
        hasStandable = true
      } else {
        for (let c = runStart; c <= runEnd; c++) {
          if (grid[row - 1][c] === 0) { hasStandable = true; break }
        }
      }
      if (!hasStandable) continue

      nodes.push({
        id: idCounter++,
        row,
        colStart: runStart,
        colEnd: runEnd,
        type: runType,
        xMin: runStart * tileSize,
        xMax: (runEnd + 1) * tileSize,
        yTop: row * tileSize,       // top edge of the tile row
        yStand: row * tileSize,     // y at which entities stand (top of tile)
      })
    }
  }

  // --- Step 2: Build adjacency list of edges ---
  /** @type {NavEdge[][]} */
  const edges = Array.from({ length: nodes.length }, () => [])

  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue
      const a = nodes[i]
      const b = nodes[j]

      const vertDiff = b.yStand - a.yStand  // positive = b is below a

      // ---- Walk edge: same row, small gap ----
      if (a.row === b.row) {
        const gapLeft  = Math.max(0, b.colStart - a.colEnd - 1)
        const gapRight = Math.max(0, a.colStart - b.colEnd - 1)
        const gap = Math.min(gapLeft, gapRight)
        if (gap <= MAX_WALK_GAP_TILES) {
          const takeoffX = a.colEnd < b.colStart
            ? a.xMax - tileSize * 0.5
            : a.xMin + tileSize * 0.5
          const landX = a.colEnd < b.colStart
            ? b.xMin + tileSize * 0.5
            : b.xMax - tileSize * 0.5
          edges[i].push({ from: i, to: j, action: 'walk', takeoffX, landX })
        }
        continue
      }

      // ---- Fall edge: b is below a, horizontally overlapping or close ----
      if (vertDiff > 0) {
        const horizOverlap = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin)
        const horizGap = horizOverlap >= 0
          ? 0
          : Math.min(
              Math.abs(b.xMin - a.xMax),
              Math.abs(a.xMin - b.xMax)
            )

        if (horizGap <= JUMP_HORIZ_REACH_PX) {
          // Pick a takeoff point on a's edge closest to b
          const takeoffX = _clamp(
            (a.xMin + a.xMax) / 2,
            a.xMin + tileSize * 0.5,
            a.xMax - tileSize * 0.5
          )
          const landX = _clamp(
            takeoffX,
            b.xMin + tileSize * 0.5,
            b.xMax - tileSize * 0.5
          )
          edges[i].push({ from: i, to: j, action: 'fall', takeoffX, landX })
        }
        continue
      }

      // ---- Jump edge: b is above a, reachable by jump ----
      if (vertDiff < 0) {
        const heightNeeded = -vertDiff  // positive pixels to clear
        if (heightNeeded > MAX_JUMP_HEIGHT_PX) continue

        const horizOverlap = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin)
        const horizGap = horizOverlap >= 0
          ? 0
          : Math.min(
              Math.abs(b.xMin - a.xMax),
              Math.abs(a.xMin - b.xMax)
            )

        if (horizGap > JUMP_HORIZ_REACH_PX) continue

        const takeoffX = _clamp(
          (a.xMin + a.xMax) / 2,
          a.xMin + tileSize * 0.5,
          a.xMax - tileSize * 0.5
        )
        const landX = _clamp(
          takeoffX,
          b.xMin + tileSize * 0.5,
          b.xMax - tileSize * 0.5
        )
        edges[i].push({ from: i, to: j, action: 'jump', takeoffX, landX })
      }
    }
  }

  return { nodes, edges, tileSize }
}

/**
 * Find which platform node a given world position is standing on.
 * Checks if (x, y) is within the horizontal span of a platform node,
 * and y is within one tile's height above the platform top.
 * @param {NavGraph} navGraph
 * @param {number} x
 * @param {number} y
 * @returns {PlatformNode|null}
 */
export function findPlatformAt(navGraph, x, y) {
  const { nodes, tileSize } = navGraph
  let best = null
  let bestDist = Infinity

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (x < n.xMin || x > n.xMax) continue

    // Entity stands on platform if its feet (y) are just at or above yStand
    const dist = Math.abs(y - n.yStand)
    if (dist < tileSize * 1.5 && dist < bestDist) {
      bestDist = dist
      best = n
    }
  }
  return best
}

/**
 * BFS pathfinding between two world positions via the nav graph.
 * @param {NavGraph} navGraph
 * @param {number} startX
 * @param {number} startY
 * @param {number} targetX
 * @param {number} targetY
 * @returns {{ x: number, y: number, action: 'walk'|'jump'|'fall' }[]|null}
 */
export function findPath(navGraph, startX, startY, targetX, targetY) {
  const { nodes, edges } = navGraph

  const startNode = findPlatformAt(navGraph, startX, startY)
  const targetNode = findPlatformAt(navGraph, targetX, targetY)

  if (!startNode || !targetNode) return null
  if (startNode.id === targetNode.id) return []  // already on same platform

  // BFS
  const visited = new Uint8Array(nodes.length)
  const prev = new Int32Array(nodes.length).fill(-1)
  const prevEdge = new Array(nodes.length).fill(null)
  const queue = [startNode.id]
  visited[startNode.id] = 1

  let found = false
  outer: while (queue.length > 0) {
    const cur = queue.shift()
    for (const edge of edges[cur]) {
      const nb = edge.to
      if (visited[nb]) continue
      visited[nb] = 1
      prev[nb] = cur
      prevEdge[nb] = edge
      if (nb === targetNode.id) { found = true; break outer }
      queue.push(nb)
    }
  }

  if (!found) return null

  // Reconstruct path
  const path = []
  let cur = targetNode.id
  while (cur !== startNode.id) {
    const edge = prevEdge[cur]
    const node = nodes[cur]
    path.unshift({
      x: edge.landX,
      y: node.yStand,
      action: edge.action,
      platformId: node.id,
    })
    cur = prev[cur]
  }

  return path
}

// --- Helpers ---

function _clamp(val, min, max) {
  return val < min ? min : val > max ? max : val
}
