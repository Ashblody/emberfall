import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const zipPath = path.join(root, 'emberfall-usb.zip');
const readmeSrc = path.join(root, 'USB-README-SL.md');
const readmeDist = path.join(dist, 'PREBERI-USB.txt');

if (!fs.existsSync(dist)) {
  console.error('dist/ missing — run build first');
  process.exit(1);
}

fs.copyFileSync(readmeSrc, readmeDist);

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

execSync(`cd "${dist}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
console.log('Created', zipPath);
