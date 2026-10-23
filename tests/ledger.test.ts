import { describe, it, expect } from 'vitest';
import { 
  generateEntryHash, 
  verifyEntryIntegrity, 
  verifyAuditChain, 
  canonicalizeJson 
} from '../src/utils/crypto';
import { AuditLogEntry } from '../src/types/audit';

describe('Immutable Audit Log & Cryptographic Integrity Tests', () => {
  const sampleEntry: Omit<AuditLogEntry, 'sha256Hash'> = {
    id: 'GLA-1001',
    timestamp: '2026-02-23T10:00:00.000Z',
    vendorName: 'EcoPack Logistics GmbH',
    invoiceNumber: 'INV-2026-EP-8921',
    securityStatus: 'CLEAN',
    piiRedactedCount: 0,
    modelTierUsed: 'gemini-2.5-flash',
    latencyMs: 312,
    tokenSavingsPercent: 12,
    totalBilledAmount: 7050.0,
    totalCarbonKg: 2825.0,
    maxPriceVariancePercent: 0.0,
    verdict: 'AUTO_APPROVED',
    reasoningSummary: 'Fully compliant invoice.',
    previousRecordHash: null
  };

  it('1. Audit commits generate valid 64-character SHA-256 hex hashes', async () => {
    const hash = await generateEntryHash(sampleEntry);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it('2. Canonicalization produces identical serialization regardless of key insertion order', () => {
    const objA = { z: 1, a: 2, m: { y: 'test', b: 'nested' } };
    const objB = { a: 2, m: { b: 'nested', y: 'test' }, z: 1 };
    expect(canonicalizeJson(objA)).toBe(canonicalizeJson(objB));
  });

  it('3. An untampered record verifies successfully', async () => {
    const hash = await generateEntryHash(sampleEntry);
    const fullEntry: AuditLogEntry = { ...sampleEntry, sha256Hash: hash };

    const verification = await verifyEntryIntegrity(fullEntry);
    expect(verification.isValid).toBe(true);
    expect(verification.computedHash).toBe(hash);
  });

  it('4. A tampered record fails cryptographic integrity verification', async () => {
    const hash = await generateEntryHash(sampleEntry);
    const tamperedEntry: AuditLogEntry = {
      ...sampleEntry,
      totalBilledAmount: 99999.0, // Tampered billed amount!
      sha256Hash: hash
    };

    const verification = await verifyEntryIntegrity(tamperedEntry);
    expect(verification.isValid).toBe(false);
    expect(verification.computedHash).not.toBe(hash);
  });

  it('5. Chained records correctly verify sequential hash references', async () => {
    const hash1 = await generateEntryHash(sampleEntry, null);
    const entry1: AuditLogEntry = { ...sampleEntry, sha256Hash: hash1 };

    const entry2Data: Omit<AuditLogEntry, 'sha256Hash'> = {
      ...sampleEntry,
      id: 'GLA-1002',
      timestamp: '2026-02-23T10:05:00.000Z',
      invoiceNumber: 'INV-2026-EP-8922',
      previousRecordHash: hash1 // Points to previous hash
    };
    const hash2 = await generateEntryHash(entry2Data, hash1);
    const entry2: AuditLogEntry = { ...entry2Data, sha256Hash: hash2 };

    const chainResult = await verifyAuditChain([entry1, entry2]);
    expect(chainResult.chainValid).toBe(true);
    expect(chainResult.brokenAtIndex).toBeNull();
  });

  it('6. Chained records detect broken previousRecordHash pointer', async () => {
    const hash1 = await generateEntryHash(sampleEntry, null);
    const entry1: AuditLogEntry = { ...sampleEntry, sha256Hash: hash1 };

    const entry2Data: Omit<AuditLogEntry, 'sha256Hash'> = {
      ...sampleEntry,
      id: 'GLA-1002',
      timestamp: '2026-02-23T10:05:00.000Z',
      invoiceNumber: 'INV-2026-EP-8922',
      previousRecordHash: 'forged_or_tampered_prev_hash' // Broken pointer
    };
    const hash2 = await generateEntryHash(entry2Data, 'forged_or_tampered_prev_hash');
    const entry2: AuditLogEntry = { ...entry2Data, sha256Hash: hash2 };

    const chainResult = await verifyAuditChain([entry1, entry2]);
    expect(chainResult.chainValid).toBe(false);
    expect(chainResult.brokenAtIndex).toBe(1);
    expect(chainResult.error).toContain('Broken hash chain');
  });
});
