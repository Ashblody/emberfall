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

try {
  execSync(`cd "${dist}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
} catch {
  // Fallback when system zip is unavailable
  execSync(
    `python3 -c "import zipfile; from pathlib import Path; d=Path(r'${dist}'); z=Path(r'${zipPath}');
zf=zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED);
[zf.write(p, p.relative_to(d).as_posix()) for p in sorted(d.rglob('*')) if p.is_file()]; zf.close(); print('Created', z)"`,
    { stdio: 'inherit' },
  );
}
console.log('Created', zipPath);
