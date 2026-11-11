// Assembles chispa.html from chispa-shell.html plus the parts named in CONTRACT-chispa.md:
// chispa-core.js (required), chispa-audio.js, chispa-ui.js and chispa-ui.css (optional while
// their workers are still building them). Usage: node build-chispa.mjs [previewDir]
// With previewDir it also writes chispa-preview.html wrapped in a document skeleton for local browser tests.
// It always writes dist/ (index.html + og.png), the folder that is deployed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f, required) => {
  const p = path.join(here, f);
  if (!fs.existsSync(p)) { if (required) throw new Error(`${f} is missing`); console.log(`  ${f}: not present, left out`); return ''; }
  const s = fs.readFileSync(p, 'utf8');
  if (/<\/script/i.test(s)) throw new Error(`${f} contains a closing script tag; it cannot be inlined`);
  if (/<\/style/i.test(s)) throw new Error(`${f} contains a closing style tag; it cannot be inlined`);
  console.log(`  ${f}: ${(s.length / 1024).toFixed(1)} KB`);
  return s.trim();
};
let out = fs.readFileSync(path.join(here, 'chispa-shell.html'), 'utf8');
const parts = [
  ['/*__CHISPA_CORE__*/', read('chispa-core.js', true)],
  ['/*__CHISPA_AUDIO__*/', read('chispa-audio.js', false)],
  ['/*__CHISPA_UI__*/', read('chispa-ui.js', false)],
  ['/*__CHISPA_UI_CSS__*/', read('chispa-ui.css', false)]
];
// Guard: hide the UI's loop indicator until the UI stylesheet actually styles it (avoids shipping a raw list).
if (parts[3][1] && !parts[3][1].includes('.ch-loop')) {
  parts[3][1] += '\n/* build guard: loop indicator hidden until chispa-ui.css styles it */\n#ch-ui .ch-loop { display: none !important; }';
  console.log('  guard: .ch-loop hidden (no styles yet)');
}
for (const [marker, body] of parts) {
  if (!out.includes(marker)) throw new Error(`placeholder ${marker} missing in the shell`);
  out = out.replace(marker, () => body || `/* ${marker.slice(4, -4).toLowerCase()} not included */`);
}
fs.writeFileSync(path.join(here, 'chispa.html'), out);
// dist/: the only folder that gets deployed. The game as index.html, a full document so link
// previews read the Open Graph tags from <head>, plus the Open Graph image from docs/img/og.png.
const dist = path.join(here, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
const doc = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + out + '\n</html>\n';
fs.writeFileSync(path.join(dist, 'index.html'), doc);
const og = path.join(here, 'docs', 'img', 'og.png');
if (fs.existsSync(og)) fs.copyFileSync(og, path.join(dist, 'og.png'));
else console.log('  docs/img/og.png: not present, dist/ has no Open Graph image');
console.log(`dist/index.html written (${(doc.length / 1024).toFixed(1)} KB)`);
const previewDir = process.argv[2];
if (previewDir) {
  const preview = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n' + out + '\n</body></html>';
  fs.writeFileSync(path.join(previewDir, 'chispa-preview.html'), preview);
}
console.log(`chispa.html written (${(out.length / 1024).toFixed(1)} KB)`);
