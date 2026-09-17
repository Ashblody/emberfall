/** Procedural 2.5D Ashblade — clearer head/arms, strong walk + attack read (Canvas 2D). */

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

/**
 * Draw Ashblade facing move/attack direction.
 * Stronger limb swing + oversized head/arms for phone readability.
 */
export function drawAshblade(ctx: CanvasRenderingContext2D, s: PlayerDrawState) {
  const bob = s.moving ? Math.sin(s.walkPhase * 2) * 2.4 : Math.sin(s.time * 3) * 0.7;
  const breath = Math.sin(s.time * 2.2) * 0.5;
  const stride = s.moving ? 1 : 0;

  // Ground shadow
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

  // Face toward move / attack (world atan2 → screen rotate)
  ctx.rotate(s.facing);
  // Mild isometric squash (taller read from above-front)
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

  // back leg
  const lx1 = -6 - legSwing * 0.45;
  const ly1 = hipY + 16 + Math.abs(legSwing) * 0.12;
  limb(ctx, -6, hipY, lx1, ly1, 7.5, pant);
  oval(ctx, lx1, ly1 + 2.5, 6, 3, boot);

  // front leg
  const rx1 = 6 + legSwing * 0.45;
  const ry1 = hipY + 16 + Math.abs(-legSwing) * 0.12;
  limb(ctx, 6, hipY, rx1, ry1, 7.5, pantLite);
  oval(ctx, rx1, ry1 + 2.5, 6, 3, boot);

  // cape
  ctx.fillStyle = '#5a2010';
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.quadraticCurveTo(-20, 8 + Math.sin(s.time * 4 + walk) * 3, -10, 18);
  ctx.lineTo(0, 9);
  ctx.closePath();
  ctx.fill();

  // pelvis + chest
  oval(ctx, 0, 3, 10.5, 5.5, '#4a2c18', '#2a1810');
  oval(ctx, 0, -7 + breath * 0.2, 13, 10.5, '#6a3a22', '#2a1810');
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * 0.4;
  oval(ctx, -3.5, -10, 5, 3.5, '#c07040');
  ctx.globalAlpha = prevA;

  // ember core
  ctx.fillStyle = 'rgba(255,140,40,0.65)';
  ctx.beginPath();
  ctx.arc(2, -5, 3.5 + Math.sin(s.time * 5) * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // --- Head (large, readable silhouette) ---
  const headY = -20 + breath;
  limb(ctx, 0, -13, 0, headY + 5, 4.5, '#c09060');
  oval(ctx, 0, headY - 1, 10.5, 10.5, '#3a2010');
  oval(ctx, 2, headY, 8.2, 8.8, '#e0b888', '#6a4030');
  oval(ctx, -1, headY + 1.5, 4, 4.5, '#c89868');
  // eyes look along +local X (facing)
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

  // --- Arms (thick, readable) ---
  const shoulderY = -9;
  const lSwing = s.attackT > 0 && s.attackKind === 'spiral' ? -atkArm * 0.45 : -armSwing;
  const lhX = -12 + Math.cos(lSwing) * 3;
  const lhY = shoulderY + 10 + Math.sin(lSwing) * 8;
  // shoulder pad
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

  // Blade
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

/** Simple 2.5D enemy with head + body. */
export function drawEnemyFigure(
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
