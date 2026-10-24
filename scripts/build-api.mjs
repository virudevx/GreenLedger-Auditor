import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Bundles the shared Express app into one self-contained serverless function.
 *
 * Vercel transpiles each file under api/ individually and deploys only that
 * directory. A handler whose imports reach outside api/ therefore dies at load
 * with ERR_MODULE_NOT_FOUND ("Cannot find module '/var/task/server/app'"), which
 * surfaces as FUNCTION_INVOCATION_FAILED on every request. Emitting a single
 * file means the deployed function has no project imports left to resolve.
 *
 * The output is committed because a function entry that only exists after the
 * build was not picked up when this was tested. That is the observed behaviour,
 * not an isolated cause: the failing attempt also used a `.mjs` entry, so an
 * unsupported extension and a build-time-generated entry are both consistent
 * with the evidence. See "Deployment → Vercel" in the README.
 *
 * Exported so tests/deployed-function.test.ts can build into a temp directory
 * with exactly these options and prove the committed artifact matches source.
 */
export const DEFAULT_API_OUTFILE = 'api/audit.js';

export async function buildApiBundle(outfile = DEFAULT_API_OUTFILE) {
  return build({
    entryPoints: ['server/vercel-entry.ts'],
    outfile,
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
}

// Only build when run directly (`npm run build:api`), not when imported by tests.
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await buildApiBundle();
  console.log(`[build-api] wrote ${DEFAULT_API_OUTFILE}`);
}
