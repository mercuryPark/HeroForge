// Generic Object Pool — zero GC in hot paths
// Implementation: Phase 1.1
export class ObjectPool {
  constructor(factory, initialSize = 50) {
    this.pool = []
    this.factory = factory
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory())
    }
  }

  acquire() {
    return this.pool.pop() ?? this.factory()
  }

  release(obj) {
    this.pool.push(obj)
  }

  get size() {
    return this.pool.length
  }
}
