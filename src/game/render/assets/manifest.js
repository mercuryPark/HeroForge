export const SPRITE_MANIFEST = {
  heroes: {
    warrior: {
      idle: "/assets/sprites/heroes/warrior_idle.svg",
      run: "/assets/sprites/heroes/warrior_run.svg",
    },
    mage: {
      idle: "/assets/sprites/heroes/mage_idle.svg",
      run: "/assets/sprites/heroes/mage_run.svg",
    },
    archer: {
      idle: "/assets/sprites/heroes/archer_idle.svg",
      run: "/assets/sprites/heroes/archer_run.svg",
    },
    thief: {
      idle: "/assets/sprites/heroes/thief_idle.svg",
      run: "/assets/sprites/heroes/thief_run.svg",
    },
  },
  enemies: {
    slimeIdle: "/assets/sprites/enemies/slime_idle.svg",
    slimeMove: "/assets/sprites/enemies/slime_move.svg",
    golemIdle: "/assets/sprites/enemies/golem_idle.svg",
    golemMove: "/assets/sprites/enemies/golem_move.svg",
    batIdle: "/assets/sprites/enemies/bat_idle.svg",
    batMove: "/assets/sprites/enemies/bat_move.svg",
    bossIdle: "/assets/sprites/enemies/boss_idle.svg",
  },
  fx: {
    projectile: "/assets/sprites/fx/projectile.svg",
  },
}

export function heroTextureKey(classId, state) {
  return `hero-${classId}-${state}`
}
