import { describe, it, expect } from 'vitest';
import { runPreFlightSecurityScan } from '../src/utils/security';
import { verifyInvoiceLineItems, evaluateDecisionPolicy } from '../src/utils/verification';
import { DEMO_SCENARIOS } from '../src/constants/scenarios';
import { ExtractedInvoice } from '../src/types/audit';

describe('End-to-End Multimodal Pipeline Integration Tests', () => {
  const cleanScenario = DEMO_SCENARIOS.find(s => s.id === 'clean')!;
  const anomalyScenario = DEMO_SCENARIOS.find(s => s.id === 'anomaly')!;
  const adversarialScenario = DEMO_SCENARIOS.find(s => s.id === 'adversarial')!;

  it('Pipeline Journey 1: Clean Invoice completes all stages and achieves AUTO_APPROVED', () => {
    // Stage 1
    const sec = runPreFlightSecurityScan(cleanScenario.rawInvoiceText, true);
    expect(sec.blockedBeforeModel).toBe(false);

    // Stage 2: extraction
    const mockExtracted: ExtractedInvoice = {
      vendorName: 'EcoPack Logistics GmbH',
      invoiceNumber: 'INV-2026-EP-8921',
      invoiceDate: '2026-02-14',
      currency: 'USD',
      lineItems: [
        {
          id: '1',
          description: 'Recycled Corrugated Packaging (Single-wall B-flute, 400x300x250mm)',
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
          id: '2',
          description: 'Cold-Chain Freight (Per Km)',
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
      extractionSource: 'GEMINI_2_5_FLASH',
      isFixture: false
    };

    // Stage 3: verification
    const ver = verifyInvoiceLineItems(mockExtracted);
    expect(ver.totalBilledAmount).toBe(7050.0);
    expect(ver.totalEstimatedCarbonKg).toBe(2825.0);
    expect(ver.maxPriceVariancePercent).toBe(0.0);
    expect(ver.hasPriceAnomaly).toBe(false);
    expect(ver.hasCarbonMismatch).toBe(false);

    // Stage 4: decision routing
    const dec = evaluateDecisionPolicy(sec, ver, mockExtracted);
    expect(dec.verdict).toBe('AUTO_APPROVED');
    expect(dec.isEscalated).toBe(false);
  });

  it('Pipeline Journey 2: Anomaly Scenario escalates with 42% price variance and 3.4x carbon mismatch', () => {
    // Stage 1
    const sec = runPreFlightSecurityScan(anomalyScenario.rawInvoiceText, true);
    expect(sec.blockedBeforeModel).toBe(false);

    // Stage 2
    const mockApex: ExtractedInvoice = {
      vendorName: 'Apex Industrial Chemicals Corp',
      invoiceNumber: 'INV-2026-AIC-4409',
      invoiceDate: '2026-02-18',
      currency: 'USD',
      lineItems: [
        {
          id: '1',
          description: 'Industrial Solvent Grade A (Ultra-High Purity 99.8%)',
          category: 'chem-solvent-grade-a',
          quantity: 1000,
          unit: 'L',
          billedUnitPrice: 26.27, // 42% markup
          lineTotal: 26270.0,
          claimedCarbonKg: 1235.3, // 3.4x lower than true factor 4.20
          sustainabilityClaims: ['EcoSolv low carbon'],
          certificationRefs: []
        }
      ],
      subtotal: 26270.0,
      totalAmount: 26620.0,
      claimedTotalCarbonKg: 1235.3,
      extractionSource: 'GEMINI_2_5_FLASH',
      isFixture: false
    };

    // Stage 3
    const ver = verifyInvoiceLineItems(mockApex);
    expect(ver.maxPriceVariancePercent).toBe(42.0);
    expect(ver.hasPriceAnomaly).toBe(true);
    expect(ver.hasCarbonMismatch).toBe(true);
    expect(ver.lineItems[0].carbonMismatchRatio).toBe(3.4);

    // Stage 4
    const dec = evaluateDecisionPolicy(sec, ver, mockApex);
    expect(dec.verdict).toBe('ESCALATED_REMEDIATION');
    expect(dec.isEscalated).toBe(true);
    expect(dec.modelTierUsed).toContain('pro');
    expect(dec.remediationActions.some(a => a.includes('42%'))).toBe(true);
  });

  it('Pipeline Journey 3: Adversarial Scenario is intercepted in Stage 1 with 0 model calls', () => {
    // Stage 1 with gate enabled
    const sec = runPreFlightSecurityScan(adversarialScenario.rawInvoiceText, true);
    expect(sec.blockedBeforeModel).toBe(true);
    expect(sec.injectionDetected).toBe(true);
    expect(sec.status).toBe('INJECTION_BLOCKED');

    // Model call is NEVER initiated
    const emptyExt: ExtractedInvoice = {
      vendorName: 'BLOCKED: Adversarial Threat',
      invoiceNumber: 'N/A',
      invoiceDate: '2026-02-21',
      currency: 'USD',
      lineItems: [],
      subtotal: 0,
      totalAmount: 0,
      extractionSource: 'DEMO_FIXTURE',
      isFixture: true
    };
    const ver = verifyInvoiceLineItems(emptyExt);
    const dec = evaluateDecisionPolicy(sec, ver, emptyExt);

    expect(dec.verdict).toBe('QUARANTINED');
    expect(dec.remediationActions.some(a => a.toLowerCase().includes('quarantine'))).toBe(true);
  });
});
