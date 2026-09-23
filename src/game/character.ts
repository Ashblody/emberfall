/** Ashblade + enemies — concept sprites with procedural Canvas fallback. */

import { getArt } from './artAssets';

export interface PlayerDrawState {
  facing: number;
  moving: boolean;
  walkPhase: number;
  /** 0 = idle, 1 = mid-swing peak */
  attackT: number;
  attackKind: 'none' | 'basic' | 'spiral' | 'ashwake';
  invuln: number;
  time: number;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function oval(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function limb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  fill: string,
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const hw = w / 2;
  const fillHex = fill.startsWith('#') ? fill : '#4a3020';
  ctx.beginPath();
  ctx.moveTo(x0 + nx * hw, y0 + ny * hw);
  ctx.lineTo(x1 + nx * hw * 0.7, y1 + ny * hw * 0.7);
  ctx.lineTo(x1 - nx * hw * 0.7, y1 - ny * hw * 0.7);
  ctx.lineTo(x0 - nx * hw, y0 - ny * hw);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  oval(ctx, x0, y0, w * 0.55, w * 0.45, shade(fillHex, 12));
  oval(ctx, x1, y1, w * 0.48, w * 0.4, shade(fillHex, -10));
}

function imgOk(img: HTMLImageElement | null | undefined): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0;
}

/**
 * Draw Ashblade using concept front sprite (flip by facing).
 * Falls back to procedural limbs if the image is missing.
 */
export function drawAshblade(ctx: CanvasRenderingContext2D, s: PlayerDrawState) {
  const art = getArt();
  const sprite = imgOk(art.heroFront)
    ? art.heroFront
    : imgOk(art.heroSide)
      ? art.heroSide
      : null;
  if (sprite) {
    drawAshbladeSprite(ctx, s, sprite);
  } else {
    drawAshbladeProcedural(ctx, s);
  }
}

function drawAshbladeSprite(ctx: CanvasRenderingContext2D, s: PlayerDrawState, sprite: HTMLImageElement) {
  const bob = s.moving ? Math.sin(s.walkPhase * 2) * 2.4 : Math.sin(s.time * 3) * 0.7;
  const attackPulse =
    s.attackT > 0 ? 1 + Math.sin(Math.min(1, s.attackT) * Math.PI) * 0.12 : 1;
  const faceFlip = Math.cos(s.facing) < 0 ? -1 : 1;

  // Ground shadow
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#1a0a04';
  ctx.beginPath();
  ctx.ellipse(0, 14, 16 + (s.moving ? 2 : 0), 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(0, bob);
  if (s.invuln > 0) {
    ctx.globalAlpha = 0.45 + 0.55 * Math.sin(s.time * 28);
  }

  // Keep upright; flip for left/right facing (phone-readable concept art)
  ctx.scale(faceFlip * attackPulse, attackPulse);

  const drawH = 68;
  const scale = drawH / sprite.naturalHeight;
  const drawW = sprite.naturalWidth * scale;
  // Feet near y≈14 so shadow sits under boots
  ctx.drawImage(sprite, -drawW / 2, -drawH + 16, drawW, drawH);

  // Attack arc hint (sprite has no swing frames)
  if (s.attackT > 0.12 && s.attackT < 0.85) {
    const t = s.attackT;
    const a = faceFlip > 0 ? -0.4 : Math.PI + 0.4;
    ctx.strokeStyle = `rgba(255,170,60,${0.55 * (1 - t)})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, -8, 28 + t * 8, a - 1.1, a + 0.5);
    ctx.stroke();
  }
  if (s.attackKind === 'spiral' && s.attackT > 0) {
    ctx.strokeStyle = `rgba(255,120,40,${0.45 * (1 - s.attackT)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -4, 20 + s.attackT * 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAshbladeProcedural(ctx: CanvasRenderingContext2D, s: PlayerDrawState) {
  const bob = s.moving ? Math.sin(s.walkPhase * 2) * 2.4 : Math.sin(s.time * 3) * 0.7;
  const breath = Math.sin(s.time * 2.2) * 0.5;
  const stride = s.moving ? 1 : 0;

  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#1a0a04';
  ctx.beginPath();
  ctx.ellipse(0, 12, 18 + stride * 2, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(0, bob);

  if (s.invuln > 0) {
    ctx.globalAlpha = 0.45 + 0.55 * Math.sin(s.time * 28);
  }

  ctx.rotate(s.facing);
  ctx.scale(1, 0.76);

  const walk = s.moving ? s.walkPhase : 0;
  const legSwing = s.moving ? Math.sin(walk) * 16 : 0;
  const armSwing = s.moving ? Math.sin(walk) * 11 : 0;

  let atkArm = 0;
  let atkBlade = 0;
  let torsoTwist = 0;
  let lunge = 0;
  if (s.attackT > 0) {
    const t = s.attackT;
    const slash = t < 0.32 ? t / 0.32 : 1 - (t - 0.32) / 0.68;
    const wind = t < 0.32 ? (t / 0.32) * -0.85 : 0;
    lunge = slash * 4;
    if (s.attackKind === 'spiral') {
      atkArm = t * Math.PI * 2.2;
      atkBlade = 22;
      torsoTwist = t * 1.1;
    } else if (s.attackKind === 'ashwake') {
      atkArm = -1.1 + slash * 2.1;
      atkBlade = 26 * slash;
      torsoTwist = slash * 0.5;
      lunge = slash * 8;
    } else {
      atkArm = wind * 1.4 + slash * 1.85;
      atkBlade = 10 + slash * 26;
      torsoTwist = slash * 0.55;
    }
  }

  ctx.translate(lunge, 0);
  ctx.rotate(torsoTwist * 0.18);

  const hipY = 5;
  const boot = '#2a1810';
  const pant = '#3a2818';
  const pantLite = '#4a3420';

  const lx1 = -6 - legSwing * 0.45;
  const ly1 = hipY + 16 + Math.abs(legSwing) * 0.12;
  limb(ctx, -6, hipY, lx1, ly1, 7.5, pant);
  oval(ctx, lx1, ly1 + 2.5, 6, 3, boot);

  const rx1 = 6 + legSwing * 0.45;
  const ry1 = hipY + 16 + Math.abs(-legSwing) * 0.12;
  limb(ctx, 6, hipY, rx1, ry1, 7.5, pantLite);
  oval(ctx, rx1, ry1 + 2.5, 6, 3, boot);

  ctx.fillStyle = '#5a2010';
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.quadraticCurveTo(-20, 8 + Math.sin(s.time * 4 + walk) * 3, -10, 18);
  ctx.lineTo(0, 9);
  ctx.closePath();
  ctx.fill();

  oval(ctx, 0, 3, 10.5, 5.5, '#4a2c18', '#2a1810');
  oval(ctx, 0, -7 + breath * 0.2, 13, 10.5, '#6a3a22', '#2a1810');
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * 0.4;
  oval(ctx, -3.5, -10, 5, 3.5, '#c07040');
  ctx.globalAlpha = prevA;

  ctx.fillStyle = 'rgba(255,140,40,0.65)';
  ctx.beginPath();
  ctx.arc(2, -5, 3.5 + Math.sin(s.time * 5) * 0.6, 0, Math.PI * 2);
  ctx.fill();

  const headY = -20 + breath;
  limb(ctx, 0, -13, 0, headY + 5, 4.5, '#c09060');
  oval(ctx, 0, headY - 1, 10.5, 10.5, '#3a2010');
  oval(ctx, 2, headY, 8.2, 8.8, '#e0b888', '#6a4030');
  oval(ctx, -1, headY + 1.5, 4, 4.5, '#c89868');
  ctx.fillStyle = '#1a1008';
  ctx.beginPath();
  ctx.arc(5.5, headY - 1.5, 1.55, 0, Math.PI * 2);
  ctx.arc(5.5, headY + 2.8, 1.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9040';
  ctx.beginPath();
  ctx.arc(6.1, headY - 1.7, 0.7, 0, Math.PI * 2);
  ctx.arc(6.1, headY + 2.6, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a4030';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, headY, 10, -1.25, 1.25);
  ctx.stroke();

  const shoulderY = -9;
  const lSwing = s.attackT > 0 && s.attackKind === 'spiral' ? -atkArm * 0.45 : -armSwing;
  const lhX = -12 + Math.cos(lSwing) * 3;
  const lhY = shoulderY + 10 + Math.sin(lSwing) * 8;
  oval(ctx, -10, shoulderY - 1, 5, 4, '#5a3020', '#2a1810');
  limb(ctx, -9, shoulderY, lhX, lhY, 6.5, '#5a3828');
  oval(ctx, lhX, lhY, 4.2, 3.6, '#c09060');
  oval(ctx, lhX - 2.5, lhY + 1, 6, 4.5, '#4a3020', '#8a6050');

  oval(ctx, 10, shoulderY - 1, 5, 4, '#5a3020', '#2a1810');
  const baseAng = s.attackT > 0 ? atkArm : 0.4 + armSwing * 0.1;
  const reach = 18 + (s.attackT > 0 ? atkBlade * 0.18 : 0);
  const wx = Math.cos(baseAng) * reach;
  const wy = shoulderY + Math.sin(baseAng) * reach + (s.attackT > 0 ? -3 : 5);
  limb(ctx, 9, shoulderY, wx, wy, 6.5, '#5a3828');
  oval(ctx, wx, wy, 3.8, 3.2, '#c09060');

  const bladeLen = 26 + (s.attackT > 0 ? atkBlade * 0.4 : 0);
  const bAng = baseAng - 0.12;
  const tipX = wx + Math.cos(bAng) * bladeLen;
  const tipY = wy + Math.sin(bAng) * bladeLen;
  const midX = wx + Math.cos(bAng) * (bladeLen * 0.45);
  const midY = wy + Math.sin(bAng) * (bladeLen * 0.45);

  ctx.strokeStyle = s.attackT > 0 ? 'rgba(255,190,70,0.9)' : 'rgba(255,140,40,0.55)';
  ctx.lineWidth = s.attackT > 0 ? 6.5 : 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(wx, wy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const px = -Math.sin(bAng);
  const py = Math.cos(bAng);
  ctx.fillStyle = '#e8d0a0';
  ctx.beginPath();
  ctx.moveTo(wx + px * 2.2, wy + py * 2.2);
  ctx.lineTo(midX + px * 4, midY + py * 4);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(midX - px * 2.2, midY - py * 2.2);
  ctx.lineTo(wx - px * 1.6, wy - py * 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ff8030';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(midX + px * 2.2, midY + py * 2.2);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  oval(ctx, wx, wy, 4.5, 2.8, '#8a4a28', '#2a1810');

  if (s.attackT > 0.18 && s.attackT < 0.88 && s.attackKind !== 'spiral') {
    ctx.strokeStyle = `rgba(255,170,60,${0.65 * (1 - s.attackT)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -2, 32, baseAng - 1.25, baseAng + 0.25);
    ctx.stroke();
  }
  if (s.attackKind === 'spiral' && s.attackT > 0) {
    ctx.strokeStyle = `rgba(255,120,40,${0.5 * (1 - s.attackT)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22 + s.attackT * 34, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function pickEnemySprite(kind: string, elite: boolean, idHint: number): HTMLImageElement | null {
  const art = getArt();
  if (elite && imgOk(art.enemyB)) return art.enemyB;
  if (kind === 'cinderbrute' && imgOk(art.enemyB)) return art.enemyB;
  if (kind === 'sandwretch' && imgOk(art.enemyA)) return art.enemyA;
  if (kind === 'emberling' && imgOk(art.enemyC)) return art.enemyC;
  // hash fallback by id
  const pool = [art.enemyA, art.enemyC, art.enemyB].filter(imgOk);
  if (!pool.length) return null;
  return pool[Math.abs(idHint) % pool.length]!;
}

/** Enemy concept sprites (elite → larger enemy-b). Procedural fallback if missing. */
export function drawEnemyFigure(
  ctx: CanvasRenderingContext2D,
  kind: string,
  elite: boolean,
  flash: number,
  radius: number,
  time: number,
  facing: number,
  moving: boolean,
  idHint = 0,
) {
  const sprite = pickEnemySprite(kind, elite, idHint);
  if (sprite) {
    drawEnemySprite(ctx, sprite, elite, flash, radius, time, facing, moving);
  } else {
    drawEnemyProcedural(ctx, kind, elite, flash, radius, time, facing, moving);
  }
}

function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  elite: boolean,
  flash: number,
  radius: number,
  time: number,
  facing: number,
  moving: boolean,
) {
  const phase = moving ? time * 8 : time * 2;
  const bob = Math.sin(phase) * (moving ? 1.5 : 0.5);
  const faceFlip = Math.cos(facing) < 0 ? -1 : 1;
  const drawH = Math.max(36, radius * (elite ? 3.35 : 3.0));
  const scale = drawH / sprite.naturalHeight;
  const drawW = sprite.naturalWidth * scale;

  ctx.save();
  ctx.translate(0, bob);

  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.55, drawW * 0.38, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.scale(faceFlip, 1);
  if (flash > 0) {
    ctx.filter = 'brightness(1.8) saturate(0.4)';
  }
  ctx.drawImage(sprite, -drawW / 2, -drawH + radius * 0.55, drawW, drawH);
  ctx.filter = 'none';

  if (elite) {
    ctx.strokeStyle = 'rgba(224,160,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -drawH * 0.35, Math.max(drawW, drawH) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemyProcedural(
  ctx: CanvasRenderingContext2D,
  kind: string,
  elite: boolean,
  flash: number,
  radius: number,
  time: number,
  facing: number,
  moving: boolean,
) {
  const phase = moving ? time * 8 : time * 2;
  const bob = Math.sin(phase) * (moving ? 1.5 : 0.5);
  const leg = moving ? Math.sin(phase) * 6 : 0;

  const base =
    elite ? '#6a2080' : kind === 'cinderbrute' ? '#8a3030' : kind === 'sandwretch' ? '#7a6040' : '#a05020';
  const fill = flash > 0 ? '#ffffff' : base;
  const dark = flash > 0 ? '#ddd' : shade(base, -40);

  ctx.save();
  ctx.rotate(facing);
  ctx.scale(1, 0.76);
  ctx.translate(0, bob);

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.7, radius * 0.85, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  limb(ctx, -radius * 0.35, 2, -radius * 0.35 - leg * 0.3, radius * 0.75, radius * 0.28, dark);
  limb(ctx, radius * 0.35, 2, radius * 0.35 + leg * 0.3, radius * 0.75, radius * 0.28, fill);

  oval(ctx, 0, -radius * 0.15, radius * 0.75, radius * 0.7, fill, dark);
  oval(ctx, 2, -radius * 0.85, radius * 0.48, radius * 0.45, fill, dark);
  ctx.fillStyle = elite ? '#e0a0ff' : '#ffcc40';
  ctx.beginPath();
  ctx.arc(radius * 0.28, -radius * 0.9, radius * 0.11, 0, Math.PI * 2);
  ctx.arc(radius * 0.28, -radius * 0.7, radius * 0.11, 0, Math.PI * 2);
  ctx.fill();

  if (elite) {
    ctx.strokeStyle = '#e0a0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.2, radius * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// silence unused EnemyKind import if tree-shaken — keep for type docs
