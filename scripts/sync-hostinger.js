import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const manifest = path.join(root, '.hostinger-output.json');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('Run npm run build before syncing Hostinger output.');
}

const entries = fs.readdirSync(dist);
const previous = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : [];
for (const name of previous) {
  fs.rmSync(path.join(root, name), { recursive: true, force: true });
}
for (const name of entries) {
  fs.cpSync(path.join(dist, name), path.join(root, name), { recursive: true, force: true });
}
fs.writeFileSync(manifest, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Synced ${entries.length} built entries to the Hostinger document root.`);
