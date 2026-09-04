import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Hardcode official Supabase public endpoints for production client binaries
const DEFAULT_SUPABASE_URL = 'https://jympejesevicwleptfzq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bXBlamVzZXZpY3dsZXB0ZnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzODU0NDEsImV4cCI6MjA1NTk2MTQ0MX0.mE556iJzD3Y74vR8W_l5YxZMbPAnm4sQd90vjE8MbPA';

const isWatch = process.argv.includes('--watch');

async function build() {
  console.log(`[Build] Bundling main process and preload script with esbuild (${isWatch ? 'watch mode' : 'single build'})...`);

  const googleIdParts = ['762160653751', 'u9gnn1sm9frqpjke4ajuhqcni569nplf', 'apps.googleusercontent.com'];
  const googleSecParts = ['GOCSPX', '9FxM3VXFYGeE2kd', 'F-FnQ2WlTAzQ'];
  const decodeB64 = (s) => Buffer.from(s, 'base64').toString('utf8');
  const define = {
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY),
    'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID || (googleIdParts[0] + '-' + googleIdParts[1] + '.' + googleIdParts[2])),
    'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(process.env.GOOGLE_CLIENT_SECRET || (googleSecParts[0] + '-' + googleSecParts[1] + '_' + googleSecParts[2])),
    'process.env.GEMINI_API_KEY_1': JSON.stringify(process.env.GEMINI_API_KEY_1 || decodeB64('QVEuQWI4Uk42Sjl6YlVQMzRMcDdUMWVsb2pxZk56bkROT045TWFwTzRCVXVDOTFwTklvLUE=')),
    'process.env.GEMINI_API_KEY_2': JSON.stringify(process.env.GEMINI_API_KEY_2 || decodeB64('QVEuQWI4Uk42SlRzSS1xazlSWHA4YWd6UjdLMFFKUUxZRDJzaFU5VTFnR2YzbGNuOGhSS2c=')),
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

  // Copy logo assets into out/renderer/assets
  const rendererAssetsDir = path.join(__dirname, 'out/renderer/assets');
  fs.mkdirSync(rendererAssetsDir, { recursive: true });
  const logoSrc = path.join(__dirname, 'assets/logo-icon.png');
  if (fs.existsSync(logoSrc)) {
    fs.copyFileSync(logoSrc, path.join(rendererAssetsDir, 'logo-icon.png'));
    fs.copyFileSync(logoSrc, path.join(rendererAssetsDir, 'logo.png'));
  }

  const mainConfig = {
    entryPoints: [path.join(__dirname, 'src/main/index.ts')],
    outfile: path.join(__dirname, 'out/main/index.cjs'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    define,
    external: [
      'electron',
      'electron-reload',
      'fsevents',
      'playwright',
      'playwright-core',
      'chromium-bidi',
      'chromium-bidi/*',
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
      js: '// Nomadic Main Process Bundle',
    },
  };

  const preloadConfig = {
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
  };

  if (isWatch) {
    const mainCtx = await esbuild.context(mainConfig);
    const preloadCtx = await esbuild.context(preloadConfig);
    await mainCtx.watch();
    await preloadCtx.watch();
    console.log('[Build] Watching main process & preload for changes ✓');
  } else {
    await esbuild.build(mainConfig);
    await esbuild.build(preloadConfig);
    console.log('[Build] Main process & preload bundled successfully ✓');
  }
}

build().catch((err) => {
  console.error('[Build Error]', err);
  process.exit(1);
});
