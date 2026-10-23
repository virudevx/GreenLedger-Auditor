import { describe, it, expect } from 'vitest';
import { verifyInvoiceLineItems } from '../src/utils/verification';
import { BENCHMARK_CATALOG, APEX_SCENARIO_REFERENCE } from '../src/constants/benchmarks';
import { ExtractedInvoice } from '../src/types/audit';

describe('Deterministic Benchmark & Carbon Calculations Tests', () => {
  it('1. Price variance is calculated correctly using ((Billed - Benchmark) / Benchmark) * 100', () => {
    // Benchmark for Recycled Corrugated Packaging is $1.20
    const mockInvoice: ExtractedInvoice = {
      vendorName: 'Test Vendor',
      invoiceNumber: 'INV-TEST-01',
      invoiceDate: '2026-02-01',
      currency: 'USD',
      lineItems: [
        {
          id: '1',
          description: 'Recycled Corrugated Packaging',
          category: 'pkg-corrugated-recycled',
          quantity: 1000,
          unit: 'unit',
          billedUnitPrice: 1.32, // (1.32 - 1.20) / 1.20 = 0.12 / 1.20 = +10.0%
          lineTotal: 1320.0,
          claimedCarbonKg: 450.0,
          sustainabilityClaims: [],
          certificationRefs: []
        }
      ],
      subtotal: 1320.0,
      totalAmount: 1320.0,
      claimedTotalCarbonKg: 450.0,
      extractionSource: 'DEMO_FIXTURE',
      isFixture: true
    };

    const result = verifyInvoiceLineItems(mockInvoice);
    expect(result.lineItems[0].priceVariancePercent).toBe(10.0);
    expect(result.lineItems[0].benchmarkUnitPrice).toBe(1.20);
  });

  it('2. Carbon emissions are calculated correctly using Quantity * Benchmark Carbon Factor', () => {
    // 5,000 units * 0.45 kg CO2e = 2,250 kg CO2e
    const mockInvoice: ExtractedInvoice = {
      vendorName: 'EcoPack',
      invoiceNumber: 'INV-TEST-02',
      invoiceDate: '2026-02-01',
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

    const result = verifyInvoiceLineItems(mockInvoice);
    expect(result.lineItems[0].estimatedCarbonKg).toBe(2250.0);
    expect(result.totalEstimatedCarbonKg).toBe(2250.0);
    expect(result.lineItems[0].carbonStatus).toBe('OPTIMAL');
  });

  it('3. Incompatible units do not produce invalid arithmetic and are marked INVALID_UNIT', () => {
    const mockInvoice: ExtractedInvoice = {
      vendorName: 'Mismatched Unit Vendor',
      invoiceNumber: 'INV-TEST-03',
      invoiceDate: '2026-02-01',
      currency: 'USD',
      lineItems: [
        {
          id: '1',
          description: 'Recycled Corrugated Packaging',
          category: 'pkg-corrugated-recycled',
          quantity: 500,
          unit: 'liters', // Packaging benchmark is in 'unit', not 'liters'
          billedUnitPrice: 1.20,
          lineTotal: 600.0,
          claimedCarbonKg: null,
          sustainabilityClaims: [],
          certificationRefs: []
        }
      ],
      subtotal: 600.0,
      totalAmount: 600.0,
      claimedTotalCarbonKg: null,
      extractionSource: 'DEMO_FIXTURE',
      isFixture: true
    };

    const result = verifyInvoiceLineItems(mockInvoice);
    expect(result.hasUnitIncompatibility).toBe(true);
    expect(result.lineItems[0].carbonStatus).toBe('INVALID_UNIT');
    expect(result.lineItems[0].estimatedCarbonKg).toBeNull();
  });

  it('4. Missing benchmark data marks line item as UNMATCHED and flags review', () => {
    const mockInvoice: ExtractedInvoice = {
      vendorName: 'Unknown Product Co',
      invoiceNumber: 'INV-TEST-04',
      invoiceDate: '2026-02-01',
      currency: 'USD',
      lineItems: [
        {
          id: '1',
          description: 'Exotic Uncatalogued Widget ZX-99',
          category: 'Space Exploration Gadgets',
          quantity: 10,
          unit: 'unit',
          billedUnitPrice: 999.0,
          lineTotal: 9990.0,
          claimedCarbonKg: null,
          sustainabilityClaims: [],
          certificationRefs: []
        }
      ],
      subtotal: 9990.0,
      totalAmount: 9990.0,
      claimedTotalCarbonKg: null,
      extractionSource: 'DEMO_FIXTURE',
      isFixture: true
    };

    const result = verifyInvoiceLineItems(mockInvoice);
    expect(result.hasUnmatchedItems).toBe(true);
    expect(result.lineItems[0].priceStatus).toBe('UNMATCHED');
    expect(result.lineItems[0].carbonStatus).toBe('UNMATCHED');
  });

  it('5. The Apex Industrial Chemicals scenario produces the configured 42% price markup', () => {
    // Benchmark price for Industrial Solvent Grade A is $18.50/L
    // Billed unit price is $26.27/L
    // ((26.27 - 18.50) / 18.50) * 100 = 42.0%
    const apexInvoice: ExtractedInvoice = {
      vendorName: APEX_SCENARIO_REFERENCE.vendorName,
      invoiceNumber: 'INV-2026-AIC-4409',
      invoiceDate: '2026-02-18',
      currency: 'USD',
      lineItems: [
        {
          id: 'apex-1',
          description: 'Industrial Solvent Grade A (Ultra-High Purity 99.8% Technical Grade)',
          category: APEX_SCENARIO_REFERENCE.categoryId,
          quantity: APEX_SCENARIO_REFERENCE.quantity,
          unit: APEX_SCENARIO_REFERENCE.unit,
          billedUnitPrice: APEX_SCENARIO_REFERENCE.billedUnitPrice,
          lineTotal: 26270.0,
          claimedCarbonKg: APEX_SCENARIO_REFERENCE.claimedTotalCarbonKg,
          sustainabilityClaims: ['Proprietary low-carbon solvent'],
          certificationRefs: []
        }
      ],
      subtotal: 26270.0,
      totalAmount: 26270.0,
      claimedTotalCarbonKg: APEX_SCENARIO_REFERENCE.claimedTotalCarbonKg,
      extractionSource: 'DEMO_FIXTURE',
      isFixture: true
    };

    const result = verifyInvoiceLineItems(apexInvoice);
    const item = result.lineItems[0];
    expect(item.priceVariancePercent).toBe(42.0);
    expect(result.hasPriceAnomaly).toBe(true);
  });

  it('6. The Apex scenario produces the configured 3.4× carbon-intensity discrepancy', () => {
    // Claimed carbon = 1,235.3 kg for 1,000 L -> 1.235 kg/L
    // Benchmark factor = 4.20 kg/L
    // 4.20 / 1.235 = 3.4x
    const apexInvoice: ExtractedInvoice = {
      vendorName: APEX_SCENARIO_REFERENCE.vendorName,
      invoiceNumber: 'INV-2026-AIC-4409',
      invoiceDate: '2026-02-18',
      currency: 'USD',
      lineItems: [
        {
          id: 'apex-1',
          description: 'Industrial Solvent Grade A (Ultra-High Purity 99.8% Technical Grade)',
          category: APEX_SCENARIO_REFERENCE.categoryId,
          quantity: APEX_SCENARIO_REFERENCE.quantity,
          unit: APEX_SCENARIO_REFERENCE.unit,
          billedUnitPrice: APEX_SCENARIO_REFERENCE.billedUnitPrice,
          lineTotal: 26270.0,
          claimedCarbonKg: APEX_SCENARIO_REFERENCE.claimedTotalCarbonKg,
          sustainabilityClaims: [],
          certificationRefs: []
        }
      ],
      subtotal: 26270.0,
      totalAmount: 26270.0,
      claimedTotalCarbonKg: APEX_SCENARIO_REFERENCE.claimedTotalCarbonKg,
      extractionSource: 'DEMO_FIXTURE',
      isFixture: true
    };

    const result = verifyInvoiceLineItems(apexInvoice);
    const item = result.lineItems[0];
    expect(item.carbonMismatchRatio).toBe(3.4);
    expect(result.hasCarbonMismatch).toBe(true);
    expect(item.carbonStatus).toBe('MISMATCH');
    expect(item.estimatedCarbonKg).toBe(4200.0);
  });
});
