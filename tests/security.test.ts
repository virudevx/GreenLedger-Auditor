import { describe, it, expect } from 'vitest';
import { runPreFlightSecurityScan, SENSITIVE_PATTERNS } from '../src/utils/security';
import { DEMO_SCENARIOS } from '../src/constants/scenarios';

describe('Security Engine & Pre-Flight Gate Tests', () => {
  const cleanScenario = DEMO_SCENARIOS.find(s => s.id === 'clean')!;
  const adversarialScenario = DEMO_SCENARIOS.find(s => s.id === 'adversarial')!;

  it('1. Clean invoice passes the security stage without blocking', () => {
    const result = runPreFlightSecurityScan(cleanScenario.rawInvoiceText, true);
    expect(result.blockedBeforeModel).toBe(false);
    expect(result.injectionDetected).toBe(false);
    expect(result.status).not.toBe('INJECTION_BLOCKED');
  });

  it('2. Email addresses are detected and redacted with [REDACTED_EMAIL]', () => {
    const textWithEmail = 'Please remit funds to billing@ecopack-logistics.de for processing.';
    const result = runPreFlightSecurityScan(textWithEmail, true);
    expect(result.piiRedactedCount).toBeGreaterThanOrEqual(1);
    expect(result.sanitizedPayload).toContain('[REDACTED_EMAIL]');
    expect(result.sanitizedPayload).not.toContain('billing@ecopack-logistics.de');
  });

  it('3. IBAN identifiers are detected and redacted with [REDACTED_IBAN]', () => {
    const textWithIban = 'Wire routing to IBAN DE44500105175489021234 in Germany.';
    const result = runPreFlightSecurityScan(textWithIban, true);
    expect(result.piiRedactedCount).toBeGreaterThanOrEqual(1);
    expect(result.sanitizedPayload).toContain('[REDACTED_IBAN]');
    expect(result.sanitizedPayload).not.toContain('DE44500105175489021234');
  });

  it('4. Tax identifiers (US-EIN, VAT, DE) are detected and redacted', () => {
    const textWithTax = 'Tax ID: US-EIN 84-1928374 and VAT DE318992014';
    const result = runPreFlightSecurityScan(textWithTax, true);
    expect(result.sanitizedPayload).toContain('[REDACTED_TAX_ID]');
    expect(result.sanitizedPayload).not.toContain('84-1928374');
  });

  it('5. Adversarial scenario is blocked before model when gate is enabled', () => {
    const result = runPreFlightSecurityScan(adversarialScenario.rawInvoiceText, true);
    expect(result.injectionDetected).toBe(true);
    expect(result.blockedBeforeModel).toBe(true);
    expect(result.status).toBe('INJECTION_BLOCKED');
    expect(result.blockedReason).toContain('Blocked by Zero-Trust Gate');
  });

  it('6. Blocked adversarial scenario reports high-confidence injection signatures', () => {
    const result = runPreFlightSecurityScan(adversarialScenario.rawInvoiceText, true);
    const injectionFindings = result.findings.filter(f => f.type === 'PROMPT_INJECTION');
    expect(injectionFindings.length).toBeGreaterThan(0);
    const matchedTexts = injectionFindings.map(f => f.matchedText.toLowerCase());
    const hasOverride = matchedTexts.some(t => t.includes('system override') || t.includes('override'));
    expect(hasOverride).toBe(true);
  });

  it('7. Disabling the gate produces UNPROTECTED_WARNING and does not block', () => {
    const result = runPreFlightSecurityScan(adversarialScenario.rawInvoiceText, false);
    expect(result.gateEnabled).toBe(false);
    expect(result.blockedBeforeModel).toBe(false);
    expect(result.status).toBe('UNPROTECTED_WARNING');
  });

  it('8. PII remains redacted even in Red-Team / Unprotected demo mode', () => {
    const result = runPreFlightSecurityScan(adversarialScenario.rawInvoiceText, false);
    expect(result.sanitizedPayload).toContain('[REDACTED_IBAN]');
    expect(result.sanitizedPayload).not.toContain('DE89370400440532013000');
    expect(result.sanitizedPayload).toContain('[REDACTED_EMAIL]');
    expect(result.sanitizedPayload).not.toContain('director-ops@shadowcorp-freight.com');
  });
});
