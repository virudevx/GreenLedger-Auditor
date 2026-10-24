/**
 * TEMPORARY DIAGNOSTIC (delete after debugging).
 * Proves whether the serverless runtime can invoke the simplest possible
 * function at all, independent of Express or the shared app.
 */
export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    runtime: process.version,
    region: process.env.VERCEL_REGION ?? null,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
  });
}
