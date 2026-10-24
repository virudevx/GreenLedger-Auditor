import app from './app';

/**
 * Entry point for the hosted (Vercel) serverless function.
 *
 * It is bundled by scripts/build-api.mjs into a single self-contained
 * api/audit.mjs. Vercel transpiles api/ files one by one and ships only that
 * directory, so a function that imports ../server/app (or ../src/**) fails at
 * load with ERR_MODULE_NOT_FOUND. Bundling removes every cross-directory
 * import from the deployed artifact.
 */
export default app;
