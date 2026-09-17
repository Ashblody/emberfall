import { WORLD_H, WORLD_W, OBSTACLES } from './map';
import type { AoEBurst, Enemy, FloatingText, LootItem, Particle, Projectile } from './types';

export class Renderer {
  camX = 0;
  camY = 0;
  private sandPat: CanvasPattern | null = null;

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

  follow(px: number, py: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.camX = Math.max(0, Math.min(WORLD_W - vw, px - vw / 2));
    this.camY = Math.max(0, Math.min(WORLD_H - vh, py - vh / 2));
  }

  clear() {
    const { ctx } = this;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
    if (this.sandPat) {
      ctx.fillStyle = this.sandPat;
      ctx.fillRect(this.camX - 2, this.camY - 2, vw + 4, vh + 4);
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

    // Obstacles (ruined pillars)
    for (const o of OBSTACLES) {
      ctx.fillStyle = '#6a4a38';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#8a6550';
      ctx.fillRect(o.x, o.y, o.w, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(o.x + o.w - 8, o.y, 8, o.h);
      // cracks
      ctx.strokeStyle = 'rgba(30,15,8,0.45)';
      ctx.beginPath();
      ctx.moveTo(o.x + 10, o.y + 20);
      ctx.lineTo(o.x + o.w * 0.4, o.y + o.h * 0.6);
      ctx.stroke();
    }

    // Border walls hint
    ctx.strokeStyle = 'rgba(80,50,30,0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, WORLD_W - 20, WORLD_H - 20);
    ctx.restore();
  }

  drawLoot(items: LootItem[]) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
    for (const it of items) {
      const color =
        it.rarity === 'yellow' ? '#ffd24a' : it.rarity === 'blue' ? '#6db3ff' : '#e8e4dc';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(it.x, it.y, 7, 0, Math.PI * 2);
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
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
    const base = e.elite ? '#6a2080' : e.kind === 'cinderbrute' ? '#8a3030' : e.kind === 'sandwretch' ? '#7a6040' : '#a05020';
    ctx.fillStyle = e.flash > 0 ? '#fff' : base;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    if (e.elite) {
      ctx.strokeStyle = '#e0a0ff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#e0a0ff';
      ctx.font = 'bold 10px system-ui';
      ctx.fillText('ELITA', e.x - 16, e.y - e.radius - 14);
    }
    // HP bar
    const bw = e.radius * 2.2;
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#220';
    ctx.fillRect(e.x - bw / 2, e.y - e.radius - 10, bw, 4);
    ctx.fillStyle = e.elite ? '#c060ff' : '#d44';
    ctx.fillRect(e.x - bw / 2, e.y - e.radius - 10, bw * pct, 4);
    ctx.restore();
  }

  drawPlayer(x: number, y: number, facing: number, invuln: number) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
    ctx.translate(x, y);
    ctx.rotate(facing);
    if (invuln > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(performance.now() / 40);
    // Ashblade silhouette
    ctx.fillStyle = '#2a1810';
    ctx.beginPath();
    ctx.ellipse(0, 4, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d06030';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-8, -12);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f0c080';
    ctx.beginPath();
    ctx.arc(-2, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    // Blade glow
    ctx.strokeStyle = 'rgba(255,160,60,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.lineTo(22, 0);
    ctx.lineTo(6, 2);
    ctx.stroke();
    ctx.restore();
  }

  drawProjectiles(list: Projectile[]) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
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
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
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
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
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
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
    ctx.font = 'bold 14px system-ui';
    for (const f of list) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }
}
