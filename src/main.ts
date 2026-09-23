
import { Game } from './game/Game';
import { Input } from './game/input';
import { Renderer } from './game/renderer';
import { loadArtAssets } from './game/artAssets';

// Preload overlay concept art + gameplay sprites
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

// Gameplay sprites resolve before first start for ash ground + characters
const artReady = loadArtAssets();

document.getElementById('btn-start')!.addEventListener('click', () => {
  void artReady.then(() => game.start());
});

// Start-screen roster tabs (same concept sheets; gameplay now uses cropped sprites)
const rosterSheet = document.getElementById('roster-sheet') as HTMLImageElement | null;
const rosterCaption = document.getElementById('roster-caption');
const rosterTabs = document.querySelectorAll<HTMLButtonElement>('.roster-tab');
const rosterViews: Record<string, { src: string; alt: string; caption: string }> = {
  hero: {
    src: './art/hero-sheet.webp',
    alt: 'Ashblade predogled',
    caption: 'Ashblade · v igri concept art sprite',
  },
  enemy: {
    src: './art/enemy-set.webp',
    alt: 'Sovražniki predogled',
    caption: 'Peščeni golemi · v igri concept art sprite',
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
