import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app';
import { isGeminiConfigured } from './gemini';
import { BENCHMARK_CATALOG, BENCHMARK_DATASET_VERSION } from '../src/constants/benchmarks';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Production: serve the built static frontend. This lives here rather than in
// server/app.ts because only this long-lived Node process has a real `dist` on
// disk; the serverless function bundles its own copy of the API app and a
// module-URL lookup there is not portable across module formats.
const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist');
app.use(express.static(distPath));

// For SPA routing in production
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`[GreenLedger Auditor] Backend running on port ${PORT}`);
  console.log(`[GreenLedger Auditor] Gemini configured: ${isGeminiConfigured()}`);
  console.log(`[GreenLedger Auditor] Benchmark catalog loaded (${BENCHMARK_CATALOG.length} categories, v${BENCHMARK_DATASET_VERSION})`);
});
