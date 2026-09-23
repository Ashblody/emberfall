import { Input } from './input';
import { Renderer } from './renderer';
import {
  ELITE_PACK_CENTER,
  SPAWN_POINTS,
  tryMove,
} from './map';
import { rollLoot } from './lootTable';
import type { AoEBurst, Enemy, EnemyKind, FloatingText, LootItem, Particle, Projectile } from './types';

const PLAYER_R = 14;
const PLAYER_SPEED = 230;
const MAX_HP = 100;
const MAX_EMBER = 100;
const BASIC_CD = 0.32;
const SPIRAL_CD = 4.5;
const ASHWAKE_CD = 5.5;
const SPIRAL_COST = 28;
const ASHWAKE_COST = 22;
const CRIT_CHANCE = 0.18;
const CRIT_MULT = 1.75;

export class Game {
  running = false;
  player = {
    x: 400,
    y: 900,
    hp: MAX_HP,
    ember: MAX_EMBER,
    facing: -Math.PI / 2,
    invuln: 0,
    basicCd: 0,
    spiralCd: 0,
    ashwakeCd: 0,
    walkPhase: 0,
    moving: false,
    attackT: 0,
    attackKind: 'none' as 'none' | 'basic' | 'spiral' | 'ashwake',
    atkDur: 0.28,
    moveSmoothX: 0,
    moveSmoothY: 0,
  };

  enemies: Enemy[] = [];
  loot: LootItem[] = [];
  particles: Particle[] = [];
  floats: FloatingText[] = [];
  projectiles: Projectile[] = [];
  aoes: AoEBurst[] = [];
  private nextEnemyId = 1;
  private waveTimer = 0;
  private eliteSpawned = false;
  private kills = 0;
  private lastTs = 0;
  private msg = '';
  private animTime = 0;
  private hitStop = 0;

  private hpFill: HTMLElement;
  private emberFill: HTMLElement;
  private hpLabel: HTMLElement;
  private emberLabel: HTMLElement;
  private lootToast: HTMLElement;
  private btnSpiral: HTMLElement;
  private btnAshwake: HTMLElement;
  private btnBasic: HTMLElement;
  private overlay: HTMLElement;
  private cdBasic: HTMLElement;
  private cdSpiral: HTMLElement;
  private cdAshwake: HTMLElement;

  private input: Input;
  private renderer: Renderer;

  constructor(input: Input, renderer: Renderer) {
    this.input = input;
    this.renderer = renderer;
    this.hpFill = document.getElementById('hp-fill')!;
    this.emberFill = document.getElementById('ember-fill')!;
    this.hpLabel = document.getElementById('hp-label')!;
    this.emberLabel = document.getElementById('ember-label')!;
    this.lootToast = document.getElementById('loot-toast')!;
    this.btnSpiral = document.getElementById('btn-spiral')!;
    this.btnAshwake = document.getElementById('btn-ashwake')!;
    this.btnBasic = document.getElementById('btn-basic')!;
    this.overlay = document.getElementById('overlay')!;
    this.cdBasic = document.getElementById('cd-basic')!;
    this.cdSpiral = document.getElementById('cd-spiral')!;
    this.cdAshwake = document.getElementById('cd-ashwake')!;
  }

  start() {
    this.reset();
    this.running = true;
    this.overlay.classList.remove('end-screen');
    this.overlay.classList.add('hidden');
    this.lastTs = performance.now();
    requestAnimationFrame(this.frame);
  }

  reset() {
    this.player = {
      x: 400,
      y: 900,
      hp: MAX_HP,
      ember: MAX_EMBER,
      facing: -Math.PI / 2,
      invuln: 0,
      basicCd: 0,
      spiralCd: 0,
      ashwakeCd: 0,
      walkPhase: 0,
      moving: false,
      attackT: 0,
      attackKind: 'none',
      atkDur: 0.28,
      moveSmoothX: 0,
      moveSmoothY: 0,
    };
    this.enemies = [];
    this.loot = [];
    this.particles = [];
    this.floats = [];
    this.projectiles = [];
    this.aoes = [];
    this.nextEnemyId = 1;
    this.waveTimer = 0.5;
    this.eliteSpawned = false;
    this.kills = 0;
    this.msg = '';
    this.animTime = 0;
    this.hitStop = 0;
    this.lootToast.textContent = '';
    this.spawnPack(SPAWN_POINTS[0]!, 4, false);
    this.spawnPack(SPAWN_POINTS[2]!, 3, false);
  }

  private frame = (ts: number) => {
    if (!this.running) return;
    let dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt *= 0.15;
    }
    this.update(dt);
    this.draw(dt);
    requestAnimationFrame(this.frame);
  };

  private spawnEnemy(x: number, y: number, kind: EnemyKind, elite = false): Enemy {
    const base =
      kind === 'cinderbrute'
        ? { hp: 90, r: 22, speed: 70, dmg: 14 }
        : kind === 'sandwretch'
          ? { hp: 45, r: 16, speed: 115, dmg: 9 }
          : { hp: 28, r: 13, speed: 140, dmg: 7 };
    const e: Enemy = {
      id: this.nextEnemyId++,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: elite ? base.hp * 2.4 : base.hp,
      maxHp: elite ? base.hp * 2.4 : base.hp,
      radius: elite ? base.r * 1.25 : base.r,
      speed: elite ? base.speed * 0.95 : base.speed,
      damage: elite ? base.dmg * 1.6 : base.dmg,
      attackCd: 0,
      elite,
      flash: 0,
      alive: true,
    };
    this.enemies.push(e);
    return e;
  }

  private spawnPack(center: { x: number; y: number }, count: number, elite: boolean) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 40 + Math.random() * 60;
      const kinds: EnemyKind[] = ['emberling', 'sandwretch', 'cinderbrute'];
      const kind = elite && i === 0 ? 'cinderbrute' : kinds[i % kinds.length]!;
      this.spawnEnemy(center.x + Math.cos(ang) * dist, center.y + Math.sin(ang) * dist, kind, elite && i < 2);
    }
  }

  private beginAttack(kind: 'basic' | 'spiral' | 'ashwake', dur: number) {
    this.player.attackKind = kind;
    this.player.attackT = 1;
    this.player.atkDur = dur;
  }

  /** Face move dir, or nearest foe when attacking / stick idle. */
  private faceTowardCombat(preferAim: boolean) {
    const p = this.player;
    if (!preferAim && p.moving) return;
    let best: Enemy | null = null;
    let bestD = 160;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best) p.facing = Math.atan2(best.y - p.y, best.x - p.x);
  }

  private update(dt: number) {
    const p = this.player;
    this.animTime += dt;
    p.basicCd = Math.max(0, p.basicCd - dt);
    p.spiralCd = Math.max(0, p.spiralCd - dt);
    p.ashwakeCd = Math.max(0, p.ashwakeCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.ember = Math.min(MAX_EMBER, p.ember + 8 * dt);

    if (p.attackT > 0) {
      p.attackT = Math.max(0, p.attackT - dt / p.atkDur);
      if (p.attackT <= 0) p.attackKind = 'none';
    }

    const move = this.input.pollMove();
    const accel = 10;
    p.moveSmoothX += (move.x - p.moveSmoothX) * Math.min(1, accel * dt);
    p.moveSmoothY += (move.y - p.moveSmoothY) * Math.min(1, accel * dt);
    const mx = p.moveSmoothX;
    const my = p.moveSmoothY;
    const mLen = Math.hypot(mx, my);
    p.moving = mLen > 0.08;
    if (p.moving) {
      p.facing = Math.atan2(my, mx);
      const speed = PLAYER_SPEED * Math.min(1, mLen);
      const next = tryMove(p.x, p.y, mx * speed * dt, my * speed * dt, PLAYER_R);
      p.x = next.x;
      p.y = next.y;
      p.walkPhase += dt * 11 * Math.min(1, mLen);
      if (Math.random() < 0.5) {
        this.particles.push({
          x: p.x - Math.cos(p.facing) * 6,
          y: p.y - Math.sin(p.facing) * 6 + 10,
          vx: (Math.random() - 0.5) * 24,
          vy: Math.random() * 12,
          life: 0.35,
          maxLife: 0.35,
          color: '#a87840',
          size: 2,
        });
      }
    }

    const skills = this.input.consumeSkills();
    if (skills.basic) this.castBasic();
    if (skills.spiral) this.castSpiral();
    if (skills.ashwake) this.castAshwake();

    this.waveTimer -= dt;
    if (this.waveTimer <= 0 && this.enemies.filter((e) => e.alive).length < 10) {
      const spot = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)]!;
      this.spawnPack(spot, 3 + Math.floor(Math.random() * 2), false);
      this.waveTimer = 7 + Math.random() * 5;
    }
    if (!this.eliteSpawned && this.kills >= 8) {
      this.eliteSpawned = true;
      this.spawnPack(ELITE_PACK_CENTER, 5, true);
      this.toastMsg('Elitna četa pri Ashgates!');
    }

    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateAoE(dt);
    this.updateLoot(dt);
    this.updateFx(dt);
    this.updateHud();

    if (p.hp <= 0) {
      this.running = false;
      this.showEnd(false);
    } else if (this.eliteSpawned && this.enemies.every((e) => !e.alive) && this.kills >= 12) {
      if (!this.msg) {
        this.msg = 'Ashgates pomirjeni — poberi plen!';
        this.toastMsg(this.msg);
      }
    }
  }

  private castBasic() {
    const p = this.player;
    if (p.basicCd > 0) return;
    p.basicCd = BASIC_CD;
    this.faceTowardCombat(true);
    this.beginAttack('basic', 0.28);
    const reach = 62;
    const arc = 1.05;
    let hit = false;
    let anyCrit = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach + e.radius) continue;
      const ang = Math.atan2(dy, dx);
      let diff = Math.abs(((ang - p.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff > arc) continue;
      const crit = this.damageEnemy(e, 16 + Math.random() * 6, '#ffb060');
      if (crit) anyCrit = true;
      hit = true;
      // light knock
      const k = 28 / (dist || 1);
      e.x += dx * k * 0.15;
      e.y += dy * k * 0.15;
    }
    this.aoes.push({
      x: p.x + Math.cos(p.facing) * 30,
      y: p.y + Math.sin(p.facing) * 30,
      radius: 12,
      maxRadius: 48,
      life: 0.2,
      maxLife: 0.2,
      color: '#ff9040',
    });
    for (let i = 0; i < (hit ? 14 : 7); i++) {
      const a = p.facing + (Math.random() - 0.5) * arc;
      this.particles.push({
        x: p.x + Math.cos(a) * 24,
        y: p.y + Math.sin(a) * 24,
        vx: Math.cos(a) * (100 + Math.random() * 80),
        vy: Math.sin(a) * (100 + Math.random() * 80),
        life: 0.32,
        maxLife: 0.32,
        color: hit ? '#ffd080' : '#ffb060',
        size: 2.5 + Math.random() * 3.5,
      });
    }
    if (hit) {
      this.renderer.shake(anyCrit ? 7 : 5, anyCrit ? 0.16 : 0.12);
      this.renderer.flashHit(anyCrit ? 0.28 : 0.18);
      this.hitStop = anyCrit ? 0.05 : 0.028;
    }
  }

  private castSpiral() {
    const p = this.player;
    if (p.spiralCd > 0 || p.ember < SPIRAL_COST) return;
    p.ember -= SPIRAL_COST;
    p.spiralCd = SPIRAL_CD;
    this.beginAttack('spiral', 0.45);
    this.renderer.shake(8, 0.22);
    this.aoes.push({
      x: p.x,
      y: p.y,
      radius: 22,
      maxRadius: 115,
      life: 0.48,
      maxLife: 0.48,
      color: '#ff7030',
    });
    let any = false;
    let anyCrit = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 115 + e.radius) {
        const crit = this.damageEnemy(e, 28 + Math.random() * 10, '#ff8040');
        if (crit) anyCrit = true;
        any = true;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        e.x += (dx / len) * 22;
        e.y += (dy / len) * 22;
      }
    }
    for (let i = 0; i < 28; i++) {
      const a = (Math.PI * 2 * i) / 28;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * 180,
        vy: Math.sin(a) * 180,
        life: 0.55,
        maxLife: 0.55,
        color: i % 2 ? '#ff9030' : '#ffd080',
        size: 4.5,
      });
    }
    if (any) {
      this.renderer.flashHit(anyCrit ? 0.35 : 0.26);
      this.hitStop = 0.04;
    }
  }

  private castAshwake() {
    const p = this.player;
    if (p.ashwakeCd > 0 || p.ember < ASHWAKE_COST) return;
    p.ember -= ASHWAKE_COST;
    p.ashwakeCd = ASHWAKE_CD;
    this.faceTowardCombat(true);
    this.beginAttack('ashwake', 0.36);
    const dash = 155;
    const next = tryMove(p.x, p.y, Math.cos(p.facing) * dash, Math.sin(p.facing) * dash, PLAYER_R);
    for (let i = 0; i < 14; i++) {
      const t = i / 14;
      this.particles.push({
        x: p.x + (next.x - p.x) * t,
        y: p.y + (next.y - p.y) * t,
        vx: (Math.random() - 0.5) * 50,
        vy: (Math.random() - 0.5) * 50,
        life: 0.38,
        maxLife: 0.38,
        color: '#ff6020',
        size: 5 + Math.random() * 4,
      });
    }
    p.x = next.x;
    p.y = next.y;
    p.invuln = Math.max(p.invuln, 0.28);
    let hit = false;
    let anyCrit = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < 72 + e.radius) {
        const crit = this.damageEnemy(e, 34 + Math.random() * 12, '#ffe080');
        if (crit) anyCrit = true;
        hit = true;
      }
    }
    this.aoes.push({
      x: p.x,
      y: p.y,
      radius: 22,
      maxRadius: 74,
      life: 0.32,
      maxLife: 0.32,
      color: '#ffd060',
    });
    this.renderer.shake(hit ? (anyCrit ? 11 : 9) : 4, 0.18);
    if (hit) {
      this.renderer.flashHit(anyCrit ? 0.38 : 0.3);
      this.hitStop = 0.045;
    }
  }

  /** Returns true if crit. */
  private damageEnemy(e: Enemy, dmg: number, color: string): boolean {
    const crit = Math.random() < CRIT_CHANCE;
    const final = crit ? dmg * CRIT_MULT : dmg;
    e.hp -= final;
    e.flash = crit ? 0.22 : 0.16;
    const life = crit ? 1.0 : 0.75;
    this.floats.push({
      x: e.x + (Math.random() - 0.5) * 10,
      y: e.y - e.radius,
      text: `${Math.round(final)}`,
      color: crit ? '#ffe040' : color,
      life,
      maxLife: life,
      vy: crit ? -55 : -42,
      crit,
      scale: crit ? 1.35 : 1,
    });
    const sparks = crit ? 10 : 6;
    for (let i = 0; i < sparks; i++) {
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: (Math.random() - 0.5) * (crit ? 200 : 150),
        vy: (Math.random() - 0.5) * (crit ? 200 : 150),
        life: 0.28,
        maxLife: 0.28,
        color: crit ? '#ffe080' : color,
        size: 2.5 + Math.random() * (crit ? 3.5 : 2.5),
      });
    }
    if (e.hp <= 0) {
      e.alive = false;
      this.kills++;
      this.onEnemyDeath(e);
    }
    return crit;
  }

  private onEnemyDeath(e: Enemy) {
    for (let i = 0; i < (e.elite ? 22 : 12); i++) {
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.55,
        maxLife: 0.55,
        color: e.elite ? '#c080ff' : '#d06030',
        size: 3 + Math.random() * 3.5,
      });
    }
    this.renderer.shake(e.elite ? 9 : 3.5, e.elite ? 0.24 : 0.09);
    const drop = rollLoot(e.elite);
    if (drop) {
      const id = `loot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.loot.push({
        id,
        name: drop.name,
        nameSl: drop.nameSl,
        rarity: drop.rarity,
        x: e.x,
        y: e.y,
        vx: (Math.random() - 0.5) * 70,
        vy: (Math.random() - 0.5) * 70,
        life: 45,
      });
      const cls =
        drop.rarity === 'yellow' ? 'rarity-yellow' : drop.rarity === 'blue' ? 'rarity-blue' : 'rarity-white';
      this.lootToast.innerHTML = `<span class="${cls}">${drop.nameSl}</span>`;
    }
    this.player.ember = Math.min(MAX_EMBER, this.player.ember + (e.elite ? 18 : 6));
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.attackCd = Math.max(0, e.attackCd - dt);
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      if (dist > e.radius + PLAYER_R + 4) {
        const stepX = nx * e.speed * dt;
        const stepY = ny * e.speed * dt;
        const next = tryMove(e.x, e.y, stepX, stepY, e.radius);
        e.vx = (next.x - e.x) / dt;
        e.vy = (next.y - e.y) / dt;
        e.x = next.x;
        e.y = next.y;
      } else {
        e.vx = 0;
        e.vy = 0;
        if (e.attackCd <= 0 && p.invuln <= 0) {
          p.hp -= e.damage;
          p.invuln = 0.55;
          e.attackCd = 1.1;
          this.floats.push({
            x: p.x,
            y: p.y - 20,
            text: `-${Math.round(e.damage)}`,
            color: '#ff6666',
            life: 0.65,
            maxLife: 0.65,
            vy: -32,
          });
          this.renderer.shake(10, 0.22);
          this.renderer.flashHit(0.42);
        }
      }
    }
    if (this.enemies.length > 40) {
      this.enemies = this.enemies.filter((e) => e.alive || Math.random() > 0.5);
    }
  }

  private updateProjectiles(dt: number) {
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
    }
    this.projectiles = this.projectiles.filter((pr) => pr.life > 0);
  }

  private updateAoE(dt: number) {
    for (const a of this.aoes) {
      const t = 1 - a.life / a.maxLife;
      a.radius = a.maxRadius * Math.min(1, t * 1.4);
      a.life -= dt;
    }
    this.aoes = this.aoes.filter((a) => a.life > 0);
  }

  private updateLoot(dt: number) {
    const p = this.player;
    for (const it of this.loot) {
      it.life -= dt;
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.vx *= 0.9;
      it.vy *= 0.9;
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      // soft magnet
      if (d < 70 && d > 1) {
        it.vx += ((p.x - it.x) / d) * 220 * dt;
        it.vy += ((p.y - it.y) / d) * 220 * dt;
      }
      if (d < 30) {
        it.life = -1;
        const cls =
          it.rarity === 'yellow' ? 'rarity-yellow' : it.rarity === 'blue' ? 'rarity-blue' : 'rarity-white';
        this.lootToast.innerHTML = `<span class="${cls}">+ ${it.nameSl}</span>`;
        if (it.rarity === 'yellow') p.hp = Math.min(MAX_HP, p.hp + 15);
        if (it.rarity === 'blue') p.ember = Math.min(MAX_EMBER, p.ember + 20);
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: it.x,
            y: it.y,
            vx: (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 80 - 20,
            life: 0.35,
            maxLife: 0.35,
            color: it.rarity === 'yellow' ? '#ffd24a' : it.rarity === 'blue' ? '#6db3ff' : '#e8e4dc',
            size: 2 + Math.random() * 2,
          });
        }
      }
    }
    this.loot = this.loot.filter((l) => l.life > 0);
  }

  private updateFx(dt: number) {
    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    for (const f of this.floats) {
      f.y += f.vy * dt;
      f.life -= dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  private setCdOverlay(el: HTMLElement, btn: HTMLElement, cd: number, maxCd: number, blocked: boolean) {
    const show = cd > 0.02 || blocked;
    btn.classList.toggle('cd', show);
    if (cd > 0.02) {
      el.textContent = cd >= 1 ? `${Math.ceil(cd)}` : cd.toFixed(1);
      el.style.opacity = '1';
      const pct = Math.min(1, cd / maxCd);
      btn.style.setProperty('--cd-pct', `${pct * 100}%`);
    } else if (blocked) {
      el.textContent = '';
      el.style.opacity = '0';
      btn.style.setProperty('--cd-pct', '100%');
    } else {
      el.textContent = '';
      el.style.opacity = '0';
      btn.style.setProperty('--cd-pct', '0%');
    }
  }

  private updateHud() {
    const p = this.player;
    this.hpFill.style.width = `${(100 * p.hp) / MAX_HP}%`;
    this.emberFill.style.width = `${(100 * p.ember) / MAX_EMBER}%`;
    this.hpLabel.textContent = `Življenje ${Math.ceil(p.hp)}/${MAX_HP}`;
    this.emberLabel.textContent = `Žerjavica ${Math.ceil(p.ember)}/${MAX_EMBER}`;
    this.setCdOverlay(this.cdBasic, this.btnBasic, p.basicCd, BASIC_CD, false);
    this.setCdOverlay(this.cdSpiral, this.btnSpiral, p.spiralCd, SPIRAL_CD, p.ember < SPIRAL_COST);
    this.setCdOverlay(this.cdAshwake, this.btnAshwake, p.ashwakeCd, ASHWAKE_CD, p.ember < ASHWAKE_COST);
  }

  private toastMsg(t: string) {
    this.lootToast.textContent = t;
  }

  private showEnd(win: boolean) {
    this.overlay.classList.add('end-screen');
    this.overlay.classList.remove('hidden');
    const panel = this.overlay.querySelector('.panel')!;
    panel.innerHTML = `
      <img class="art-strip" src="./art/combat-key.webp" alt="" width="340" height="72" decoding="async" />
      <h1>${win ? 'Zmaga' : 'Padec'}</h1>
      <h2>Dolina · Ashgates</h2>
      <p>${win ? 'Ruševine so za trenutek utihnile.' : 'Ashblade je padel v peščeni prah. Poskusi znova.'}</p>
      <p>Ubitih: ${this.kills}</p>
      <button id="btn-start" type="button">Znova v Ashgates</button>
    `;
    panel.querySelector('#btn-start')!.addEventListener('click', () => this.start());
  }

  private draw(dt: number) {
    const p = this.player;
    this.renderer.resize();
    this.renderer.follow(p.x, p.y, p.facing, dt, p.moving);
    this.renderer.clear();
    this.renderer.drawLoot(this.loot);
    for (const e of this.enemies) {
      if (e.alive) this.renderer.drawEnemy(e);
    }
    this.renderer.drawAoE(this.aoes);
    this.renderer.drawProjectiles(this.projectiles);
    this.renderer.drawPlayer({
      x: p.x,
      y: p.y,
      facing: p.facing,
      moving: p.moving,
      walkPhase: p.walkPhase,
      attackT: p.attackT,
      attackKind: p.attackKind,
      invuln: p.invuln,
      time: this.animTime,
    });
    this.renderer.drawParticles(this.particles);
    this.renderer.drawFloating(this.floats);
    this.renderer.drawScreenFx();

    if (this.eliteSpawned) {
      const ctx = this.renderer.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(200,120,255,0.85)';
      ctx.font = 'bold 12px system-ui';
      ctx.fillText(`Plen: ${this.loot.length} · Ubiti: ${this.kills}`, 12, window.innerHeight - 150);
      ctx.restore();
    }
  }
}
