import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { FileCheck2, Loader2 } from 'lucide-react';
import {
  AuditCertificate,
  AuditLogEntry,
  DecisionResult,
  ExtractedInvoice,
  ScenarioLastRun,
  SecurityGateResult,
  StageProgress,
  TelemetryData,
  VerificationResult,
} from './types/audit';
import { DEMO_SCENARIOS, DemoScenario } from './constants/scenarios';
import { BENCHMARK_DATASET_VERSION } from './constants/benchmarks';
import { runPreFlightSecurityScan } from './utils/security';
import { evaluateDecisionPolicy, verifyInvoiceLineItems } from './utils/verification';
import { generateEntryHash } from './utils/crypto';
import {
  downloadAuditCertificate,
  loadAuditLogFromStorage,
  loadPreferences,
  saveAuditLogToStorage,
  savePreferences,
} from './utils/storage';

import { Sidebar } from './components/Sidebar';
import { TelemetryHeader } from './components/TelemetryHeader';
import { ScenarioSelector } from './components/ScenarioSelector';
import { DocumentIngestion } from './components/DocumentIngestion';
import { PrivacyTwinPanel } from './components/PrivacyTwinPanel';

const PipelineStepper = lazy(() => import('./components/PipelineStepper').then((module) => ({ default: module.PipelineStepper })));
const VerdictCard = lazy(() => import('./components/VerdictCard').then((module) => ({ default: module.VerdictCard })));
const AuditLedger = lazy(() => import('./components/AuditLedger').then((module) => ({ default: module.AuditLedger })));
const BenchmarkModal = lazy(() => import('./components/BenchmarkModal').then((module) => ({ default: module.BenchmarkModal })));

const AsyncPanelFallback: React.FC = () => (
  <div className="flex min-h-[120px] items-center justify-center rounded-card border border-border bg-surface/70 font-mono text-[10px] text-text-muted">
    Loading audit workspace…
  </div>
);

const createIdleStages = (): StageProgress[] => [
  { stageNumber: 1, name: 'Pre-Flight Security Gate', state: 'IDLE', summary: 'Deterministic PII & prompt-injection checks.' },
  { stageNumber: 2, name: 'Multimodal Extraction', state: 'IDLE', summary: 'Structured Gemini 2.5 Flash parsing.' },
  { stageNumber: 3, name: 'Autonomous Tool Verification', state: 'IDLE', summary: 'Deterministic catalog & Scope 3 matching.' },
  { stageNumber: 4, name: 'Tiered Decision Routing', state: 'IDLE', summary: 'Zero-trust ERP policy enforcement.' },
];

const formatVerdict = (verdict: string) => verdict.replace(/_/g, ' ');

/**
 * Client-side heuristic parser used only when the backend is unreachable and the
 * document is not one of the deterministic demo fixtures.
 */
function parseCustomInvoiceText(text: string): ExtractedInvoice {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  let vendorName = 'Custom Vendor';
  let invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
  let invoiceDate = new Date().toISOString().split('T')[0];
  let currency = 'USD';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('vendor:') || lower.startsWith('issuer:') || lower.startsWith('supplier:') || lower.startsWith('from:')) {
      vendorName = line.split(':').slice(1).join(':').trim() || vendorName;
    }
    if (lower.startsWith('invoice:') || lower.startsWith('invoice no') || lower.startsWith('inv:') || lower.startsWith('invoice #')) {
      invoiceNumber = line.split(':').slice(1).join(':').trim() || invoiceNumber;
    }
    if (lower.startsWith('date:') || lower.startsWith('invoice date:')) {
      invoiceDate = line.split(':').slice(1).join(':').trim() || invoiceDate;
    }
    if (lower.startsWith('currency:')) {
      currency = line.split(':').slice(1).join(':').trim().toUpperCase() || currency;
    }
  }

  const lineItems: ExtractedInvoice['lineItems'] = [];
  let currentItem: { desc?: string; qty?: number; unit?: string; price?: number; carbon?: number | null } = {};
  let itemIndex = 0;

  for (const line of lines) {
    const lower = line.toLowerCase();

    const itemMatch = line.match(/^(?:\d+[\.\)]\s*|-\s*)(.+)/);
    if (itemMatch && !lower.includes('quantity') && !lower.includes('price') && !lower.includes('total') && !lower.includes('carbon')) {
      if (currentItem.desc && currentItem.qty && currentItem.price) {
        itemIndex += 1;
        lineItems.push({
          id: `item-${itemIndex}`,
          description: currentItem.desc,
          category: '',
          quantity: currentItem.qty,
          unit: currentItem.unit || 'unit',
          billedUnitPrice: currentItem.price,
          lineTotal: currentItem.qty * currentItem.price,
          claimedCarbonKg: currentItem.carbon ?? null,
          sustainabilityClaims: [],
          certificationRefs: [],
        });
      }
      currentItem = { desc: itemMatch[1].trim() };
      continue;
    }

    const qtyMatch = line.match(/(?:quantity|qty)[:\s]*([0-9,]+(?:\.\d+)?)\s*(\w+)?/i);
    if (qtyMatch) {
      currentItem.qty = parseFloat(qtyMatch[1].replace(/,/g, ''));
      if (qtyMatch[2]) currentItem.unit = qtyMatch[2];
    }

    const priceMatch = line.match(/(?:unit\s*price|price|rate)[:\s]*\$?([0-9,]+(?:\.\d+)?)/i);
    if (priceMatch) currentItem.price = parseFloat(priceMatch[1].replace(/,/g, ''));

    const billedMatch = line.match(/(?:billed)[^:]*[:\s]*\$?([0-9,]+(?:\.\d+)?)/i);
    if (billedMatch && !currentItem.price) currentItem.price = parseFloat(billedMatch[1].replace(/,/g, ''));

    const unitMatch = line.match(/([0-9,]+)\s+(unit|units|L|liters?|km|rolls?|pcs|ea|kg|gallons?|m|meters?)\b/i);
    if (unitMatch && !currentItem.unit) currentItem.unit = unitMatch[2];

    const carbonMatch = line.match(/(?:carbon|co2|co₂|emissions?)[:\s]*([0-9,]+(?:\.\d+)?)\s*(?:kg)?/i);
    if (carbonMatch) currentItem.carbon = parseFloat(carbonMatch[1].replace(/,/g, ''));
  }

  if (currentItem.desc && currentItem.qty && currentItem.price) {
    itemIndex += 1;
    lineItems.push({
      id: `item-${itemIndex}`,
      description: currentItem.desc,
      category: '',
      quantity: currentItem.qty,
      unit: currentItem.unit || 'unit',
      billedUnitPrice: currentItem.price,
      lineTotal: currentItem.qty * currentItem.price,
      claimedCarbonKg: currentItem.carbon ?? null,
      sustainabilityClaims: [],
      certificationRefs: [],
    });
  }

  if (lineItems.length === 0) {
    let totalAmount = 0;
    for (const line of lines) {
      const totalMatch = line.match(/(?:total|amount)[:\s]*\$?([0-9,]+(?:\.\d+)?)/i);
      if (totalMatch) totalAmount = parseFloat(totalMatch[1].replace(/,/g, '')) || 0;
    }
    lineItems.push({
      id: 'item-1',
      description: 'Extracted line item (heuristic parse)',
      category: '',
      quantity: 1,
      unit: 'unit',
      billedUnitPrice: totalAmount || 100,
      lineTotal: totalAmount || 100,
      claimedCarbonKg: null,
      sustainabilityClaims: [],
      certificationRefs: [],
    });
  }

  const totalAmount = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalCarbonKg = lineItems.reduce((sum, item) => sum + (item.claimedCarbonKg || 0), 0);

  return {
    vendorName,
    invoiceNumber,
    invoiceDate,
    currency,
    lineItems,
    subtotal: totalAmount,
    totalAmount,
    claimedTotalCarbonKg: totalCarbonKg > 0 ? totalCarbonKg : null,
    extractionSource: 'LOCAL_HEURISTIC',
    isFixture: false,
  };
}

const shadowCorpFallbackInvoice = (): ExtractedInvoice => ({
  vendorName: 'ShadowCorp Freight & Logistics',
  invoiceNumber: 'INV-2026-SHDW-666',
  invoiceDate: '2026-02-21',
  currency: 'USD',
  lineItems: [
    {
      id: 'item-1',
      description: 'Hazardous Chemical Cross-Border Transport',
      category: 'Logistics',
      quantity: 2500,
      unit: 'km',
      billedUnitPrice: 38.0,
      lineTotal: 95000.0,
      claimedCarbonKg: 0,
      sustainabilityClaims: ['Claimed 0 kg CO2e emissions'],
      certificationRefs: [],
    },
  ],
  subtotal: 95000.0,
  taxAmount: 0,
  totalAmount: 95000.0,
  claimedTotalCarbonKg: 0,
  extractionSource: 'DEMO_FIXTURE',
  isFixture: true,
});

export const App: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('clean');
  const [rawPayload, setRawPayload] = useState<string>(DEMO_SCENARIOS[0].rawInvoiceText);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [gateEnabled, setGateEnabled] = useState<boolean>(true);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState<boolean>(false);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [stages, setStages] = useState<StageProgress[]>(createIdleStages);
  const [lastRuns, setLastRuns] = useState<Record<string, ScenarioLastRun>>({});

  const [securityResult, setSecurityResult] = useState<SecurityGateResult | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractedInvoice | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);

  const [ledgerEntries, setLedgerEntries] = useState<AuditLogEntry[]>([]);
  const [isCommitted, setIsCommitted] = useState<boolean>(false);
  const [isQuarantined, setIsQuarantined] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editorSignal, setEditorSignal] = useState<number>(0);

  const isRunningRef = useRef(false);
  const runIdRef = useRef(0);
  const auditAbortRef = useRef<AbortController | null>(null);
  const autoRunRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3600);
  };

  const recordLastRun = (
    auditedPayload: string,
    extraction: ExtractedInvoice,
    verification: VerificationResult,
    decision: DecisionResult
  ) => {
    const matched =
      DEMO_SCENARIOS.find((scenario) => scenario.rawInvoiceText === auditedPayload) ??
      DEMO_SCENARIOS.find(
        (scenario) => scenario.vendorName === extraction.vendorName && scenario.invoiceNumber === extraction.invoiceNumber
      );

    if (!matched) {
      setSelectedScenarioId('custom');
      return;
    }

    setSelectedScenarioId(matched.id);
    setLastRuns((previous) => ({
      ...previous,
      [matched.id]: {
        verdict: decision.verdict,
        variance: verification.maxPriceVariancePercent,
        carbon: verification.totalEstimatedCarbonKg,
        at: new Date().toISOString(),
      },
    }));
  };

  const runAudit = async (
    payloadOverride?: string,
    fileOverride?: File | null,
    gateOverride?: boolean
  ) => {
    const file = fileOverride === undefined ? selectedFile : fileOverride;
    // An uploaded document is the source of truth: stale editor text never travels with it.
    const payload = file ? '' : (payloadOverride ?? rawPayload);
    const gate = gateOverride ?? gateEnabled;

    if (!payload.trim() && !file) return;

    // Supersede any in-flight audit instead of silently ignoring the new request.
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    auditAbortRef.current?.abort();
    const abortController = new AbortController();
    auditAbortRef.current = abortController;

    isRunningRef.current = true;
    setIsRunning(true);
    setRawPayload(payload);
    setSelectedFile(file ?? null);
    setIsCommitted(false);
    setIsQuarantined(false);
    setSecurityResult(null);
    setExtractionResult(null);
    setVerificationResult(null);
    setDecisionResult(null);
    setTelemetry(null);

    setStages([
      { stageNumber: 1, name: 'Pre-Flight Security Gate', state: 'SCANNING', summary: 'Scanning raw input for PII and adversarial injections…' },
      { stageNumber: 2, name: 'Multimodal Extraction', state: 'IDLE', summary: 'Awaiting pre-flight clearance.' },
      { stageNumber: 3, name: 'Autonomous Tool Verification', state: 'IDLE', summary: 'Awaiting extraction payload.' },
      { stageNumber: 4, name: 'Tiered Decision Routing', state: 'IDLE', summary: 'Awaiting verification metrics.' },
    ]);

    const auditStart = performance.now();

    try {
      let responseData: any = null;
      let rejectedByServer = false;
      let upstreamError: string | null = null;
      let serverMessage: string | null = null;
      let auditApiUnavailable = false;

      try {
        const formData = new FormData();
        formData.append('rawPayload', payload);
        formData.append('gateEnabled', String(gate));
        if (file) formData.append('file', file);

        const response = await fetch('/api/audit', { method: 'POST', body: formData, signal: abortController.signal });
        if (runId !== runIdRef.current) return;

        const contentType = response.headers.get('content-type') || '';
        const respondsWithJson = contentType.includes('application/json');

        if (response.ok && respondsWithJson) {
          responseData = await response.json();
        } else if (!respondsWithJson && [404, 405, 501].includes(response.status)) {
          // No audit API at this origin (a static-only deployment). Never surface this
          // as a rejected document: text audits continue in the in-browser engine.
          auditApiUnavailable = true;
          console.warn(`Audit API unavailable at this origin (HTTP ${response.status}).`);
        } else if (!respondsWithJson && response.ok) {
          // A host that answers unknown POST routes with its SPA shell.
          auditApiUnavailable = true;
          console.warn('Audit API answered with a non-JSON 2xx response; treating this origin as static-only.');
        } else if (response.status === 413) {
          // Platform body limits reject oversized uploads before they reach the API,
          // so this must read as "too large", never as "no API here".
          rejectedByServer = true;
          serverMessage =
            'The audit request was rejected as too large (HTTP 413). Hosted deployments cap request bodies at roughly 4.5 MB — reduce the document size or paste the invoice text instead.';
          showToast(serverMessage);
        } else if (!respondsWithJson && response.status >= 500) {
          // A crashed function or proxy must never look like a successful local audit.
          upstreamError = `The audit API failed (HTTP ${response.status}). This deployment may be misconfigured — check its function logs, or run the backend locally with \`npm start\`.`;
        } else {
          const errorBody = respondsWithJson ? await response.json().catch(() => null) : null;
          console.warn('Audit endpoint rejected the request:', response.status, errorBody?.error);
          serverMessage = errorBody?.error || null;
          if (response.status >= 400 && response.status < 500) {
            rejectedByServer = true;
            showToast(serverMessage || `Audit rejected (HTTP ${response.status}).`);
          } else {
            upstreamError = serverMessage || `Audit pipeline failed upstream (HTTP ${response.status}).`;
          }
        }
      } catch (networkError: any) {
        if (networkError?.name === 'AbortError' || runId !== runIdRef.current) return;
        if (file) {
          upstreamError =
            'Uploaded documents need the document-reading API, which is not reachable from this deployment. Paste the invoice text instead, or run the backend locally with `npm start`.';
        } else {
          console.warn('Backend unreachable; running the deterministic local pipeline.', networkError);
          auditApiUnavailable = true;
        }
      }

      if (runId !== runIdRef.current) return;

      if (auditApiUnavailable && file) {
        // A file cannot be read without the API; say so instead of faking a verdict.
        upstreamError =
          'Uploaded documents need the document-reading API, which is not available in this deployment. Paste the invoice text instead, or run the backend locally with `npm start`.';
      }

      if (rejectedByServer || upstreamError) {
        const failureMessage = upstreamError || serverMessage || 'The server rejected this document before processing.';
        if (file) setUploadError(failureMessage);
        if (upstreamError) showToast(upstreamError);
        setStages([
          { stageNumber: 1, name: 'Pre-Flight Security Gate', state: 'FAILED', summary: failureMessage },
          ...createIdleStages().slice(1),
        ]);
        return;
      }

      if (responseData?.success) {
        const { security, extraction, verification, decision, telemetry: apiTelemetry } = responseData;
        setSecurityResult(security);
        setExtractionResult(extraction);
        setVerificationResult(verification);
        setDecisionResult(decision);
        setTelemetry(apiTelemetry);

        const blocked = Boolean(security.blockedBeforeModel);
        const timings = apiTelemetry.stageTimings ?? {
          securityMs: blocked ? apiTelemetry.latencyMs : Math.round(apiTelemetry.latencyMs * 0.15),
          extractionMs: blocked ? 0 : Math.round(apiTelemetry.latencyMs * 0.55),
          verificationMs: blocked ? 0 : Math.round(apiTelemetry.latencyMs * 0.15),
          decisionMs: blocked ? 0 : Math.round(apiTelemetry.latencyMs * 0.15),
        };

        setStages([
          {
            stageNumber: 1,
            name: 'Pre-Flight Security Gate',
            state: blocked ? 'QUARANTINED' : 'PASSED',
            elapsedMs: timings.securityMs,
            summary: blocked
              ? `Blocked before model: ${security.injectionCount} injection signatures detected.`
              : `${security.piiRedactedCount} PII values redacted · ${security.injectionCount} injection signatures.`,
          },
          {
            stageNumber: 2,
            name: 'Multimodal Extraction',
            state: blocked ? 'IDLE' : 'PASSED',
            elapsedMs: blocked ? 0 : timings.extractionMs,
            summary: blocked
              ? 'Zero model invocations — execution stopped at the gate.'
              : `${extraction.lineItems.length} line items · ${apiTelemetry.modelTier}`,
          },
          {
            stageNumber: 3,
            name: 'Autonomous Tool Verification',
            state: blocked
              ? 'IDLE'
              : verification.hasPriceAnomaly ||
                  verification.hasCarbonMismatch ||
                  verification.hasUnmatchedItems ||
                  verification.hasUnitIncompatibility
                ? 'ESCALATED'
                : 'PASSED',
            elapsedMs: blocked ? 0 : timings.verificationMs,
            summary: blocked
              ? 'Bypassed for the quarantined payload.'
              : `Catalog ${verification.benchmarkVersion} · max variance ${
                  verification.maxPriceVariancePercent !== null ? `${verification.maxPriceVariancePercent}%` : '—'
                }.`,
          },
          {
            stageNumber: 4,
            name: 'Tiered Decision Routing',
            state: blocked ? 'QUARANTINED' : decision.verdict === 'AUTO_APPROVED' ? 'PASSED' : 'ESCALATED',
            elapsedMs: timings.decisionMs,
            summary: `Verdict: ${formatVerdict(decision.verdict)}.`,
          },
        ]);

        recordLastRun(payload, extraction, verification, decision);
      } else if (file || !payload.trim()) {
        // Never fabricate an invoice when there is no readable source document.
        const failureMessage =
          'No readable invoice source: the audit engine returned no data for this document. Paste the invoice text or try another file.';
        if (file) setUploadError(failureMessage);
        showToast(failureMessage);
        setStages([
          { stageNumber: 1, name: 'Pre-Flight Security Gate', state: 'FAILED', summary: failureMessage },
          ...createIdleStages().slice(1),
        ]);
      } else {
        const securityStart = performance.now();
        const sec = runPreFlightSecurityScan(payload, gate);
        const securityEnd = performance.now();
        setSecurityResult(sec);

        let extraction: ExtractedInvoice;
        let verification: VerificationResult;
        let decision: DecisionResult;
        let extractionStart = performance.now();
        let extractionEnd = performance.now();
        let verificationStart = performance.now();
        let verificationEnd = performance.now();
        let decisionStart = performance.now();
        let decisionEnd = performance.now();

        if (sec.blockedBeforeModel) {
          extraction = {
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
            isFixture: true,
          };
          verificationStart = performance.now();
          verification = verifyInvoiceLineItems(extraction);
          verificationEnd = performance.now();
          decisionStart = performance.now();
          decision = evaluateDecisionPolicy(sec, verification, extraction);
          decisionEnd = performance.now();
        } else {
          const lower = payload.toLowerCase();
          extractionStart = performance.now();
          if (lower.includes('apex') && lower.includes('aic-4409')) {
            extraction = {
              vendorName: 'Apex Industrial Chemicals Corp',
              invoiceNumber: 'INV-2026-AIC-4409',
              invoiceDate: '2026-02-18',
              currency: 'USD',
              lineItems: [
                {
                  id: 'item-1',
                  description: 'Industrial Solvent Grade A (Ultra-High Purity 99.8%)',
                  category: 'chem-solvent-grade-a',
                  quantity: 1000,
                  unit: 'L',
                  billedUnitPrice: 26.27,
                  lineTotal: 26270.0,
                  claimedCarbonKg: 1235.3,
                  sustainabilityClaims: ['Proprietary low-carbon solvent'],
                  certificationRefs: [],
                },
              ],
              subtotal: 26270.0,
              totalAmount: 26620.0,
              claimedTotalCarbonKg: 1235.3,
              extractionSource: 'DEMO_FIXTURE',
              isFixture: true,
            };
          } else if (lower.includes('ecopack') && lower.includes('ep-8921')) {
            extraction = {
              vendorName: 'EcoPack Logistics GmbH',
              invoiceNumber: 'INV-2026-EP-8921',
              invoiceDate: '2026-02-14',
              currency: 'USD',
              lineItems: [
                {
                  id: 'item-1',
                  description: 'Recycled Corrugated Packaging (Single-wall B-flute)',
                  category: 'pkg-corrugated-recycled',
                  quantity: 5000,
                  unit: 'unit',
                  billedUnitPrice: 1.2,
                  lineTotal: 6000.0,
                  claimedCarbonKg: 2250.0,
                  sustainabilityClaims: ['DEFRA 2025 verified'],
                  certificationRefs: ['FSC-C123456'],
                },
                {
                  id: 'item-2',
                  description: 'Cold-Chain Freight (Dedicated Temperature-Controlled)',
                  category: 'log-freight-coldchain-km',
                  quantity: 500,
                  unit: 'km',
                  billedUnitPrice: 2.1,
                  lineTotal: 1050.0,
                  claimedCarbonKg: 575.0,
                  sustainabilityClaims: ['GLEC Framework v3.0'],
                  certificationRefs: [],
                },
              ],
              subtotal: 7050.0,
              totalAmount: 7050.0,
              claimedTotalCarbonKg: 2825.0,
              extractionSource: 'DEMO_FIXTURE',
              isFixture: true,
            };
          } else if (lower.includes('shadowcorp') && lower.includes('shdw-666')) {
            extraction = shadowCorpFallbackInvoice();
          } else {
            extraction = parseCustomInvoiceText(payload);
          }
          extractionEnd = performance.now();

          verificationStart = performance.now();
          verification = verifyInvoiceLineItems(extraction);
          verificationEnd = performance.now();

          decisionStart = performance.now();
          decision = evaluateDecisionPolicy(sec, verification, extraction);
          decisionEnd = performance.now();
        }

        const elapsed = Math.round(performance.now() - auditStart);
        const resolvedModelTier = sec.blockedBeforeModel
          ? 'NONE (Zero-Trust Intercept: 0 Model Calls)'
          : extraction.isFixture
            ? 'demo-deterministic-fixture'
            : 'local-heuristic-parser';

        const localTelemetry: TelemetryData = {
          latencyMs: elapsed,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          tokenSavingsPercent: sec.blockedBeforeModel ? 100 : sec.piiRedactedCount > 0 ? 15 : null,
          tokensConsumed: sec.blockedBeforeModel || extraction.isFixture ? 0 : 420,
          baselineTokensWithoutGate: 650,
          modelTier: resolvedModelTier,
          securityGateState: gate,
          stageTimings: {
            securityMs: Math.round(securityEnd - securityStart),
            extractionMs: Math.round(extractionEnd - extractionStart),
            verificationMs: Math.round(verificationEnd - verificationStart),
            decisionMs: Math.round(decisionEnd - decisionStart),
          },
        };

        setExtractionResult(extraction);
        setVerificationResult(verification);
        setDecisionResult(decision);
        setTelemetry(localTelemetry);

        setStages([
          {
            stageNumber: 1,
            name: 'Pre-Flight Security Gate',
            state: sec.blockedBeforeModel ? 'QUARANTINED' : 'PASSED',
            elapsedMs: localTelemetry.stageTimings?.securityMs,
            summary: sec.blockedBeforeModel
              ? `Blocked before model: ${sec.injectionCount} injection signatures detected.`
              : `${sec.piiRedactedCount} PII values redacted · ${sec.injectionCount} injection signatures.`,
          },
          {
            stageNumber: 2,
            name: 'Multimodal Extraction',
            state: sec.blockedBeforeModel ? 'IDLE' : 'PASSED',
            elapsedMs: localTelemetry.stageTimings?.extractionMs,
            summary: sec.blockedBeforeModel
              ? 'Zero model invocations — execution stopped at the gate.'
              : `${extraction.lineItems.length} line items · ${resolvedModelTier}`,
          },
          {
            stageNumber: 3,
            name: 'Autonomous Tool Verification',
            state: sec.blockedBeforeModel
              ? 'IDLE'
              : verification.hasPriceAnomaly ||
                  verification.hasCarbonMismatch ||
                  verification.hasUnmatchedItems ||
                  verification.hasUnitIncompatibility
                ? 'ESCALATED'
                : 'PASSED',
            elapsedMs: localTelemetry.stageTimings?.verificationMs,
            summary: sec.blockedBeforeModel
              ? 'Bypassed for the quarantined payload.'
              : `Catalog ${verification.benchmarkVersion} · max variance ${
                  verification.maxPriceVariancePercent !== null ? `${verification.maxPriceVariancePercent}%` : '—'
                }.`,
          },
          {
            stageNumber: 4,
            name: 'Tiered Decision Routing',
            state: sec.blockedBeforeModel ? 'QUARANTINED' : decision.verdict === 'AUTO_APPROVED' ? 'PASSED' : 'ESCALATED',
            elapsedMs: localTelemetry.stageTimings?.decisionMs,
            summary: `Verdict: ${formatVerdict(decision.verdict)}.`,
          },
        ]);

        recordLastRun(payload, extraction, verification, decision);
      }
    } catch (error: any) {
      console.error('Audit execution error:', error);
      setStages([
        { stageNumber: 1, name: 'Pre-Flight Security Gate', state: 'FAILED', summary: 'The audit pipeline failed unexpectedly.' },
        ...createIdleStages().slice(1),
      ]);
      showToast(`Audit failed: ${error?.message || 'Internal error'}`);
    } finally {
      if (runId === runIdRef.current) {
        isRunningRef.current = false;
        setIsRunning(false);
      }
    }
  };

  // Load the persisted ledger and preferences, then run the first audit automatically.
  useEffect(() => {
    const savedLog = loadAuditLogFromStorage();
    if (savedLog.length > 0) setLedgerEntries(savedLog);

    const preferences = loadPreferences();
    setGateEnabled(preferences.securityGateEnabled);

    if (!autoRunRef.current) {
      autoRunRef.current = true;
      void runAudit(DEMO_SCENARIOS[0].rawInvoiceText, null, preferences.securityGateEnabled);
    }
    // The mount effect intentionally runs once; runAudit is stable enough for this initial call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectScenario = (scenario: DemoScenario) => {
    setSelectedScenarioId(scenario.id);
    setRawPayload(scenario.rawInvoiceText);
    setSelectedFile(null);
    setUploadError(null);
    setIsCommitted(false);
    setIsQuarantined(false);
    setSecurityResult(null);
    setExtractionResult(null);
    setVerificationResult(null);
    setDecisionResult(null);
    setTelemetry(null);
    void runAudit(scenario.rawInvoiceText, null);
  };

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleFileAutoRun = (file: File) => {
    // The uploaded document replaces any previous audit: no stale text is sent with it.
    void runAudit('', file);
  };

  const handlePayloadChange = (value: string) => {
    // Editing text switches out of document mode: the attached file is no longer the audited source.
    if (selectedFile) {
      setSelectedFile(null);
      setUploadError(null);
    }
    setRawPayload(value);
  };

  const handlePasteInstead = () => {
    setSelectedFile(null);
    setUploadError(null);
    setEditorSignal((value) => value + 1);
    document.getElementById('invoice-preview')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleToggleGate = () => {
    const nextState = !gateEnabled;
    setGateEnabled(nextState);
    savePreferences({ ...loadPreferences(), securityGateEnabled: nextState });
    showToast(nextState ? 'Security gate ARMED: pre-flight text scanning is active.' : 'WARNING: security gate disarmed — red-team mode.');
  };

  const handleReset = () => {
    setRawPayload('');
    setSelectedFile(null);
    setUploadError(null);
    setSelectedScenarioId('custom');
    setIsCommitted(false);
    setIsQuarantined(false);
    setSecurityResult(null);
    setExtractionResult(null);
    setVerificationResult(null);
    setDecisionResult(null);
    setTelemetry(null);
    setStages(createIdleStages());
  };

  const handleCommitLedger = async () => {
    if (!decisionResult || !extractionResult || !verificationResult || !securityResult) {
      showToast('No completed audit result available to commit.');
      return;
    }
    if (isCommitted) {
      showToast('This audit result has already been committed.');
      return;
    }

    const previousRecordHash = ledgerEntries.length > 0 ? ledgerEntries[0].sha256Hash : null;

    const entryToHash: Omit<AuditLogEntry, 'sha256Hash'> = {
      id: `GLA-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      vendorName: extractionResult.vendorName,
      invoiceNumber: extractionResult.invoiceNumber,
      securityStatus: securityResult.status,
      piiRedactedCount: securityResult.piiRedactedCount,
      modelTierUsed: telemetry?.modelTier || 'unknown',
      latencyMs: telemetry?.latencyMs || 0,
      tokenSavingsPercent: telemetry?.tokenSavingsPercent ?? null,
      totalBilledAmount: verificationResult.totalBilledAmount,
      totalCarbonKg: verificationResult.totalEstimatedCarbonKg,
      maxPriceVariancePercent: verificationResult.maxPriceVariancePercent,
      verdict: decisionResult.verdict,
      reasoningSummary: decisionResult.reasoningSummary,
      previousRecordHash,
      benchmarkDatasetVersion: BENCHMARK_DATASET_VERSION,
      securityFindings: securityResult.findings,
      verifiedLineItems: verificationResult.lineItems,
      remediationActions: decisionResult.remediationActions,
      isVerified: true,
    };

    const sha256 = await generateEntryHash(entryToHash, previousRecordHash);
    const newEntry: AuditLogEntry = { ...entryToHash, sha256Hash: sha256 };
    const nextEntries = [newEntry, ...ledgerEntries];

    setLedgerEntries(nextEntries);
    saveAuditLogToStorage(nextEntries);
    setIsCommitted(true);
    showToast(`Verdict committed — SHA-256 ${sha256.slice(0, 10)}…`);
  };

  const handleQuarantineVendor = async () => {
    if (!extractionResult) return;
    setIsQuarantined(true);

    const previousHash = ledgerEntries.length > 0 ? ledgerEntries[0].sha256Hash : null;
    const entryData: Omit<AuditLogEntry, 'sha256Hash'> = {
      id: `GLA-QUAR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vendorName: extractionResult.vendorName,
      invoiceNumber: extractionResult.invoiceNumber,
      securityStatus: securityResult?.status || 'INJECTION_BLOCKED',
      piiRedactedCount: securityResult?.piiRedactedCount || 0,
      modelTierUsed: 'NONE (Vendor Quarantine Action)',
      latencyMs: 0,
      tokenSavingsPercent: 100,
      totalBilledAmount: 0,
      totalCarbonKg: null,
      maxPriceVariancePercent: null,
      verdict: 'QUARANTINED',
      reasoningSummary: 'Vendor quarantined manually by the procurement risk officer after a security or anomaly policy violation.',
      quarantineReason: 'Adversarial instruction injection or greenwashing threshold failure.',
      previousRecordHash: previousHash,
      benchmarkDatasetVersion: BENCHMARK_DATASET_VERSION,
    };

    const hash = await generateEntryHash(entryData, previousHash);
    const quarantinedEntry: AuditLogEntry = { ...entryData, sha256Hash: hash };
    const nextEntries = [quarantinedEntry, ...ledgerEntries];

    setLedgerEntries(nextEntries);
    saveAuditLogToStorage(nextEntries);
    showToast(`Vendor '${extractionResult.vendorName}' quarantined in the ledger.`);
  };

  const handleExportCertificate = async () => {
    if (!decisionResult || !extractionResult || !verificationResult || !securityResult) {
      showToast('Cannot export a certificate before running an audit.');
      return;
    }

    const previousHash = ledgerEntries.length > 0 ? ledgerEntries[0].sha256Hash : null;
    const auditId = `CERT-${Date.now()}`;

    const certPayload: Omit<AuditCertificate, 'integrity'> = {
      schemaVersion: '1.0.0-GLA',
      auditId,
      timestamp: new Date().toISOString(),
      vendorName: extractionResult.vendorName,
      invoiceNumber: extractionResult.invoiceNumber,
      security: {
        status: securityResult.status,
        redactionCount: securityResult.piiRedactedCount,
        findingsCount: securityResult.findings.length,
        blockedBeforeModel: securityResult.blockedBeforeModel,
      },
      aiExecution: {
        modelTier: telemetry?.modelTier || 'unknown',
        latencyMs: telemetry?.latencyMs || 0,
        tokenSavingsPercent: telemetry?.tokenSavingsPercent || null,
        isDemonstrationFixture: Boolean(extractionResult.isFixture),
      },
      verification: {
        benchmarkDatasetVersion: BENCHMARK_DATASET_VERSION,
        totalBilledAmount: verificationResult.totalBilledAmount,
        totalEstimatedCarbonKg: verificationResult.totalEstimatedCarbonKg,
        maxPriceVariancePercent: verificationResult.maxPriceVariancePercent,
        lineItemCount: verificationResult.lineItems.length,
      },
      decision: {
        verdict: decisionResult.verdict,
        reasoningSummary: decisionResult.reasoningSummary,
        remediationActions: decisionResult.remediationActions,
      },
    };

    const hash = await generateEntryHash(
      {
        id: auditId,
        timestamp: certPayload.timestamp,
        vendorName: certPayload.vendorName,
        invoiceNumber: certPayload.invoiceNumber,
        securityStatus: certPayload.security.status,
        piiRedactedCount: certPayload.security.redactionCount,
        modelTierUsed: certPayload.aiExecution.modelTier,
        latencyMs: certPayload.aiExecution.latencyMs,
        tokenSavingsPercent: certPayload.aiExecution.tokenSavingsPercent,
        totalBilledAmount: certPayload.verification.totalBilledAmount,
        totalCarbonKg: certPayload.verification.totalEstimatedCarbonKg,
        maxPriceVariancePercent: certPayload.verification.maxPriceVariancePercent,
        verdict: certPayload.decision.verdict,
        reasoningSummary: certPayload.decision.reasoningSummary,
      },
      previousHash
    );

    const fullCertificate: AuditCertificate = {
      ...certPayload,
      integrity: {
        sha256Hash: hash,
        hashingAlgorithm: 'SHA-256 (Canonical JSON)',
        previousRecordHash: previousHash,
        canonicalization: 'RFC-8785 Canonical JSON Serialization',
      },
    };

    downloadAuditCertificate(fullCertificate);
    showToast('Audit certificate JSON downloaded.');
  };

  const clearLedger = () => {
    if (window.confirm('Clear all local audit ledger records from browser storage?')) {
      setLedgerEntries([]);
      saveAuditLogToStorage([]);
      showToast('Local audit ledger reset.');
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text-primary lg:flex">
      <Sidebar onNewAudit={handleReset} onOpenCatalog={() => setIsBenchmarkModalOpen(true)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-primary/40 bg-surface px-4 py-2.5 font-mono text-[10px] text-primary-light shadow-2xl animate-fadeIn"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span>{toastMessage}</span>
          </div>
        )}

        <TelemetryHeader
          telemetry={telemetry}
          gateEnabled={gateEnabled}
          redactionCount={securityResult ? securityResult.piiRedactedCount : null}
          onToggleGate={handleToggleGate}
          onOpenBenchmarkCatalog={() => setIsBenchmarkModalOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1500px] flex-1 space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div id="scenarios">
              <ScenarioSelector
                selectedScenarioId={selectedScenarioId}
                onSelectScenario={handleSelectScenario}
                isRunning={isRunning}
                lastRuns={lastRuns}
                onOpenCatalog={() => setIsBenchmarkModalOpen(true)}
              />
            </div>

            <DocumentIngestion
              selectedFile={selectedFile}
              onSelectFile={handleFileSelected}
              onAutoRun={handleFileAutoRun}
              uploadError={uploadError}
              setUploadError={setUploadError}
              isRunning={isRunning}
              gateEnabled={gateEnabled}
              onPasteInstead={handlePasteInstead}
            />
          </div>

          <Suspense fallback={<AsyncPanelFallback />}>
            <PipelineStepper stages={stages} />
          </Suspense>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
            <PrivacyTwinPanel
              securityResult={securityResult}
              rawInput={rawPayload}
              selectedFile={selectedFile}
              onChangePayload={handlePayloadChange}
              onRunAudit={() => void runAudit()}
              onAutoRun={(nextPayload) => void runAudit(nextPayload, null)}
              isRunning={isRunning}
              editorSignal={editorSignal}
            />

            <div id="audit-verdict" aria-live="polite" className="min-w-0">
              {decisionResult && verificationResult && securityResult && extractionResult ? (
                <Suspense fallback={<AsyncPanelFallback />}>
                  <VerdictCard
                    decision={decisionResult}
                    verification={verificationResult}
                    security={securityResult}
                    extraction={extractionResult}
                    onCommitLedger={handleCommitLedger}
                    onQuarantineVendor={handleQuarantineVendor}
                    onExportCertificate={handleExportCertificate}
                    onReset={handleReset}
                    isCommitted={isCommitted}
                    isQuarantined={isQuarantined}
                  />
                </Suspense>
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-card border border-border bg-surface p-6 text-center shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-dark text-primary">
                    {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileCheck2 className="h-5 w-5" />}
                  </div>
                  <h3 className="mt-3 text-sm font-extrabold text-white">
                    {isRunning ? 'Auditing automatically…' : 'Verdict pending'}
                  </h3>
                  <p className="mt-1 max-w-[280px] text-[10.5px] leading-relaxed text-text-secondary">
                    {isRunning
                      ? 'The four-stage pipeline is scanning, extracting and verifying the document.'
                      : 'Load a sample, paste text or drop a document. The audit runs without an extra click.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Suspense fallback={<AsyncPanelFallback />}>
            <AuditLedger entries={ledgerEntries} onClearLedger={clearLedger} />
          </Suspense>
        </main>

        <footer className="border-t border-border/60 px-6 py-4 text-center font-mono text-[9.5px] text-text-muted">
          GreenLedger Auditor · Trust Nothing. Verify Everything. · SHA-256 tamper-evident ledger · Deterministic
          decisions, model-assisted extraction
        </footer>
      </div>

      <Suspense fallback={null}>
        <BenchmarkModal isOpen={isBenchmarkModalOpen} onClose={() => setIsBenchmarkModalOpen(false)} />
      </Suspense>
    </div>
  );
};

export default App;
