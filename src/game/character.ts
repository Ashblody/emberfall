/** Procedural 2.5D isometric Ashblade — limb volumes, walk + attack (Canvas 2D). */

export interface PlayerDrawState {
  facing: number;
  moving: boolean;
  walkPhase: number;
  /** 0 = idle, 1 = mid-swing peak */
  attackT: number;
  /** which attack flavor for arm pose */
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
  ctx.beginPath();
  ctx.moveTo(x0 + nx * hw, y0 + ny * hw);
  ctx.lineTo(x1 + nx * hw * 0.7, y1 + ny * hw * 0.7);
  ctx.lineTo(x1 - nx * hw * 0.7, y1 - ny * hw * 0.7);
  ctx.lineTo(x0 - nx * hw, y0 - ny * hw);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  // joint balls for volume
  oval(ctx, x0, y0, w * 0.55, w * 0.45, shade(fill.startsWith('#') ? fill : '#4a3020', 10));
  oval(ctx, x1, y1, w * 0.45, w * 0.38, shade(fill.startsWith('#') ? fill : '#4a3020', -8));
}

/**
 * Draw Ashblade in isometric-ish screen space.
 * World facing angle (atan2) maps to 8-dir body lean; limbs animate in local space.
 */
export function drawAshblade(ctx: CanvasRenderingContext2D, s: PlayerDrawState) {
  const bob = s.moving ? Math.sin(s.walkPhase * 2) * 1.6 : Math.sin(s.time * 3) * 0.6;
  const breath = Math.sin(s.time * 2.2) * 0.4;

  // Ground shadow (ellipse = depth cue)
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#1a0a04';
  ctx.beginPath();
  ctx.ellipse(0, 10, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(0, bob);

  if (s.invuln > 0) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(s.time * 28);
  }

  // Face direction: rotate whole figure toward movement (top-down with slight iso tilt)
  ctx.rotate(s.facing);
  // Mild "camera" squash so figure reads taller / Diablo-ish from above-front
  ctx.scale(1, 0.78);

  const walk = s.moving ? s.walkPhase : 0;
  const legSwing = s.moving ? Math.sin(walk) * 11 : 0;
  const armSwing = s.moving ? Math.sin(walk) * 7 : 0;

  // Attack overrides
  let atkArm = 0;
  let atkBlade = 0;
  let torsoTwist = 0;
  if (s.attackT > 0) {
    const t = s.attackT;
    // ease: wind-up then slash
    const slash = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
    const wind = t < 0.35 ? (t / 0.35) * -0.6 : 0;
    if (s.attackKind === 'spiral') {
      atkArm = t * Math.PI * 2;
      atkBlade = 18;
      torsoTwist = t * 0.8;
    } else if (s.attackKind === 'ashwake') {
      atkArm = -0.9 + slash * 1.8;
      atkBlade = 22 * slash;
      torsoTwist = slash * 0.35;
    } else {
      // basic slash
      atkArm = wind * 1.2 + slash * 1.6;
      atkBlade = 8 + slash * 20;
      torsoTwist = slash * 0.45;
    }
  }

  ctx.rotate(torsoTwist * 0.15);

  // --- Legs (drawn first, behind torso) ---
  const hipY = 4;
  const boot = '#2a1810';
  const pant = '#3a2818';
  const pantLite = '#4a3420';

  // back leg
  const lx0 = -5;
  const ly0 = hipY;
  const lx1 = -5 - legSwing * 0.15;
  const ly1 = hipY + 14 + Math.abs(legSwing) * 0.08;
  limb(ctx, lx0, ly0, lx1 - legSwing * 0.35, ly1, 6.5, pant);
  oval(ctx, lx1 - legSwing * 0.35, ly1 + 2, 5, 2.5, boot);

  // front leg
  const rx0 = 5;
  const ry0 = hipY;
  const rx1 = 5 + legSwing * 0.15;
  const ry1 = hipY + 14 + Math.abs(-legSwing) * 0.08;
  limb(ctx, rx0, ry0, rx1 + legSwing * 0.35, ry1, 6.5, pantLite);
  oval(ctx, rx1 + legSwing * 0.35, ry1 + 2, 5, 2.5, boot);

  // --- Torso (layered volumes) ---
  // cape / cloak flap
  ctx.fillStyle = '#5a2010';
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.quadraticCurveTo(-16, 6 + Math.sin(s.time * 4 + walk) * 2, -8, 16);
  ctx.lineTo(0, 8);
  ctx.closePath();
  ctx.fill();

  // pelvis
  oval(ctx, 0, 2, 9, 5, '#4a2c18', '#2a1810');
  // chest armor plate
  oval(ctx, 0, -6 + breath * 0.2, 11, 9, '#6a3a22', '#2a1810');
  // highlight for volume
  ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.35;
  oval(ctx, -3, -9, 4, 3, '#c07040');
  ctx.globalAlpha = s.invuln > 0 ? 0.5 + 0.5 * Math.sin(s.time * 28) : 1;

  // ember core glow on chest
  ctx.fillStyle = 'rgba(255,140,40,0.55)';
  ctx.beginPath();
  ctx.arc(1, -5, 3 + Math.sin(s.time * 5) * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // --- Head (clear silhouette) ---
  const headY = -18 + breath;
  // neck
  limb(ctx, 0, -12, 0, headY + 4, 4, '#c09060');
  // hood / hair back
  oval(ctx, 0, headY - 1, 9, 9, '#3a2010');
  // face
  oval(ctx, 1, headY, 7, 7.5, '#e0b888', '#6a4030');
  // face shade
  oval(ctx, -1, headY + 1, 3.5, 4, '#c89868');
  // eyes (facing forward in local +x after rotate)
  ctx.fillStyle = '#1a1008';
  ctx.beginPath();
  ctx.arc(4, headY - 1, 1.3, 0, Math.PI * 2);
  ctx.arc(4, headY + 2.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  // ember eye glints
  ctx.fillStyle = '#ff9040';
  ctx.beginPath();
  ctx.arc(4.5, headY - 1.2, 0.6, 0, Math.PI * 2);
  ctx.arc(4.5, headY + 2.3, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // hood rim
  ctx.strokeStyle = '#8a4030';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, headY, 8.5, -1.2, 1.2);
  ctx.stroke();

  // --- Arms ---
  const shoulderY = -8;
  // off-hand (left) — shield / free hand
  const lSwing = s.attackT > 0 && s.attackKind === 'spiral' ? -atkArm * 0.4 : -armSwing;
  const lhX = -10 + Math.cos(lSwing) * 2;
  const lhY = shoulderY + 8 + Math.sin(lSwing) * 6;
  limb(ctx, -8, shoulderY, lhX, lhY, 5.5, '#5a3828');
  oval(ctx, lhX, lhY, 3.5, 3, '#c09060');
  // small buckler
  oval(ctx, lhX - 2, lhY + 1, 5, 4, '#4a3020', '#8a6050');

  // weapon arm (right) — Ashblade
  const baseAng = s.attackT > 0 ? atkArm : 0.35 + armSwing * 0.08;
  const reach = 16 + (s.attackT > 0 ? atkBlade * 0.15 : 0);
  const wx = Math.cos(baseAng) * reach;
  const wy = shoulderY + Math.sin(baseAng) * reach + (s.attackT > 0 ? -2 : 4);
  limb(ctx, 8, shoulderY, wx, wy, 5.5, '#5a3828');
  oval(ctx, wx, wy, 3.2, 2.8, '#c09060');

  // Blade
  const bladeLen = 22 + (s.attackT > 0 ? atkBlade * 0.35 : 0);
  const bAng = baseAng - 0.15;
  const tipX = wx + Math.cos(bAng) * bladeLen;
  const tipY = wy + Math.sin(bAng) * bladeLen;
  const midX = wx + Math.cos(bAng) * (bladeLen * 0.45);
  const midY = wy + Math.sin(bAng) * (bladeLen * 0.45);

  // glow
  ctx.strokeStyle = s.attackT > 0 ? 'rgba(255,180,60,0.85)' : 'rgba(255,140,40,0.55)';
  ctx.lineWidth = s.attackT > 0 ? 5 : 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(wx, wy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // blade body
  const px = -Math.sin(bAng);
  const py = Math.cos(bAng);
  ctx.fillStyle = '#e8d0a0';
  ctx.beginPath();
  ctx.moveTo(wx + px * 2, wy + py * 2);
  ctx.lineTo(midX + px * 3.5, midY + py * 3.5);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(midX - px * 2, midY - py * 2);
  ctx.lineTo(wx - px * 1.5, wy - py * 1.5);
  ctx.closePath();
  ctx.fill();
  // hot edge
  ctx.strokeStyle = '#ff8030';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(midX + px * 2, midY + py * 2);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // guard
  oval(ctx, wx, wy, 4, 2.5, '#8a4a28', '#2a1810');

  // slash arc trail when attacking
  if (s.attackT > 0.2 && s.attackT < 0.85 && s.attackKind !== 'spiral') {
    ctx.strokeStyle = `rgba(255,160,60,${0.55 * (1 - s.attackT)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -2, 28, baseAng - 1.1, baseAng + 0.2);
    ctx.stroke();
  }
  if (s.attackKind === 'spiral' && s.attackT > 0) {
    ctx.strokeStyle = `rgba(255,120,40,${0.4 * (1 - s.attackT)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 20 + s.attackT * 30, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/** Simple 2.5D enemy with head + body (not a flat blob). */
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
  ctx.scale(1, 0.78);
  ctx.translate(0, bob);

  // shadow
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.7, radius * 0.85, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // legs
  limb(ctx, -radius * 0.35, 2, -radius * 0.35 - leg * 0.3, radius * 0.75, radius * 0.28, dark);
  limb(ctx, radius * 0.35, 2, radius * 0.35 + leg * 0.3, radius * 0.75, radius * 0.28, fill);

  // body
  oval(ctx, 0, -radius * 0.15, radius * 0.75, radius * 0.7, fill, dark);
  // head
  oval(ctx, 2, -radius * 0.85, radius * 0.45, radius * 0.42, fill, dark);
  // eyes
  ctx.fillStyle = elite ? '#e0a0ff' : '#ffcc40';
  ctx.beginPath();
  ctx.arc(radius * 0.25, -radius * 0.9, radius * 0.1, 0, Math.PI * 2);
  ctx.arc(radius * 0.25, -radius * 0.7, radius * 0.1, 0, Math.PI * 2);
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
