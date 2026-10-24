import app from './app';
import { isGeminiConfigured } from './gemini';
import { BENCHMARK_CATALOG, BENCHMARK_DATASET_VERSION } from '../src/constants/benchmarks';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Start server
app.listen(PORT, () => {
  console.log(`[GreenLedger Auditor] Backend running on port ${PORT}`);
  console.log(`[GreenLedger Auditor] Gemini configured: ${isGeminiConfigured()}`);
  console.log(`[GreenLedger Auditor] Benchmark catalog loaded (${BENCHMARK_CATALOG.length} categories, v${BENCHMARK_DATASET_VERSION})`);
});
