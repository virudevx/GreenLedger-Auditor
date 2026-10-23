import { describe, it, expect } from 'vitest';
import { evaluateDecisionPolicy, verifyInvoiceLineItems } from '../src/utils/verification';
import { runPreFlightSecurityScan } from '../src/utils/security';
import { ExtractedInvoice } from '../src/types/audit';
import { DEMO_SCENARIOS } from '../src/constants/scenarios';

describe('Decision Routing Policy Tests', () => {
  it('1. Fully compliant clean invoice can be auto-approved', () => {
    const cleanScenario = DEMO_SCENARIOS.find(s => s.id === 'clean')!;
    const security = runPreFlightSecurityScan(cleanScenario.rawInvoiceText, true);

    const cleanInvoice: ExtractedInvoice = {
      vendorName: 'EcoPack Logistics GmbH',
      invoiceNumber: 'INV-2026-EP-8921',
      invoiceDate: '2026-02-14',
      currency: 'USD',
      lineItems: [
        {
          id: '1',
          description: 'Recycled Corrugated Packaging',
          category: 'pkg-corrugated-recycled',
          quantity: 5000,
          unit: 'unit',
          billedUnitPrice: 1.20,
          lineTotal: 6000.0,
          claimedCarbonKg: 2250.0,
          sustainabilityClaims: [],
          certificationRefs: []
        }
      ],
      subtotal: 6000.0,
      totalAmount: 6000.0,
      claimedTotalCarbonKg: 2250.0,
      extractionSource: 'DEMO_FIXTURE',
      isFixture: true
    };

    const verification = verifyInvoiceLineItems(cleanInvoice);
    const decision = evaluateDecisionPolicy(security, verification, cleanInvoice);

    expect(decision.verdict).toBe('AUTO_APPROVED');
    expect(decision.isEscalated).toBe(false);
  });

  it('2. Material price anomaly prevents automatic approval and escalates for remediation', () => {
    const cleanSecurity = runPreFlightSecurityScan('Standard Invoice', true);

    const anomalousInvoice: ExtractedInvoice = {
      vendorName: 'Apex Industrial Chemicals',
      invoiceNumber: 'INV-2026-AIC-4409',
      invoiceDate: '2026-02-18',
      currency: 'USD',
      lineItems: [
        {
          id: '1',
          description: 'Industrial Solvent Grade A',
          category: 'chem-solvent-grade-a',
          quantity: 1000,
          unit: 'L',
          billedUnitPrice: 26.27, // +42% variance
          lineTotal: 26270.0,
          claimedCarbonKg: 4200.0,
          sustainabilityClaims: [],
          certificationRefs: []
        }
      ],
      subtotal: 26270.0,
      totalAmount: 26270.0,
      claimedTotalCarbonKg: 4200.0,
      extractionSource: 'DEMO_FIXTURE',
      isFixture: true
    };

    const verification = verifyInvoiceLineItems(anomalousInvoice);
    const decision = evaluateDecisionPolicy(cleanSecurity, verification, anomalousInvoice);

    expect(decision.verdict).toBe('ESCALATED_REMEDIATION');
    expect(decision.isEscalated).toBe(true);
    expect(decision.remediationActions.length).toBeGreaterThan(0);
  });

  it('3. Blocked prompt injection results in QUARANTINED verdict and zero approval', () => {
    const adversarialScenario = DEMO_SCENARIOS.find(s => s.id === 'adversarial')!;
    const security = runPreFlightSecurityScan(adversarialScenario.rawInvoiceText, true);

    const emptyInvoice: ExtractedInvoice = {
      vendorName: 'ShadowCorp Freight',
      invoiceNumber: 'N/A',
      invoiceDate: '2026-02-21',
      currency: 'USD',
      lineItems: [],
      subtotal: 0,
      totalAmount: 0,
      claimedTotalCarbonKg: null,
      extractionSource: 'DEMO_FIXTURE',
      isFixture: true
    };

    const verification = verifyInvoiceLineItems(emptyInvoice);
    const decision = evaluateDecisionPolicy(security, verification, emptyInvoice);

    expect(decision.verdict).toBe('QUARANTINED');
    expect(decision.remediationActions).toContain('Quarantine vendor account in ERP pending forensic security investigation.');
  });
});
