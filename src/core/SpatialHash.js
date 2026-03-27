// Grid-based Spatial Hash — collision and range queries
// Implementation: Phase 1.1
export class SpatialHash {
  constructor(cellSize = 64) {
    this.cellSize = cellSize
    this.cells = new Map()
  }

  _key(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`
  }

  insert(eid, x, y) {
    const k = this._key(x, y)
    if (!this.cells.has(k)) this.cells.set(k, new Set())
    this.cells.get(k).add(eid)
  }

  query(x, y, radius) {
    const results = []
    const cr = Math.ceil(radius / this.cellSize)
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    for (let dx = -cr; dx <= cr; dx++) {
      for (let dy = -cr; dy <= cr; dy++) {
        const cell = this.cells.get(`${cx + dx},${cy + dy}`)
        if (cell) results.push(...cell)
      }
    }
    return results
  }

  clear() {
    this.cells.clear()
  }
}
