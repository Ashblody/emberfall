
// Preload concept art for smooth first overlay paint
for (const src of [
  './art/valley-menu.webp',
  './art/combat-key.webp',
  './art/ashgate-portal.webp',
  './art/hero-sheet.webp',
  './art/enemy-set.webp',
]) {
  const img = new Image();
  img.src = src;
}

import { Game } from './game/Game';
import { Input } from './game/input';
import { Renderer } from './game/renderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const input = new Input(
  document.getElementById('move-stick')!,
  document.getElementById('move-knob')!,
  document.getElementById('btn-basic')!,
  document.getElementById('btn-spiral')!,
  document.getElementById('btn-ashwake')!,
);

const renderer = new Renderer(canvas, ctx);
const game = new Game(input, renderer);

document.getElementById('btn-start')!.addEventListener('click', () => game.start());

// Start-screen roster tabs (concept sheets only — gameplay sprites stay procedural)
const rosterSheet = document.getElementById('roster-sheet') as HTMLImageElement | null;
const rosterCaption = document.getElementById('roster-caption');
const rosterTabs = document.querySelectorAll<HTMLButtonElement>('.roster-tab');
const rosterViews: Record<string, { src: string; alt: string; caption: string }> = {
  hero: {
    src: './art/hero-sheet.webp',
    alt: 'Ashblade predogled',
    caption: 'Ashblade (predogled) · v igri še proceduralni sprite',
  },
  enemy: {
    src: './art/enemy-set.webp',
    alt: 'Sovražniki predogled',
    caption: 'Peščeni golemi (predogled) · v igri še proceduralni sprite',
  },
};

function setRoster(view: string) {
  const data = rosterViews[view];
  if (!data || !rosterSheet || !rosterCaption) return;
  rosterSheet.src = data.src;
  rosterSheet.alt = data.alt;
  rosterCaption.textContent = data.caption;
  rosterTabs.forEach((tab) => {
    const on = tab.dataset.roster === view;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

rosterTabs.forEach((tab) => {
  tab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setRoster(tab.dataset.roster || 'hero');
  });
});

// Register service worker for PWA offline core
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline SW optional in dev */
    });
  });
}

renderer.resize();
window.addEventListener('resize', () => renderer.resize());
