import { WORLD_H, WORLD_W, OBSTACLES } from './map';
import { drawAshblade, drawEnemyFigure, type PlayerDrawState } from './character';
import type { AoEBurst, Enemy, FloatingText, LootItem, Particle, Projectile } from './types';

/** Soft isometric Y squash for world (phone-safe, no heavy tilt). */
const ISO_Y = 0.92;

export class Renderer {
  camX = 0;
  camY = 0;
  private targetCamX = 0;
  private targetCamY = 0;
  private sandPat: CanvasPattern | null = null;
  private shakeX = 0;
  private shakeY = 0;
  private shakeTime = 0;
  private shakeAmp = 0;
  private hitFlash = 0;
  private time = 0;
  /** Reduce shake / look-ahead on narrow screens to avoid nausea. */
  private phoneSoft = false;

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.buildSandPattern();
  }

  private buildSandPattern() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#c4a06a';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = i % 2 ? '#b8945c' : '#d0b078';
      g.fillRect((i * 17) % 64, (i * 29) % 64, 2, 2);
    }
    g.strokeStyle = 'rgba(90,60,30,0.15)';
    g.beginPath();
    g.moveTo(0, 32);
    g.quadraticCurveTo(32, 28, 64, 34);
    g.stroke();
    this.sandPat = this.ctx.createPattern(c, 'repeat');
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.phoneSoft = w < 700 || ('ontouchstart' in window && w < 900);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Smooth follow with mild look-ahead; damped on phone. */
  follow(px: number, py: number, facing: number, dt: number, moving: boolean) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const look = this.phoneSoft ? (moving ? 22 : 8) : moving ? 38 : 16;
    const tx = px + Math.cos(facing) * look;
    const ty = py + Math.sin(facing) * look;
    this.targetCamX = Math.max(0, Math.min(WORLD_W - vw, tx - vw / 2));
    this.targetCamY = Math.max(0, Math.min(WORLD_H - vh, ty - vh / 2));
    // exponential smooth — slightly softer on phone
    const base = this.phoneSoft ? 0.0022 : 0.0014;
    const k = 1 - Math.pow(base, dt);
    this.camX += (this.targetCamX - this.camX) * k;
    this.camY += (this.targetCamY - this.camY) * k;

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const soft = this.phoneSoft ? 0.55 : 1;
      const mag = Math.min(1, this.shakeTime * 7) * this.shakeAmp * soft;
      // smooth noise-ish shake (less random flicker)
      const t = this.time * 40;
      this.shakeX = Math.sin(t * 1.7) * mag;
      this.shakeY = Math.cos(t * 2.1) * mag * 0.85;
      if (this.shakeTime <= 0) this.shakeAmp = 0;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3.2);
    this.time += dt;
  }

  shake(amp = 6, dur = 0.18) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeTime = Math.max(this.shakeTime, dur);
  }

  flashHit(amount = 0.35) {
    this.hitFlash = Math.max(this.hitFlash, amount);
  }

  private worldOffset() {
    return { x: this.camX - this.shakeX, y: this.camY - this.shakeY };
  }

  /** Begin world pass with slight isometric Y squash around camera center. */
  private beginWorld() {
    const { ctx } = this;
    const o = this.worldOffset();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.save();
    // slight iso: squash Y around view center (subtle, not nauseating)
    ctx.translate(vw / 2, vh / 2);
    ctx.scale(1, ISO_Y);
    ctx.translate(-vw / 2, -vh / 2);
    ctx.translate(-o.x, -o.y);
    return o;
  }

  clear() {
    const { ctx } = this;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // full-bleed sand without iso (avoids edge gaps)
    const ox = this.camX - this.shakeX;
    const oy = this.camY - this.shakeY;
    ctx.save();
    ctx.translate(-ox, -oy);
    if (this.sandPat) {
      ctx.fillStyle = this.sandPat;
      ctx.fillRect(ox - 4, oy - 4, vw + 8, vh + 8);
    } else {
      ctx.fillStyle = '#c4a06a';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    ctx.fillStyle = 'rgba(90,55,30,0.12)';
    for (let i = 0; i < 12; i++) {
      const x = (i * 197) % WORLD_W;
      const y = (i * 311) % WORLD_H;
      ctx.beginPath();
      ctx.ellipse(x, y, 80 + (i % 5) * 20, 40 + (i % 3) * 15, i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const o of OBSTACLES) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + o.h + 6, o.w * 0.55, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6a4a38';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#8a6550';
      ctx.fillRect(o.x, o.y, o.w, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(o.x + o.w - 8, o.y, 8, o.h);
      ctx.strokeStyle = 'rgba(30,15,8,0.45)';
      ctx.beginPath();
      ctx.moveTo(o.x + 10, o.y + 20);
      ctx.lineTo(o.x + o.w * 0.4, o.y + o.h * 0.6);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(80,50,30,0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, WORLD_W - 20, WORLD_H - 20);
    ctx.restore();
  }

  drawLoot(items: LootItem[]) {
    const { ctx } = this;
    this.beginWorld();
    for (const it of items) {
      const color =
        it.rarity === 'yellow' ? '#ffd24a' : it.rarity === 'blue' ? '#6db3ff' : '#e8e4dc';
      const glow =
        it.rarity === 'yellow'
          ? 'rgba(255,210,74,0.45)'
          : it.rarity === 'blue'
            ? 'rgba(109,179,255,0.4)'
            : 'rgba(232,228,220,0.28)';
      const pulse = 1 + Math.sin(this.time * 5.5 + it.x * 0.05) * 0.14;
      const r = (it.rarity === 'yellow' ? 11 : it.rarity === 'blue' ? 9.5 : 8) * pulse;

      // ground glow ring
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(it.x, it.y + 5, r * 1.8, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(it.x, it.y + 5, r * 1.1, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // gem / pickup body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(it.x, it.y - r);
      ctx.lineTo(it.x + r * 0.85, it.y);
      ctx.lineTo(it.x, it.y + r * 0.7);
      ctx.lineTo(it.x - r * 0.85, it.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // highlight
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(it.x - r * 0.25, it.y - r * 0.25, r * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // short nameplate
      const label = it.nameSl.length > 18 ? it.nameSl.slice(0, 16) + '…' : it.nameSl;
      ctx.font = 'bold 11px system-ui,sans-serif';
      const tw = ctx.measureText(label).width;
      const pad = 5;
      const bx = it.x - tw / 2 - pad;
      const by = it.y - r - 20;
      ctx.fillStyle = 'rgba(12,6,4,0.78)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect?.(bx, by, tw + pad * 2, 16, 4);
      if (!ctx.roundRect) {
        ctx.fillRect(bx, by, tw + pad * 2, 16);
        ctx.strokeRect(bx, by, tw + pad * 2, 16);
      } else {
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(label, it.x, by + 12);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  drawEnemy(e: Enemy) {
    const { ctx } = this;
    this.beginWorld();
    ctx.translate(e.x, e.y);
    const facing = Math.atan2(e.vy || 0.01, e.vx || 0.01);
    const moving = Math.hypot(e.vx, e.vy) > 8;
    drawEnemyFigure(ctx, e.kind, e.elite, e.flash, e.radius, this.time + e.id, facing, moving);
    if (e.flash > 0) {
      ctx.globalAlpha = Math.min(0.55, e.flash * 4);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -e.radius * 0.2, e.radius * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.elite) {
      ctx.fillStyle = '#e0a0ff';
      ctx.font = 'bold 10px system-ui';
      ctx.fillText('ELITA', -16, -e.radius - 18);
    }
    const bw = e.radius * 2.2;
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#220';
    ctx.fillRect(-bw / 2, -e.radius - 14, bw, 4);
    ctx.fillStyle = e.elite ? '#c060ff' : '#d44';
    ctx.fillRect(-bw / 2, -e.radius - 14, bw * pct, 4);
    ctx.restore();
  }

  drawPlayer(state: PlayerDrawState & { x: number; y: number }) {
    const { ctx } = this;
    this.beginWorld();
    ctx.translate(state.x, state.y);
    drawAshblade(ctx, state);
    ctx.restore();
  }

  drawProjectiles(list: Projectile[]) {
    const { ctx } = this;
    this.beginWorld();
    for (const p of list) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawAoE(list: AoEBurst[]) {
    const { ctx } = this;
    this.beginWorld();
    for (const a of list) {
      const t = 1 - a.life / a.maxLife;
      ctx.strokeStyle = a.color;
      ctx.globalAlpha = 0.75 * (1 - t);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.18 * (1 - t);
      ctx.fillStyle = a.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawParticles(list: Particle[]) {
    const { ctx } = this;
    this.beginWorld();
    for (const p of list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawFloating(list: FloatingText[]) {
    const { ctx } = this;
    this.beginWorld();
    for (const f of list) {
      const t = Math.max(0, f.life / (f.maxLife || 0.7));
      ctx.globalAlpha = Math.min(1, t * 1.4);
      const sc = (f.scale || 1) * (f.crit ? 1.15 + (1 - t) * 0.25 : 1);
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(sc, sc);
      const size = f.crit ? 20 : 14;
      ctx.font = `bold ${size}px system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = f.crit ? 4 : 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      if (f.crit) {
        ctx.font = 'bold 10px system-ui';
        ctx.fillStyle = '#ffe080';
        ctx.fillText('KRIT!', 0, -16);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawScreenFx() {
    if (this.hitFlash <= 0) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = this.hitFlash * 0.5;
    ctx.fillStyle = '#ff4020';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    // vignette punch
    ctx.globalAlpha = this.hitFlash * 0.35;
    const g = ctx.createRadialGradient(
      window.innerWidth / 2,
      window.innerHeight / 2,
      Math.min(window.innerWidth, window.innerHeight) * 0.2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      Math.max(window.innerWidth, window.innerHeight) * 0.7,
    );
    g.addColorStop(0, 'transparent');
    g.addColorStop(1, '#ff2000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.restore();
  }
}
