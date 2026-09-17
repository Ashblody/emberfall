import type { Rect, Vec2 } from './types';

export const WORLD_W = 2400;
export const WORLD_H = 1800;

/** Solid pillars / walls in the sandy ruin courtyard */
export const OBSTACLES: Rect[] = [
  { x: 380, y: 280, w: 90, h: 220 },
  { x: 900, y: 180, w: 140, h: 80 },
  { x: 1500, y: 320, w: 100, h: 260 },
  { x: 620, y: 900, w: 220, h: 70 },
  { x: 1200, y: 1100, w: 80, h: 280 },
  { x: 1800, y: 700, w: 160, h: 90 },
  { x: 200, y: 1400, w: 280, h: 70 },
  { x: 1700, y: 1400, w: 200, h: 100 },
  { x: 1050, y: 650, w: 120, h: 120 },
];

export const SPAWN_POINTS: Vec2[] = [
  { x: 500, y: 500 },
  { x: 1100, y: 400 },
  { x: 1700, y: 550 },
  { x: 400, y: 1200 },
  { x: 1400, y: 1300 },
  { x: 1900, y: 1100 },
  { x: 800, y: 1500 },
  { x: 1600, y: 900 },
];

export const ELITE_PACK_CENTER: Vec2 = { x: 1280, y: 820 };

export function circleHitsObstacle(x: number, y: number, r: number): boolean {
  for (const o of OBSTACLES) {
    const nx = Math.max(o.x, Math.min(x, o.x + o.w));
    const ny = Math.max(o.y, Math.min(y, o.y + o.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

export function clampToWorld(x: number, y: number, r: number): Vec2 {
  return {
    x: Math.max(r + 20, Math.min(WORLD_W - r - 20, x)),
    y: Math.max(r + 20, Math.min(WORLD_H - r - 20, y)),
  };
}

export function tryMove(x: number, y: number, dx: number, dy: number, r: number): Vec2 {
  let nx = x + dx;
  let ny = y + dy;
  const c = clampToWorld(nx, ny, r);
  nx = c.x;
  ny = c.y;
  if (!circleHitsObstacle(nx, ny, r)) return { x: nx, y: ny };
  if (!circleHitsObstacle(x + dx, y, r)) {
    const c2 = clampToWorld(x + dx, y, r);
    if (!circleHitsObstacle(c2.x, c2.y, r)) return c2;
  }
  if (!circleHitsObstacle(x, y + dy, r)) {
    const c3 = clampToWorld(x, y + dy, r);
    if (!circleHitsObstacle(c3.x, c3.y, r)) return c3;
  }
  return { x, y };
}
