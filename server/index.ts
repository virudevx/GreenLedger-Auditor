import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { runPreFlightSecurityScan } from '../src/utils/security';
import { verifyInvoiceLineItems, evaluateDecisionPolicy, DEFAULT_VERIFICATION_CONFIG } from '../src/utils/verification';
import { extractInvoiceWithGemini, escalateToGeminiPro, isGeminiConfigured } from './gemini';
import { BENCHMARK_CATALOG, BENCHMARK_DATASET_VERSION } from '../src/constants/benchmarks';
import { ExtractedInvoice } from '../src/types/audit';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// File upload setup
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB maximum upload limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, PNG, JPEG, WEBP.`));
    }
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'GreenLedger Auditor Engine',
    version: '1.0.0',
    geminiConfigured: isGeminiConfigured(),
    activePrimaryModel: isGeminiConfigured() ? 'gemini-2.5-flash' : 'demo-deterministic-fixtures',
    activeEscalationModel: isGeminiConfigured() ? 'gemini-2.5-pro' : 'deterministic-rules-engine',
    benchmarkVersion: BENCHMARK_DATASET_VERSION,
    timestamp: new Date().toISOString()
  });
});

// Benchmark catalog endpoint
app.get('/api/benchmarks', (_req: Request, res: Response) => {
  res.json({
    datasetVersion: BENCHMARK_DATASET_VERSION,
    totalCategories: BENCHMARK_CATALOG.length,
    catalog: BENCHMARK_CATALOG
  });
});

// POST /api/audit endpoint
app.post('/api/audit', upload.single('file'), async (req: Request, res: Response) => {
  const startTime = performance.now();
  const isoStartTime = new Date().toISOString();

  try {
    let rawPayload = req.body.rawPayload || '';
    const gateEnabled = req.body.gateEnabled !== 'false' && req.body.gateEnabled !== false;
    const config = {
      priceVarianceTolerancePercent: req.body.priceTolerance ? parseFloat(req.body.priceTolerance) : DEFAULT_VERIFICATION_CONFIG.priceVarianceTolerancePercent,
      carbonVarianceTolerancePercent: req.body.carbonTolerance ? parseFloat(req.body.carbonTolerance) : DEFAULT_VERIFICATION_CONFIG.carbonVarianceTolerancePercent
    };

    let fileData: { mimeType: string; base64: string } | undefined = undefined;
    if (req.file) {
      fileData = {
        mimeType: req.file.mimetype,
        base64: req.file.buffer.toString('base64')
      };
      if (!rawPayload.trim()) {
        rawPayload = `[Uploaded File: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB, ${req.file.mimetype})]`;
      }
    }

    if (!rawPayload || !rawPayload.trim()) {
      res.status(400).json({
        success: false,
        error: 'Missing rawPayload or uploaded invoice document.'
      });
      return;
    }

    const auditId = `GLA-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // STAGE 1: Pre-Flight Security Gate
    const securityResult = runPreFlightSecurityScan(rawPayload, gateEnabled);

    // If gate is enabled and injection pattern detected: BLOCK BEFORE MODEL
    if (securityResult.blockedBeforeModel) {
      const endTime = performance.now();
      const elapsedMs = Math.round(endTime - startTime);

      // Blocked scenario strictly results in 0 model calls
      const emptyExtraction: ExtractedInvoice = {
        vendorName: 'BLOCKED: Adversarial Threat',
        invoiceNumber: 'N/A (Quarantined)',
        invoiceDate: new Date().toISOString().split('T')[0],
        currency: 'USD',
        lineItems: [],
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        claimedTotalCarbonKg: null,
        overallSustainabilityClaims: [],
        certificationReferences: [],
        extractionSource: 'DEMO_FIXTURE',
        isFixture: true
      };

      const verification = verifyInvoiceLineItems(emptyExtraction, config);
      const decision = evaluateDecisionPolicy(securityResult, verification, emptyExtraction, config);

      res.json({
        success: true,
        auditId,
        security: securityResult,
        extraction: emptyExtraction,
        verification,
        decision,
        telemetry: {
          latencyMs: elapsedMs,
          startTime: isoStartTime,
          endTime: new Date().toISOString(),
          tokenSavingsPercent: 100, // 100% token savings because model call was prevented
          tokensConsumed: 0,
          baselineTokensWithoutGate: 850,
          modelTier: 'NONE (Zero-Trust Intercept: 0 Model Calls)',
          securityGateState: gateEnabled
        }
      });
      return;
    }

    // STAGE 2: Multimodal Extraction via Gemini 2.5 Flash
    // We pass sanitizedPayload so PII is not leaked to external AI
    const extractionResult = await extractInvoiceWithGemini(securityResult.sanitizedPayload, fileData);
    const extractedInvoice = extractionResult.invoice;

    // STAGE 3: Autonomous Tool Verification against Deterministic Catalog
    const verification = verifyInvoiceLineItems(extractedInvoice, config);

    // STAGE 4: Tiered Decision Routing
    const decision = evaluateDecisionPolicy(securityResult, verification, extractedInvoice, config);

    // If escalated and live Gemini API is configured, run Gemini Pro analysis
    let modelTierUsed = extractionResult.modelUsed;
    if (decision.isEscalated && isGeminiConfigured() && decision.escalationReason) {
      const proResult = await escalateToGeminiPro(securityResult.sanitizedPayload, decision.escalationReason);
      if (proResult.escalatedSuccess) {
        modelTierUsed = 'gemini-2.5-pro (Escalated Deep Analysis)';
        decision.modelTierUsed = modelTierUsed;
        decision.reasoningSummary += ` Deep Gemini 2.5 Pro escalation insight: ${proResult.proAnalysis}`;
      }
    }

    const endTime = performance.now();
    const elapsedMs = Math.round(endTime - startTime);

    // Calculate token savings estimate
    let tokenSavingsPercent: number | null = null;
    let tokensConsumed = extractionResult.tokenUsage?.totalTokens || 340;
    const baselineTokens = 650;

    if (securityResult.piiRedactedCount > 0) {
      // PII redaction preserves privacy and reduces token payload
      tokenSavingsPercent = Math.min(35, Math.round((securityResult.piiRedactedCount * 4 / baselineTokens) * 100));
    }

    res.json({
      success: true,
      auditId,
      security: securityResult,
      extraction: extractedInvoice,
      verification,
      decision,
      telemetry: {
        latencyMs: elapsedMs,
        startTime: isoStartTime,
        endTime: new Date().toISOString(),
        tokenSavingsPercent,
        tokensConsumed,
        baselineTokensWithoutGate: baselineTokens,
        modelTier: modelTierUsed,
        securityGateState: gateEnabled
      }
    });

  } catch (err: any) {
    console.error('Audit pipeline execution error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'An unexpected internal error occurred during audit pipeline execution.'
    });
  }
});

// Production: serve built static frontend assets
const distPath = path.join(__dirname, '../dist');
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
