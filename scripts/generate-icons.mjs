// Generate Chrome PNG assets from the approved glass bookmark artwork.
// Requires ImageMagick (convert or magick) with PNG support.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public/icons/icon-source.png');
if (!existsSync(source)) throw new Error('Missing icon-source.png');
let converter;
for (const binary of ['magick', 'convert']) {
  try { execFileSync(binary, ['-version'], { stdio: 'ignore' }); converter = binary; break; }
  catch { /* Try the other ImageMagick command. */ }
}
if (!converter) throw new Error('Install ImageMagick to regenerate extension icons.');
for (const size of [16, 32, 48, 128]) {
  execFileSync(converter, [source, '-fuzz', '8%', '-trim', '+repage', '-filter', 'Lanczos', '-resize', `${size}x${size}`, '-gravity', 'center', '-background', 'none', '-extent', `${size}x${size}`, '-strip', path.join(root, `public/icons/icon${size}.png`)]);
  console.log(`Generated ${size}x${size} icon`);
}
