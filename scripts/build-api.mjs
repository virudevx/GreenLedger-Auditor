import { build } from 'esbuild';

/**
 * Bundles the shared Express app into one self-contained serverless function.
 *
 * Vercel transpiles each file under api/ individually and deploys only that
 * directory. A handler whose imports reach outside api/ therefore dies at load
 * with ERR_MODULE_NOT_FOUND ("Cannot find module '/var/task/server/app'"), which
 * surfaces as FUNCTION_INVOCATION_FAILED on every request. Emitting a single
 * .mjs file means the deployed function has no project imports left to resolve.
 */
const result = await build({
  entryPoints: ['server/vercel-entry.ts'],
  outfile: 'api/audit.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  mainFields: ['module', 'main'],
  // Express and friends are CommonJS; give the bundled ESM a real require().
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: 'warning',
});

if (result.errors.length > 0) {
  process.exit(1);
}

console.log('[build-api] wrote api/audit.mjs');
