import * as esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';

async function build() {
  const outDir = path.resolve('dist-electron');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  await esbuild.build({
    entryPoints: ['electron/main.ts'],
    outfile: 'dist-electron/main.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    external: ['electron', 'sql.js', 'better-sqlite3'],
    format: 'cjs',
    sourcemap: true,
  });

  await esbuild.build({
    entryPoints: ['electron/preload.ts'],
    outfile: 'dist-electron/preload.js',
    bundle: true,
    platform: 'node',
    target: 'node20',
    external: ['electron'],
    format: 'cjs',
    sourcemap: true,
  });

  console.log('Electron main & preload built successfully.');
}

build().catch((err) => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
