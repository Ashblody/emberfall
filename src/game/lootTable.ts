import type { Rarity } from './types';

export interface LootDef {
  name: string;
  nameSl: string;
  rarity: Rarity;
}

const WHITE: LootDef[] = [
  { name: 'Sandwoven Cord', nameSl: 'Peščena vrvica', rarity: 'white' },
  { name: 'Cracked Ember Shard', nameSl: 'Razpokan žerjavčni drobec', rarity: 'white' },
  { name: 'Ruin Dust Pouch', nameSl: 'Vrečka ruinastega prahu', rarity: 'white' },
  { name: 'Sunbleached Strap', nameSl: 'Osončeni jermen', rarity: 'white' },
  { name: 'Ashglass Chip', nameSl: 'Pepelnati odlomek', rarity: 'white' },
];

const BLUE: LootDef[] = [
  { name: 'Ruinbound Greaves', nameSl: 'Ruševne škornje', rarity: 'blue' },
  { name: 'Ashglass Band', nameSl: 'Pepelni obroč', rarity: 'blue' },
  { name: 'Gate-Sand Mantle', nameSl: 'Plašč peščene brane', rarity: 'blue' },
  { name: 'Cinderthread Wrap', nameSl: 'Žerjavčni ovoj', rarity: 'blue' },
];

const YELLOW: LootDef[] = [
  { name: 'Sunscar Brand', nameSl: 'Sončna brazgotina', rarity: 'yellow' },
  { name: "Gatekeeper's Relic", nameSl: 'Relikvija vratarja', rarity: 'yellow' },
  { name: 'Emberfall Signet', nameSl: 'Pečat Emberfall', rarity: 'yellow' },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function rollLoot(elite: boolean): LootDef | null {
  const r = Math.random();
  if (elite) {
    if (r < 0.35) return pick(YELLOW);
    if (r < 0.75) return pick(BLUE);
    return pick(WHITE);
  }
  if (r < 0.08) return pick(BLUE);
  if (r < 0.55) return pick(WHITE);
  return null;
}
