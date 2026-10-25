import { describe, it, expect, vi } from 'vitest';

// Initialize the module with a deterministic (mocked) Gemini client, regardless of .env.
process.env.GEMINI_API_KEY = 'test-key-not-real';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { extractInvoiceWithGemini } = await import('../server/gemini');

const uploadedDocument = { mimeType: 'application/pdf', base64: 'JVBERi0xLjQK' };

describe('Multimodal extraction for uploaded documents', () => {
  it('fails loudly when the model reads no line items from an uploaded document', async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ vendorName: 'Blank Scanned Corp', lineItems: [] })
    });

    await expect(
      extractInvoiceWithGemini('[Uploaded File: blank.pdf (1.0 KB, application/pdf)]', uploadedDocument)
    ).rejects.toThrow(/no invoice line items/i);
  });

  it('fails loudly when the model call errors for an uploaded document', async () => {
    generateContent.mockRejectedValueOnce(new Error('model not found'));

    await expect(
      extractInvoiceWithGemini('[Uploaded File: scan.png (2.0 KB, image/png)]', uploadedDocument)
    ).rejects.toThrow(/could not read this document/i);
  });

  it('reports an exhausted quota as an actionable message, not raw API JSON', async () => {
    generateContent.mockRejectedValueOnce(
      new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"You exceeded your current quota"}}')
    );

    const failure = await extractInvoiceWithGemini(
      '[Uploaded File: scan.png (2.0 KB, image/png)]',
      uploadedDocument
    ).then(
      () => null,
      (err: Error) => err
    );

    expect(failure).not.toBeNull();
    expect(failure!.message).toMatch(/quota is exhausted/i);
    expect(failure!.message).not.toContain('RESOURCE_EXHAUSTED');
    expect(failure!.message.length).toBeLessThan(200);
  });

  it('never matches a demo fixture from the filename placeholder alone', async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ vendorName: 'EcoPack Logistics GmbH', invoiceNumber: 'INV-9999', lineItems: [] })
    });

    // The placeholder must not resurrect fixture data: zero line items still means failure.
    await expect(
      extractInvoiceWithGemini('[Uploaded File: invoice.pdf (3.0 KB, application/pdf)]', uploadedDocument)
    ).rejects.toThrow(/no invoice line items/i);
  });

  it('still extracts pasted text through the model when no file is attached', async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        vendorName: 'ACME Freight Ltd',
        invoiceNumber: 'INV-2026-ACM-777',
        invoiceDate: '2026-10-01',
        currency: 'USD',
        lineItems: [
          {
            id: 'item-1',
            description: 'Cold-chain freight services',
            quantity: 1200,
            unit: 'km',
            billedUnitPrice: 2.4,
            lineTotal: 2880,
            claimedCarbonKg: 1380
          }
        ],
        subtotal: 2880,
        totalAmount: 2880,
        claimedTotalCarbonKg: 1380
      })
    });

    const result = await extractInvoiceWithGemini(
      'Invoice: INV-2026-ACM-777\n1. Cold-chain freight services\nQuantity: 1200 km\nUnit price: 2.40\nTotal: 2880.00'
    );

    expect(result.modelUsed).toMatch(/gemini-flash-lite-latest|gemini-3\.8-flash|gemini-3\.1-flash-lite/);
    expect(result.invoice.vendorName).toBe('ACME Freight Ltd');
    expect(result.invoice.lineItems).toHaveLength(1);
    expect(result.invoice.totalAmount).toBe(2880);
  });
});
