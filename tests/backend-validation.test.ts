import { describe, expect, it } from 'vitest';
import { createRateLimiter, parseAuditRequest, validateRawPayload } from '../server/validation';
import { normalizeGeminiInvoice } from '../server/gemini';

describe('Backend request validation and abuse controls', () => {
  it('applies safe defaults and parses multipart-style values', () => {
    const result = parseAuditRequest({ gateEnabled: 'false', priceTolerance: '12.5', carbonTolerance: 20 });
    expect(result.gateEnabled).toBe(false);
    expect(result.config.priceVarianceTolerancePercent).toBe(12.5);
    expect(result.config.carbonVarianceTolerancePercent).toBe(20);
  });

  it('rejects invalid or unbounded tolerances', () => {
    expect(() => parseAuditRequest({ priceTolerance: 'not-a-number' })).toThrow('priceTolerance');
    expect(() => parseAuditRequest({ carbonTolerance: 1001 })).toThrow('carbonTolerance');
  });

  it('rejects missing and oversized payloads while allowing file-only audits', () => {
    expect(validateRawPayload('', false)).toContain('Missing');
    expect(validateRawPayload('x'.repeat(250_001), false)).toContain('maximum allowed');
    expect(validateRawPayload('', true)).toBeNull();
  });

  it('limits each client independently and resets expired windows', () => {
    const allow = createRateLimiter({ windowMs: 1000, maxRequests: 2 });
    expect(allow('client-a', 0)).toBe(true);
    expect(allow('client-a', 1)).toBe(true);
    expect(allow('client-a', 2)).toBe(false);
    expect(allow('client-b', 2)).toBe(true);
    expect(allow('client-a', 1001)).toBe(true);
  });

  it('normalizes untrusted model output before verification', () => {
    const invoice = normalizeGeminiInvoice({
      vendorName: '  Supplier  ',
      currency: 'usd',
      lineItems: [
        { description: 'Solvent', quantity: '100', billedUnitPrice: '18.5', lineTotal: 'invalid', claimedCarbonKg: 'bad' },
        { description: 'Ignored extra item' }
      ]
    });
    expect(invoice.vendorName).toBe('Supplier');
    expect(invoice.currency).toBe('USD');
    expect(invoice.lineItems[0].lineTotal).toBe(1850);
    expect(invoice.lineItems[0].claimedCarbonKg).toBe(0);
    expect(invoice.lineItems).toHaveLength(2);
    expect(Number.isFinite(invoice.totalAmount)).toBe(true);
  });
});
