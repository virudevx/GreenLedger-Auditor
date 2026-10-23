import { describe, expect, it } from 'vitest';
import { createRateLimiter, hasValidFileSignature, parseAuditRequest, validateRawPayload } from '../server/validation';
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

  it('validates file signatures instead of trusting MIME types alone', () => {
    expect(hasValidFileSignature('application/pdf', new TextEncoder().encode('%PDF-1.7'))).toBe(true);
    expect(hasValidFileSignature('image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(hasValidFileSignature('image/png', new TextEncoder().encode('not an image'))).toBe(false);
    expect(hasValidFileSignature('image/jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
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
