# Emberfall

Touch-first ARPG prototype. Class: **Ashblade**. Dungeon zone: **Ashgates**.

## Rendering

**2.5D Canvas** (not WebGL/Three.js) for phone FPS: procedural limb volumes with walk cycle, attack swings, readable head/arms, isometric-ish squash. Smooth camera follow, hit flash/shake, impact particles.

## Play locally

```bash
npm install
npm run dev
```

Preview production build:

```bash
npm run build
npm run preview
```

`npm run build` also writes `emberfall-usb.zip` (static files + Slovenian USB README).

## Live

https://ashblody.github.io/emberfall/

## PWA

- `public/manifest.webmanifest`
- `public/sw.js` (offline core assets)
- Icons under `public/icons/`

## Controls

- Move: virtual stick or WASD
- Skills: big bottom buttons or keys 1 / 2 / 3
  - Pepelni Udar (basic)
  - Žerjavni Vrtinec (AoE)
  - Pepelni Prebud (dash strike)

Original names only — no Blizzard IP.
