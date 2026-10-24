/**
 * TEMPORARY DIAGNOSTIC (delete after debugging).
 * Loads the shared Express app inside a try/catch so the real module-load
 * failure is returned as JSON instead of Vercel's generic crash page.
 */
export default async function handler(_req: any, res: any) {
  try {
    const mod = await import('../server/app');
    res.status(200).json({
      ok: true,
      handlerType: typeof mod.default,
      arity: typeof mod.default === 'function' ? (mod.default as any).length : null,
      runtime: process.version,
    });
  } catch (err: any) {
    res.status(200).json({
      ok: false,
      name: err?.name ?? null,
      code: err?.code ?? null,
      message: err?.message ?? String(err),
      stack: String(err?.stack ?? '').split('\n').slice(0, 12),
    });
  }
}
