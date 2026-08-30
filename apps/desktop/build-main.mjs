import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
  console.log('[Build] Bundling main process and preload script with esbuild...');

  // Bake the PUBLIC Supabase URL + anon key into the main bundle at build time.
  // After the secure RLS migration (002) the anon key can only read the public
  // job feed and call the authenticate_user() RPC, so it is safe to embed in the
  // shipped binary — this is what lets a customer's fresh install reach the
  // licensing server and sign in. The SERVICE ROLE key is deliberately NOT baked:
  // it stays a runtime process.env lookup, so it exists only on the operator's
  // own machine (admin panel) and is absent/inert on customer installs.
  const define = {
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
  };
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn(
      '[Build Warning] SUPABASE_URL / SUPABASE_ANON_KEY are not set in the build ' +
      'environment. The packaged app will not be able to reach the licensing ' +
      'server. Set them before running the production build/package.'
    );
  }

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
    format: 'esm',
    define,
    alias: {
      '@job-automator/automation': path.join(__dirname, '../../packages/automation/src/index.ts'),
      '@job-automator/scrapers': path.join(__dirname, '../../packages/scrapers/src/index.ts'),
      '@job-automator/supabase': path.join(__dirname, '../../packages/supabase/src/index.ts'),
      '@job-automator/email-verifier': path.join(__dirname, '../../packages/email-verifier/src/index.ts'),
    },
    banner: {
      js: "import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);"
    },
    external: [
      'electron',
      'playwright',
      'playwright-core',
      'playwright-extra',
      'puppeteer-extra-plugin-stealth',
      'sql.js',
      'fsevents'
    ],
    sourcemap: false,
    minify: false,
    logLevel: 'info',
  });

  // 2. Bundle Preload Script
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/main/preload.ts')],
    outfile: path.join(__dirname, 'out/main/preload.cjs'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['electron'],
    sourcemap: false,
    minify: false,
    logLevel: 'info',
  });

  // Duplicate as preload.js for compatibility
  fs.copyFileSync(
    path.join(__dirname, 'out/main/preload.cjs'),
    path.join(__dirname, 'out/main/preload.js')
  );

  console.log('[Build] Main process & preload bundled successfully ✓');
}

build().catch(err => {
  console.error('[Build Error]', err);
  process.exit(1);
});
