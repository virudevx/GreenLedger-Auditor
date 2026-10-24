/**
 * Vercel serverless entry point.
 *
 * The deployed site is a static Vite build; without this function there is no
 * `/api/audit` route at all, so every audit failed with HTTP 404. Vercel invokes
 * the default export as a Node (req, res) handler, so the shared Express app is
 * mounted as-is — one implementation for local dev and the hosted deployment.
 */
import app from '../server/app';

export default app;
