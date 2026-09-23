/** Preload cropped Emberfall concept sprites for gameplay (phone-safe). */

export type ArtImages = {
  heroFront: HTMLImageElement | null;
  heroSide: HTMLImageElement | null;
  enemyA: HTMLImageElement | null;
  enemyB: HTMLImageElement | null;
  enemyC: HTMLImageElement | null;
  groundAsh: HTMLImageElement | null;
  groundLava: HTMLImageElement | null;
  decalRuin: HTMLImageElement | null;
};

const PATHS = {
  heroFront: './art/sprites/hero-front.webp',
  heroSide: './art/sprites/hero-side.webp',
  enemyA: './art/sprites/enemy-a.webp',
  enemyB: './art/sprites/enemy-b.webp',
  enemyC: './art/sprites/enemy-c.webp',
  groundAsh: './art/sprites/ground-ash.webp',
  groundLava: './art/sprites/ground-lava.webp',
  decalRuin: './art/sprites/decal-ruin.webp',
} as const;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

let cached: ArtImages | null = null;
let loadPromise: Promise<ArtImages> | null = null;

export function getArt(): ArtImages {
  return (
    cached ?? {
      heroFront: null,
      heroSide: null,
      enemyA: null,
      enemyB: null,
      enemyC: null,
      groundAsh: null,
      groundLava: null,
      decalRuin: null,
    }
  );
}

/** Resolves when hero + enemies + ground are loaded (or failed). Safe to call multiple times. */
export function loadArtAssets(): Promise<ArtImages> {
  if (cached) return Promise.resolve(cached);
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const entries = await Promise.all(
      (Object.keys(PATHS) as (keyof typeof PATHS)[]).map(async (key) => {
        const img = await loadImage(PATHS[key]);
        return [key, img] as const;
      }),
    );
    const art = Object.fromEntries(entries) as ArtImages;
    cached = art;
    return art;
  })();
  return loadPromise;
}

export function artReady(): boolean {
  const a = getArt();
  return !!(a.heroFront && a.enemyA && a.enemyB && a.enemyC && a.groundAsh);
}
