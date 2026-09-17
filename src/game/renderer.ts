import { WORLD_H, WORLD_W, OBSTACLES } from './map';
import { drawAshblade, drawEnemyFigure, type PlayerDrawState } from './character';
import type { AoEBurst, Enemy, FloatingText, LootItem, Particle, Projectile } from './types';

export class Renderer {
  camX = 0;
  camY = 0;
  private targetCamX = 0;
  private targetCamY = 0;
  private sandPat: CanvasPattern | null = null;
  private shakeX = 0;
  private shakeY = 0;
  private shakeTime = 0;
  private hitFlash = 0;
  private time = 0;

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
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Soft follow with look-ahead; call every frame with dt. */
  follow(px: number, py: number, facing: number, dt: number, moving: boolean) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const look = moving ? 42 : 18;
    const tx = px + Math.cos(facing) * look;
    const ty = py + Math.sin(facing) * look;
    this.targetCamX = Math.max(0, Math.min(WORLD_W - vw, tx - vw / 2));
    this.targetCamY = Math.max(0, Math.min(WORLD_H - vh, ty - vh / 2));
    // snappy but smooth (phone-friendly)
    const k = 1 - Math.pow(0.0015, dt);
    this.camX += (this.targetCamX - this.camX) * k;
    this.camY += (this.targetCamY - this.camY) * k;

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const mag = Math.min(1, this.shakeTime * 8) * this.shakeAmp;
      this.shakeX = (Math.random() - 0.5) * 2 * mag;
      this.shakeY = (Math.random() - 0.5) * 2 * mag;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
    this.time += dt;
  }

  private shakeAmp = 0;

  shake(amp = 6, dur = 0.18) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeTime = Math.max(this.shakeTime, dur);
  }

  flashHit(amount = 0.35) {
    this.hitFlash = Math.max(this.hitFlash, amount);
  }

  clear() {
    const { ctx } = this;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ox = this.camX - this.shakeX;
    const oy = this.camY - this.shakeY;
    ctx.save();
    ctx.translate(-ox, -oy);
    if (this.sandPat) {
      ctx.fillStyle = this.sandPat;
      ctx.fillRect(ox - 2, oy - 2, vw + 4, vh + 4);
    } else {
      ctx.fillStyle = '#c4a06a';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    // Ruin floor stains
    ctx.fillStyle = 'rgba(90,55,30,0.12)';
    for (let i = 0; i < 12; i++) {
      const x = (i * 197) % WORLD_W;
      const y = (i * 311) % WORLD_H;
      ctx.beginPath();
      ctx.ellipse(x, y, 80 + (i % 5) * 20, 40 + (i % 3) * 15, i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Obstacles (ruined pillars) — slight 2.5D top face
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

  private worldOffset() {
    return { x: this.camX - this.shakeX, y: this.camY - this.shakeY };
  }

  drawLoot(items: LootItem[]) {
    const { ctx } = this;
    const o = this.worldOffset();
    ctx.save();
    ctx.translate(-o.x, -o.y);
    for (const it of items) {
      const color =
        it.rarity === 'yellow' ? '#ffd24a' : it.rarity === 'blue' ? '#6db3ff' : '#e8e4dc';
      const pulse = 1 + Math.sin(this.time * 6 + it.x) * 0.12;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(it.x, it.y + 4, 8 * pulse, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(it.x, it.y, 7 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(it.nameSl, it.x - 20, it.y - 12);
    }
    ctx.restore();
  }

  drawEnemy(e: Enemy) {
    const { ctx } = this;
    const o = this.worldOffset();
    ctx.save();
    ctx.translate(-o.x, -o.y);
    ctx.translate(e.x, e.y);
    const facing = Math.atan2(e.vy || 0.01, e.vx || 0.01);
    const moving = Math.hypot(e.vx, e.vy) > 8;
    drawEnemyFigure(ctx, e.kind, e.elite, e.flash, e.radius, this.time + e.id, facing, moving);
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
    const o = this.worldOffset();
    ctx.save();
    ctx.translate(-o.x, -o.y);
    ctx.translate(state.x, state.y);
    drawAshblade(ctx, state);
    ctx.restore();
  }

  drawProjectiles(list: Projectile[]) {
    const { ctx } = this;
    const o = this.worldOffset();
    ctx.save();
    ctx.translate(-o.x, -o.y);
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
    const o = this.worldOffset();
    ctx.save();
    ctx.translate(-o.x, -o.y);
    for (const a of list) {
      const t = 1 - a.life / a.maxLife;
      ctx.strokeStyle = a.color;
      ctx.globalAlpha = 0.7 * (1 - t);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.15 * (1 - t);
      ctx.fillStyle = a.color;
      ctx.fill();
    }
    ctx.restore();
  }

  drawParticles(list: Particle[]) {
    const { ctx } = this;
    const o = this.worldOffset();
    ctx.save();
    ctx.translate(-o.x, -o.y);
    for (const p of list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFloating(list: FloatingText[]) {
    const { ctx } = this;
    const o = this.worldOffset();
    ctx.save();
    ctx.translate(-o.x, -o.y);
    ctx.font = 'bold 14px system-ui';
    for (const f of list) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  drawScreenFx() {
    if (this.hitFlash <= 0) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = this.hitFlash * 0.45;
    ctx.fillStyle = '#ff4020';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.restore();
  }
}
