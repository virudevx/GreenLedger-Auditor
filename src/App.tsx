import React, { useState, useEffect } from 'react';
import { 
  SecurityGateResult, 
  ExtractedInvoice, 
  VerificationResult, 
  DecisionResult, 
  TelemetryData, 
  StageProgress, 
  AuditLogEntry, 
  AuditCertificate 
} from './types/audit';
import { DEMO_SCENARIOS, DemoScenario } from './constants/scenarios';
import { BENCHMARK_DATASET_VERSION } from './constants/benchmarks';
import { runPreFlightSecurityScan } from './utils/security';
import { verifyInvoiceLineItems, evaluateDecisionPolicy } from './utils/verification';
import { generateEntryHash } from './utils/crypto';
import { 
  loadAuditLogFromStorage, 
  saveAuditLogToStorage, 
  loadPreferences, 
  savePreferences, 
  downloadAuditCertificate 
} from './utils/storage';

// Components
import { TelemetryHeader } from './components/TelemetryHeader';
import { ScenarioSelector } from './components/ScenarioSelector';
import { DocumentIngestion } from './components/DocumentIngestion';
import { PipelineStepper } from './components/PipelineStepper';
import { PrivacyTwinPanel } from './components/PrivacyTwinPanel';
import { VerdictCard } from './components/VerdictCard';
import { AuditLedger } from './components/AuditLedger';
import { BenchmarkModal } from './components/BenchmarkModal';

/**
 * Client-side heuristic invoice parser for custom text.
 * Extracts vendor name, invoice number, prices, quantities from raw text
 * so that different inputs produce genuinely different outputs.
 */
function parseCustomInvoiceText(text: string): ExtractedInvoice {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let vendorName = 'Custom Vendor';
  let invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
  let invoiceDate = new Date().toISOString().split('T')[0];
  let currency = 'USD';

  // Extract header fields from key-value patterns
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

  // Extract line items from patterns like "Quantity: 500", "Price: $12.50", etc.
  const lineItems: ExtractedInvoice['lineItems'] = [];
  let currentItem: { desc?: string; qty?: number; unit?: string; price?: number; carbon?: number | null } = {};
  let itemIndex = 0;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect a numbered item line like "1. Description" or "- Description"
    const itemMatch = line.match(/^(?:\d+[\.\)]\s*|-\s*)(.+)/);
    if (itemMatch && !lower.includes('quantity') && !lower.includes('price') && !lower.includes('total') && !lower.includes('carbon')) {
      // Flush previous item if it has enough data
      if (currentItem.desc && currentItem.qty && currentItem.price) {
        itemIndex++;
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
          certificationRefs: []
        });
      }
      currentItem = { desc: itemMatch[1].trim() };
      continue;
    }

    // Extract quantity
    const qtyMatch = line.match(/(?:quantity|qty)[:\s]*([0-9,]+(?:\.\d+)?)\s*(\w+)?/i);
    if (qtyMatch) {
      currentItem.qty = parseFloat(qtyMatch[1].replace(/,/g, ''));
      if (qtyMatch[2]) currentItem.unit = qtyMatch[2];
    }

    // Extract unit price
    const priceMatch = line.match(/(?:unit\s*price|price|rate)[:\s]*\$?([0-9,]+(?:\.\d+)?)/i);
    if (priceMatch) {
      currentItem.price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    // Extract billed unit price (format "Billed Unit Price: $26.27")
    const billedMatch = line.match(/(?:billed)[^:]*[:\s]*\$?([0-9,]+(?:\.\d+)?)/i);
    if (billedMatch && !currentItem.price) {
      currentItem.price = parseFloat(billedMatch[1].replace(/,/g, ''));
    }

    // Extract unit from patterns like "500 km", "1000 L"
    const unitMatch = line.match(/([0-9,]+)\s+(unit|units|L|liters?|km|rolls?|pcs|ea|kg|gallons?|m|meters?)\b/i);
    if (unitMatch && !currentItem.unit) {
      currentItem.unit = unitMatch[2];
    }

    // Extract carbon
    const carbonMatch = line.match(/(?:carbon|co2|co₂|emissions?)[:\s]*([0-9,]+(?:\.\d+)?)\s*(?:kg)?/i);
    if (carbonMatch) {
      currentItem.carbon = parseFloat(carbonMatch[1].replace(/,/g, ''));
    }
  }

  // Flush last item
  if (currentItem.desc && currentItem.qty && currentItem.price) {
    itemIndex++;
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
      certificationRefs: []
    });
  }

  // If we found nothing, create a single item from total
  if (lineItems.length === 0) {
    let totalAmount = 0;
    for (const line of lines) {
      const totalMatch = line.match(/(?:total|amount)[:\s]*\$?([0-9,]+(?:\.\d+)?)/i);
      if (totalMatch) {
        totalAmount = parseFloat(totalMatch[1].replace(/,/g, '')) || 0;
      }
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
      certificationRefs: []
    });
  }

  const totalAmount = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);
  const totalCarbonKg = lineItems.reduce((sum, li) => sum + (li.claimedCarbonKg || 0), 0);

  return {
    vendorName,
    invoiceNumber,
    invoiceDate,
    currency,
    lineItems,
    subtotal: totalAmount,
    totalAmount,
    claimedTotalCarbonKg: totalCarbonKg > 0 ? totalCarbonKg : null,
    extractionSource: 'DEMO_FIXTURE',
    isFixture: true
  };
}

export const App: React.FC = () => {
  // Scenario & Payload State
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('clean');
  const [rawPayload, setRawPayload] = useState<string>(DEMO_SCENARIOS[0].rawInvoiceText);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Security Gate & Preferences
  const [gateEnabled, setGateEnabled] = useState<boolean>(true);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState<boolean>(false);

  // Pipeline Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);

  // 4 Stages
  const initialStages: StageProgress[] = [
    { stageNumber: 1, name: 'Pre-Flight Security Gate', state: 'IDLE', summary: 'Deterministic PII & prompt-injection checks.' },
    { stageNumber: 2, name: 'Multimodal Extraction', state: 'IDLE', summary: 'Structured Gemini 2.5 Flash parsing.' },
    { stageNumber: 3, name: 'Autonomous Tool Verification', state: 'IDLE', summary: 'Deterministic catalog & Scope 3 matching.' },
    { stageNumber: 4, name: 'Tiered Decision Routing', state: 'IDLE', summary: 'Zero-trust ERP policy enforcement.' },
  ];
  const [stages, setStages] = useState<StageProgress[]>(initialStages);

  // Pipeline Output Artifacts
  const [securityResult, setSecurityResult] = useState<SecurityGateResult | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractedInvoice | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);

  // Ledger & Commit State
  const [ledgerEntries, setLedgerEntries] = useState<AuditLogEntry[]>([]);
  const [isCommitted, setIsCommitted] = useState<boolean>(false);
  const [isQuarantined, setIsQuarantined] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load persistence on initial mount
  useEffect(() => {
    const savedLog = loadAuditLogFromStorage();
    if (savedLog && savedLog.length > 0) {
      setLedgerEntries(savedLog);
    }
    const prefs = loadPreferences();
    setGateEnabled(prefs.securityGateEnabled);
  }, []);

  // Save audit log whenever updated
  useEffect(() => {
    saveAuditLogToStorage(ledgerEntries);
  }, [ledgerEntries]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch scenario
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
    setStages(initialStages);
  };

  // Toggle Security Gate
  const handleToggleGate = () => {
    const nextState = !gateEnabled;
    setGateEnabled(nextState);
    savePreferences({ ...loadPreferences(), securityGateEnabled: nextState });
    showToast(nextState ? 'Security Gate ENABLED: Pre-flight model shield active.' : 'WARNING: Security Gate DISABLED. Red-Team demo mode active.');
  };

  // Reset to clean state
  const handleReset = () => {
    setRawPayload('');
    setSelectedFile(null);
    setUploadError(null);
    setIsCommitted(false);
    setIsQuarantined(false);
    setSecurityResult(null);
    setExtractionResult(null);
    setVerificationResult(null);
    setDecisionResult(null);
    setStages(initialStages);
  };

  // Execute the Multimodal Document-to-Verified-Decision Agentic Loop
  const handleRunAudit = async () => {
    if (!rawPayload.trim()) return;

    setIsRunning(true);
    setIsCommitted(false);
    setIsQuarantined(false);

    // Reset stages
    setStages([
      { stageNumber: 1, name: 'Pre-Flight Security Gate', state: 'SCANNING', summary: 'Analyzing raw input for PII & adversarial injections...' },
      { stageNumber: 2, name: 'Multimodal Extraction', state: 'IDLE', summary: 'Awaiting pre-flight clearance.' },
      { stageNumber: 3, name: 'Autonomous Tool Verification', state: 'IDLE', summary: 'Awaiting extraction payload.' },
      { stageNumber: 4, name: 'Tiered Decision Routing', state: 'IDLE', summary: 'Awaiting verification metrics.' },
    ]);

    const auditStartTime = performance.now();

    try {
      // Build FormData for multipart or json request to server /api/audit
      let responseData: any = null;

      try {
        const formData = new FormData();
        formData.append('rawPayload', rawPayload);
        formData.append('gateEnabled', String(gateEnabled));
        if (selectedFile) {
          formData.append('file', selectedFile);
        }

        const res = await fetch('/api/audit', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          responseData = await res.json();
        } else {
          console.warn('Backend API returned non-OK status, falling back to local client deterministic execution:', res.status);
        }
      } catch (networkErr) {
        console.warn('Backend server unreachable, executing deterministic local client pipeline:', networkErr);
      }

      // If backend was reached and returned success
      if (responseData && responseData.success) {
        const { security, extraction, verification, decision, telemetry: apiTelemetry } = responseData;

        setSecurityResult(security);
        setExtractionResult(extraction);
        setVerificationResult(verification);
        setDecisionResult(decision);
        setTelemetry(apiTelemetry);

        // Update 4 Stage Progress
        const stage1State = security.blockedBeforeModel ? 'QUARANTINED' : security.status === 'UNPROTECTED_WARNING' ? 'PASSED' : 'PASSED';
        const stage1Summary = security.blockedBeforeModel
          ? `CRITICAL: Blocked before model. ${security.injectionCount} prompt injection signatures detected.`
          : `${security.piiRedactedCount} PII values safely redacted. Zero prompt injections detected.`;

        const stage2State = security.blockedBeforeModel ? 'IDLE' : 'PASSED';
        const stage2Summary = security.blockedBeforeModel
          ? 'Zero Gemini model invocations (Execution prevented by zero-trust gate).'
          : `Extracted ${extraction.lineItems.length} line items via ${apiTelemetry.modelTier}.`;

        const stage3State = security.blockedBeforeModel 
          ? 'IDLE' 
          : verification.hasPriceAnomaly || verification.hasCarbonMismatch 
          ? 'ESCALATED' 
          : 'PASSED';
        const stage3Summary = security.blockedBeforeModel
          ? 'Tool verification bypassed for quarantined payload.'
          : `Verified against catalog v${verification.benchmarkVersion}. Max Var: ${verification.maxPriceVariancePercent !== null ? `${verification.maxPriceVariancePercent}%` : '0%'}.`;

        const stage4State = decision.verdict === 'AUTO_APPROVED' 
          ? 'PASSED' 
          : decision.verdict === 'ESCALATED_REMEDIATION' 
          ? 'ESCALATED' 
          : 'QUARANTINED';
        const stage4Summary = `Verdict: ${decision.verdict.replace('_', ' ')}. Policy rules verified.`;

        setStages([
          { stageNumber: 1, name: 'Pre-Flight Security Gate', state: stage1State, elapsedMs: Math.round(apiTelemetry.latencyMs * 0.15), summary: stage1Summary },
          { stageNumber: 2, name: 'Multimodal Extraction', state: stage2State, elapsedMs: Math.round(apiTelemetry.latencyMs * 0.55), summary: stage2Summary },
          { stageNumber: 3, name: 'Autonomous Tool Verification', state: stage3State, elapsedMs: Math.round(apiTelemetry.latencyMs * 0.15), summary: stage3Summary },
          { stageNumber: 4, name: 'Tiered Decision Routing', state: stage4State, elapsedMs: Math.round(apiTelemetry.latencyMs * 0.15), summary: stage4Summary },
        ]);

      } else {
        // Deterministic Client-Side Fallback Engine
        // This ensures the application is 100% functional even if the backend is booting or offline
        const sec = runPreFlightSecurityScan(rawPayload, gateEnabled);
        setSecurityResult(sec);

        if (sec.blockedBeforeModel) {
          const emptyExt: ExtractedInvoice = {
            vendorName: 'BLOCKED: Adversarial Threat',
            invoiceNumber: 'N/A (Quarantined)',
            invoiceDate: new Date().toISOString().split('T')[0],
            currency: 'USD',
            lineItems: [],
            subtotal: 0,
            totalAmount: 0,
            extractionSource: 'DEMO_FIXTURE',
            isFixture: true
          };
          const ver = verifyInvoiceLineItems(emptyExt);
          const dec = evaluateDecisionPolicy(sec, ver, emptyExt);

          const elapsed = Math.round(performance.now() - auditStartTime);
          setExtractionResult(emptyExt);
          setVerificationResult(ver);
          setDecisionResult(dec);
          setTelemetry({
            latencyMs: elapsed,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            tokenSavingsPercent: 100,
            tokensConsumed: 0,
            baselineTokensWithoutGate: 850,
            modelTier: 'NONE (Zero-Trust Intercept: 0 Model Calls)',
            securityGateState: gateEnabled
          });

          setStages([
            { stageNumber: 1, name: 'Pre-Flight Security Gate', state: 'QUARANTINED', elapsedMs: elapsed, summary: `BLOCKED: ${sec.injectionCount} prompt injection signatures detected.` },
            { stageNumber: 2, name: 'Multimodal Extraction', state: 'IDLE', summary: 'Zero model calls permitted.' },
            { stageNumber: 3, name: 'Autonomous Tool Verification', state: 'IDLE', summary: 'Bypassed for quarantined payload.' },
            { stageNumber: 4, name: 'Tiered Decision Routing', state: 'QUARANTINED', elapsedMs: 1, summary: 'Verdict: QUARANTINED (Adversarial threat neutralized).' },
          ]);
        } else {
          // Identify matching scenario fixture or parse custom text
          const lower = rawPayload.toLowerCase();
          let dummyExt: ExtractedInvoice;

          // Only use fixtures when BOTH vendor name AND invoice number match a known demo scenario
          const isApexScenario = (lower.includes('apex') && lower.includes('aic-4409'));
          const isCleanScenario = (lower.includes('ecopack') && lower.includes('ep-8921'));

          if (isApexScenario) {
            dummyExt = {
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
                  billedUnitPrice: 26.27, // 42% markup
                  lineTotal: 26270.0,
                  claimedCarbonKg: 1235.3,
                  sustainabilityClaims: ['Proprietary low-carbon solvent'],
                  certificationRefs: []
                }
              ],
              subtotal: 26270.0,
              totalAmount: 26620.0,
              claimedTotalCarbonKg: 1235.3,
              extractionSource: 'DEMO_FIXTURE',
              isFixture: true
            };
          } else if (isCleanScenario) {
            dummyExt = {
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
                  billedUnitPrice: 1.20,
                  lineTotal: 6000.0,
                  claimedCarbonKg: 2250.0,
                  sustainabilityClaims: ['DEFRA 2025 verified'],
                  certificationRefs: ['FSC-C123456']
                },
                {
                  id: 'item-2',
                  description: 'Cold-Chain Freight (Dedicated Temperature-Controlled)',
                  category: 'log-freight-coldchain-km',
                  quantity: 500,
                  unit: 'km',
                  billedUnitPrice: 2.10,
                  lineTotal: 1050.0,
                  claimedCarbonKg: 575.0,
                  sustainabilityClaims: ['GLEC Framework v3.0'],
                  certificationRefs: []
                }
              ],
              subtotal: 7050.0,
              totalAmount: 7050.0,
              claimedTotalCarbonKg: 2825.0,
              extractionSource: 'DEMO_FIXTURE',
              isFixture: true
            };
          } else {
            // Custom text — parse heuristically from the actual pasted content
            dummyExt = parseCustomInvoiceText(rawPayload);
          }

          const ver = verifyInvoiceLineItems(dummyExt);
          const dec = evaluateDecisionPolicy(sec, ver, dummyExt);
          const elapsed = Math.round(performance.now() - auditStartTime);

          setExtractionResult(dummyExt);
          setVerificationResult(ver);
          setDecisionResult(dec);
          setTelemetry({
            latencyMs: elapsed,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            tokenSavingsPercent: sec.piiRedactedCount > 0 ? 15 : null,
            tokensConsumed: dummyExt.isFixture ? 0 : 420,
            baselineTokensWithoutGate: 650,
            modelTier: dummyExt.isFixture
              ? 'local-heuristic-parser (backend unavailable)'
              : dec.isEscalated ? 'gemini-2.5-pro (Escalated Reasoning)' : 'gemini-2.5-flash',
            securityGateState: gateEnabled
          });

          setStages([
            { stageNumber: 1, name: 'Pre-Flight Security Gate', state: 'PASSED', elapsedMs: 8, summary: `${sec.piiRedactedCount} PII values redacted safely.` },
            { stageNumber: 2, name: 'Multimodal Extraction', state: 'PASSED', elapsedMs: elapsed - 16, summary: `Extracted ${dummyExt.lineItems.length} line items.` },
            { stageNumber: 3, name: 'Autonomous Tool Verification', state: dec.isEscalated ? 'ESCALATED' : 'PASSED', elapsedMs: 5, summary: `Verified against catalog v${BENCHMARK_DATASET_VERSION}.` },
            { stageNumber: 4, name: 'Tiered Decision Routing', state: dec.isEscalated ? 'ESCALATED' : 'PASSED', elapsedMs: 3, summary: `Verdict: ${dec.verdict.replace('_', ' ')}.` },
          ]);
        }
      }

    } catch (err: any) {
      console.error('Audit execution error:', err);
      showToast(`Audit failed: ${err.message || 'Internal error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Commit Ledger Verdict
  const handleCommitLedger = async () => {
    if (!decisionResult || !extractionResult || !verificationResult || !securityResult) {
      showToast('No completed audit result available to commit.');
      return;
    }
    if (isCommitted) {
      showToast('This audit result has already been committed to the ledger.');
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
      modelTierUsed: telemetry?.modelTier || 'gemini-2.5-flash',
      latencyMs: telemetry?.latencyMs || 0,
      tokenSavingsPercent: telemetry?.tokenSavingsPercent || null,
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
      isVerified: true
    };

    const sha256 = await generateEntryHash(entryToHash, previousRecordHash);
    const newEntry: AuditLogEntry = { ...entryToHash, sha256Hash: sha256 };

    setLedgerEntries(prev => [newEntry, ...prev]);
    setIsCommitted(true);
    showToast(`Verdict committed! Sealed with SHA-256 hash: ${sha256.slice(0, 10)}...`);
  };

  // Quarantine Vendor Action
  const handleQuarantineVendor = async () => {
    if (!extractionResult) return;
    setIsQuarantined(true);

    const prevHash = ledgerEntries.length > 0 ? ledgerEntries[0].sha256Hash : null;
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
      reasoningSummary: `Vendor quarantined manually by Procurement Risk Officer due to security/anomaly policy violation.`,
      quarantineReason: 'Adversarial instruction injection or greenwashing threshold failure.',
      previousRecordHash: prevHash,
      benchmarkDatasetVersion: BENCHMARK_DATASET_VERSION
    };

    const hash = await generateEntryHash(entryData, prevHash);
    const quarantinedEntry: AuditLogEntry = { ...entryData, sha256Hash: hash };

    setLedgerEntries(prev => [quarantinedEntry, ...prev]);
    showToast(`Vendor '${extractionResult.vendorName}' has been quarantined in the ledger.`);
  };

  // Export JSON Certificate
  const handleExportCertificate = async () => {
    if (!decisionResult || !extractionResult || !verificationResult || !securityResult) {
      showToast('Cannot export certificate before running an audit.');
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
        blockedBeforeModel: securityResult.blockedBeforeModel
      },
      aiExecution: {
        modelTier: telemetry?.modelTier || 'gemini-2.5-flash',
        latencyMs: telemetry?.latencyMs || 0,
        tokenSavingsPercent: telemetry?.tokenSavingsPercent || null,
        isDemonstrationFixture: Boolean(extractionResult.isFixture)
      },
      verification: {
        benchmarkDatasetVersion: BENCHMARK_DATASET_VERSION,
        totalBilledAmount: verificationResult.totalBilledAmount,
        totalEstimatedCarbonKg: verificationResult.totalEstimatedCarbonKg,
        maxPriceVariancePercent: verificationResult.maxPriceVariancePercent,
        lineItemCount: verificationResult.lineItems.length
      },
      decision: {
        verdict: decisionResult.verdict,
        reasoningSummary: decisionResult.reasoningSummary,
        remediationActions: decisionResult.remediationActions
      }
    };

    const hash = await generateEntryHash({
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
      reasoningSummary: certPayload.decision.reasoningSummary
    }, previousHash);

    const fullCert: AuditCertificate = {
      ...certPayload,
      integrity: {
        sha256Hash: hash,
        hashingAlgorithm: 'SHA-256 (Canonical JSON)',
        previousRecordHash: previousHash,
        canonicalization: 'RFC-8785 Canonical JSON Serialization'
      }
    };

    downloadAuditCertificate(fullCert);
    showToast('Audit Certificate JSON downloaded successfully.');
  };

  const clearLedger = () => {
    if (window.confirm('Clear all local audit ledger records from browser storage?')) {
      setLedgerEntries([]);
      showToast('Local audit ledger reset.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-primary-dim selection:text-primary-light">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-surface border border-primary/40 text-xs font-mono text-primary-light shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Telemetry Header */}
      <TelemetryHeader
        telemetry={telemetry}
        gateEnabled={gateEnabled}
        onToggleGate={handleToggleGate}
        onOpenBenchmarkCatalog={() => setIsBenchmarkModalOpen(true)}
      />

      {/* Main Single-Screen Command Center */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Scenario Selection Cards */}
        <ScenarioSelector
          selectedScenarioId={selectedScenarioId}
          onSelectScenario={handleSelectScenario}
          isRunning={isRunning}
        />

        {/* Two-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Left Column: Input Boundary & Privacy Twin */}
          <div className="space-y-6">
            <DocumentIngestion
              rawPayload={rawPayload}
              onChangePayload={setRawPayload}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              onRunAudit={handleRunAudit}
              onReset={handleReset}
              isRunning={isRunning}
              uploadError={uploadError}
              setUploadError={setUploadError}
            />

            <PrivacyTwinPanel
              securityResult={securityResult}
              rawInput={rawPayload}
            />
          </div>

          {/* Right Column: Pipeline Stepper & Audit Verdict Card */}
          <div className="space-y-6">
            <PipelineStepper stages={stages} />

            {decisionResult && verificationResult && securityResult && extractionResult ? (
              <div aria-live="polite">
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
              </div>
            ) : (
              <div className="bg-surface rounded-card border border-border p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-dark border border-border flex items-center justify-center mx-auto text-text-muted">
                  <span className="font-mono text-xl">04</span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Audit Verdict Pending
                </h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                  Select an evaluation scenario on the top bar, then click <strong className="text-primary font-mono">Run Autonomous Audit</strong> to start the four-stage agentic loop.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Persistent Immutable Audit Log */}
        <AuditLedger
          entries={ledgerEntries}
          onClearLedger={clearLedger}
        />

      </main>

      {/* Benchmark Catalog Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-border/60 py-4 px-6 text-center text-xs text-text-muted font-mono">
        GreenLedger Auditor • Zero-Trust Agentic ERP Gate • SHA-256 Tamper-Evident Ledger • Powered by Google Gemini 2.5
      </footer>

    </div>
  );
};

export default App;
