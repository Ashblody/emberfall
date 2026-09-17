# Emberfall → Dolina combat prototype

Touch-first ARPG combat slice. Class: **Ashblade**. Zone: **Ashgates**. Branding: **Dolina** (URL stays Emberfall).

## Rendering

**2.5D Canvas** (not WebGL/Three.js) for phone FPS: procedural limb volumes with strong walk/attack read, head/arms, facing toward move/attack, mild isometric squash, smooth camera follow (phone-softened), hit flash/shake, crit numbers, loot nameplates.

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

Original names only — no third-party IP.
