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
