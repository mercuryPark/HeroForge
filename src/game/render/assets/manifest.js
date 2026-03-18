export const SPRITE_MANIFEST = {
  heroes: {
    warrior: {
      sheet: "/assets/reference/intersect/entities/warrior.png",
      bodyVariants: {
        common: "/assets/reference/intersect/paperdolls/warrior_body_common.png",
        rare: "/assets/reference/intersect/paperdolls/warrior_body_rare.png",
        legendary: "/assets/reference/intersect/paperdolls/warrior_body_legendary.png",
      },
      helmetVariants: {
        common: "/assets/reference/intersect/paperdolls/warrior_helmet_common.png",
        rare: "/assets/reference/intersect/paperdolls/warrior_helmet_rare.png",
        legendary: "/assets/reference/intersect/paperdolls/warrior_helmet_legendary.png",
      },
      weaponVariants: {
        common: "/assets/reference/intersect/items/warrior_weapon_common.png",
        rare: "/assets/reference/intersect/items/warrior_weapon_rare.png",
        legendary: "/assets/reference/intersect/items/warrior_weapon_legendary.png",
      },
      frameWidth: 32,
      frameHeight: 48,
      idleFrame: 0,
      runFrames: [4, 5, 6, 7],
      weaponOffset: { x: 14, y: 8 },
    },
    mage: {
      sheet: "/assets/reference/intersect/entities/mage.png",
      bodyVariants: {
        common: "/assets/reference/intersect/paperdolls/mage_body_common.png",
        rare: "/assets/reference/intersect/paperdolls/mage_body_rare.png",
        legendary: "/assets/reference/intersect/paperdolls/mage_body_legendary.png",
      },
      helmetVariants: {
        common: "/assets/reference/intersect/paperdolls/mage_helmet_common.png",
        rare: "/assets/reference/intersect/paperdolls/mage_helmet_rare.png",
        legendary: "/assets/reference/intersect/paperdolls/mage_helmet_legendary.png",
      },
      weaponVariants: {
        common: "/assets/reference/intersect/items/mage_weapon_common.png",
        rare: "/assets/reference/intersect/items/mage_weapon_rare.png",
        legendary: "/assets/reference/intersect/items/mage_weapon_legendary.png",
      },
      frameWidth: 32,
      frameHeight: 48,
      idleFrame: 0,
      runFrames: [4, 5, 6, 7],
      weaponOffset: { x: 12, y: 2 },
    },
    archer: {
      sheet: "/assets/reference/intersect/entities/archer.png",
      bodyVariants: {
        common: "/assets/reference/intersect/paperdolls/archer_body_common.png",
        rare: "/assets/reference/intersect/paperdolls/archer_body_rare.png",
        legendary: "/assets/reference/intersect/paperdolls/archer_body_legendary.png",
      },
      helmetVariants: {
        common: "/assets/reference/intersect/paperdolls/archer_helmet_common.png",
        rare: "/assets/reference/intersect/paperdolls/archer_helmet_rare.png",
        legendary: "/assets/reference/intersect/paperdolls/archer_helmet_legendary.png",
      },
      weaponVariants: {
        common: "/assets/reference/intersect/items/archer_weapon_common.png",
        rare: "/assets/reference/intersect/items/archer_weapon_rare.png",
        legendary: "/assets/reference/intersect/items/archer_weapon_legendary.png",
      },
      frameWidth: 32,
      frameHeight: 48,
      idleFrame: 0,
      runFrames: [4, 5, 6, 7],
      weaponOffset: { x: 15, y: 6 },
    },
    thief: {
      sheet: "/assets/reference/intersect/entities/thief.png",
      bodyVariants: {
        common: "/assets/reference/intersect/paperdolls/thief_body_common.png",
        rare: "/assets/reference/intersect/paperdolls/thief_body_rare.png",
        legendary: "/assets/reference/intersect/paperdolls/thief_body_legendary.png",
      },
      helmetVariants: {
        common: "/assets/reference/intersect/paperdolls/thief_helmet_common.png",
        rare: "/assets/reference/intersect/paperdolls/thief_helmet_rare.png",
        legendary: "/assets/reference/intersect/paperdolls/thief_helmet_legendary.png",
      },
      weaponVariants: {
        common: "/assets/reference/intersect/items/thief_weapon_common.png",
        rare: "/assets/reference/intersect/items/thief_weapon_rare.png",
        legendary: "/assets/reference/intersect/items/thief_weapon_legendary.png",
      },
      frameWidth: 32,
      frameHeight: 48,
      idleFrame: 0,
      runFrames: [4, 5, 6, 7],
      weaponOffset: { x: 13, y: 7 },
    },
  },
  enemies: {
    slime: {
      sheet: "/assets/reference/intersect/entities/slime.png",
      frameWidth: 32,
      frameHeight: 32,
      idleFrames: [0, 1, 2, 3],
      moveFrames: [4, 5, 6, 7],
    },
    bat: {
      sheet: "/assets/reference/intersect/entities/bat.png",
      frameWidth: 48,
      frameHeight: 48,
      idleFrames: [0, 1, 2, 3],
      moveFrames: [4, 5, 6, 7],
    },
    golem: {
      sheet: "/assets/reference/intersect/entities/golem.png",
      frameWidth: 64,
      frameHeight: 64,
      idleFrames: [0, 1, 2, 3],
      moveFrames: [4, 5, 6, 7],
    },
    boss: {
      sheet: "/assets/reference/intersect/entities/boss.png",
      frameWidth: 64,
      frameHeight: 64,
      idleFrames: [0, 1, 2, 3],
      moveFrames: [4, 5, 6, 7],
    },
  },
  fx: {
    projectile: {
      sheet: "/assets/reference/intersect/spells/fire_projectile.png",
      width: 32,
      height: 32,
    },
    slashing: {
      sheet: "/assets/reference/intersect/animations/slashing.png",
      frameWidth: 64,
      frameHeight: 64,
      frames: 10,
    },
    healing: {
      sheet: "/assets/reference/intersect/animations/healing.png",
      frameWidth: 32,
      frameHeight: 32,
      frames: 16,
    },
    strike: {
      sheet: "/assets/reference/intersect/animations/strike.png",
      frameWidth: 64,
      frameHeight: 64,
      frames: 6,
    },
    rings: {
      sheet: "/assets/reference/intersect/animations/rings.png",
      frameWidth: 32,
      frameHeight: 32,
      frames: 9,
    },
  },
}

export function heroTextureKey(classId, state) {
  return `hero-${classId}-${state}`
}
