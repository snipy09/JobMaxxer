import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Hardcode official Supabase public endpoints for production client binaries
const DEFAULT_SUPABASE_URL = 'https://jympejesevicwleptfzq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbG...MbPA';

async function build() {
  console.log('[Build] Bundling main process and preload script with esbuild...');

  const define = {
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY),
  };

  // Ensure out/main directory exists
  fs.mkdirSync(path.join(__dirname, 'out/main'), { recursive: true });

  // Copy sql-wasm.wasm into out/main
  const possibleWasmPaths = [
    path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm'),
  ];
  const wasmDest = path.join(__dirname, 'out/main/sql-wasm.wasm');

  let wasmCopied = false;
  for (const src of possibleWasmPaths) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, wasmDest);
      console.log('[Build] Copied sql-wasm.wasm from ' + src + ' to out/main/');
      wasmCopied = true;
      break;
    }
  }

  if (!wasmCopied) {
    console.warn('[Build Warning] sql-wasm.wasm not found in node_modules/sql.js/dist');
  }

  // 1. Bundle Main Process
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/main/index.ts')],
    outfile: path.join(__dirname, 'out/main/index.js'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    define,
    external: [
      'electron',
      'fsevents',
    ],
    alias: {
      '@job-automator/automation': path.join(__dirname, '../../packages/automation/src/index.ts'),
      '@job-automator/scrapers': path.join(__dirname, '../../packages/scrapers/src/index.ts'),
      '@job-automator/supabase': path.join(__dirname, '../../packages/supabase/src/index.ts'),
      '@job-automator/email-verifier': path.join(__dirname, '../../packages/email-verifier/src/index.ts'),
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: process.env.NODE_ENV === 'production',
    banner: {
      js: '// Hirestack Main Process Bundle',
    },
  });

  // 2. Bundle Preload Script
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/main/preload.ts')],
    outfile: path.join(__dirname, 'out/main/preload.cjs'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    define,
    external: ['electron'],
    sourcemap: false,
    minify: process.env.NODE_ENV === 'production',
  });

  console.log('[Build] Main process & preload bundled successfully ✓');
}

build().catch((err) => {
  console.error('[Build Error]', err);
  process.exit(1);
});
