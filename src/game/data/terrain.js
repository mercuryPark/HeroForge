export function buildTerrainLayout(chapter, worldWidth, worldHeight) {
  const chapterBias = Math.max(0, chapter - 1)
  const centerX = worldWidth / 2
  const centerY = worldHeight / 2
  const offset = 70 + chapterBias * 6

  return {
    pathBands: [
      { x: centerX, y: centerY, width: worldWidth - 320, height: 132 },
      { x: centerX, y: centerY, width: 148, height: worldHeight - 260 },
    ],
    obstacleRects: [
      { x: centerX - 260, y: centerY - 170, width: 136, height: 94, radius: 26 },
      { x: centerX + 250, y: centerY + 165, width: 152, height: 108, radius: 28 },
      { x: centerX - 20, y: centerY - 285, width: 178, height: 76, radius: 22 },
      { x: centerX + 18, y: centerY + 290, width: 190, height: 82, radius: 22 },
    ],
    rockCircles: [
      { x: 250, y: 310, radius: 44 },
      { x: worldWidth - 240, y: worldHeight - 320, radius: 52 },
      { x: 310, y: worldHeight - 260, radius: 38 + chapterBias * 1.5 },
    ],
    hazardZones: [
      { x: centerX - 360, y: centerY + 110, radius: 96 + chapterBias * 2, dps: 5 + chapterBias, slow: 0.72, label: "가시 수렁" },
      { x: centerX + 330, y: centerY - 90, radius: 88 + chapterBias * 2, dps: 4 + chapterBias, slow: 0.78, label: "균열 지대" },
    ],
    blessingZones: [
      { x: centerX, y: centerY, radius: 82, atkMul: 1.1, regen: 0.012, label: "전투 성역" },
    ],
    decoClusters: [
      { x: centerX - 430, y: centerY - 270, radius: 72 },
      { x: centerX + 420, y: centerY + 240, radius: 80 },
      { x: centerX - 120, y: centerY + 360, radius: 62 },
      { x: centerX + 160, y: centerY - 360, radius: 66 },
    ],
    spawnSafeRadius: 108,
    center: { x: centerX, y: centerY + offset * 0.05 },
  }
}
