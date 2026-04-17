import { build, context } from 'esbuild';
import { cpSync, rmSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';
const outDir = resolve(__dirname, 'dist');

const entryPoints = [
  'background.js',
  'content/content.js',
  'sidepanel/sidepanel.js',
  'options/options.js',
];

const buildConfig = {
  entryPoints: entryPoints.map(e => resolve(__dirname, e)),
  outdir: outDir,
  outbase: resolve(__dirname),
  bundle: true,
  target: 'chrome114',
  format: 'esm',
  minify: isProd,
  sourcemap: false,
};

function copyStaticFiles() {
  const files = [
    ['manifest.json', 'manifest.json'],
    ['content/content.css', 'content/content.css'],
    ['sidepanel/sidepanel.html', 'sidepanel/sidepanel.html'],
    ['sidepanel/sidepanel.css', 'sidepanel/sidepanel.css'],
    ['options/options.html', 'options/options.html'],
  ];

  for (const [src, dest] of files) {
    cpSync(resolve(__dirname, src), resolve(outDir, dest));
  }

  cpSync(resolve(__dirname, 'icons'), resolve(outDir, 'icons'), { recursive: true });
}

async function run() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  if (isWatch) {
    const ctx = await context(buildConfig);
    await ctx.watch();
    copyStaticFiles();
    console.log('Watching for changes...');
  } else {
    await build(buildConfig);
    copyStaticFiles();
    console.log(`Build complete (${isProd ? 'production' : 'development'}). Output in dist/`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
