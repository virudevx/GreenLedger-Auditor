import { AuditLogEntry } from '../types/audit';

/**
 * Deterministically sorts object keys for canonical JSON serialization (RFC 8785)
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalizeJson(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys
    .filter(key => key !== 'sha256Hash') // Exclude the hash field itself
    .map(key => `${JSON.stringify(key)}:${canonicalizeJson((obj as Record<string, unknown>)[key])}`);

  return '{' + pairs.join(',') + '}';
}

/**
 * Computes SHA-256 hash using Web Crypto API in browser or standard crypto
 */
export async function computeSha256(text: string): Promise<string> {
  // Web Crypto API in browser or modern Node
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return sha256Fallback(text);
}

/**
 * Pure TypeScript SHA-256 implementation
 */
function sha256Fallback(str: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);

  const words: number[] = [];
  const asciiBitLength = str.length * 8;

  const hash: number[] = [];
  const k: number[] = [];

  let primeCounter = 0;
  for (let candidate = 2; primeCounter < 64; candidate++) {
    let isPrime = true;
    for (let factor = 2; factor * factor <= candidate; factor++) {
      if (candidate % factor === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  let padded = str + '\x80';
  while ((padded.length % 64) !== 56) {
    padded += '\x00';
  }

  for (let i = 0; i < padded.length; i++) {
    const j = padded.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | (j << (((3 - i) % 4) * 8));
  }

  words.push((asciiBitLength / maxWord) | 0);
  words.push(asciiBitLength | 0);

  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    while (w.length < 16) w.push(0);

    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = ((w[i - 16] || 0) + s0 + (w[i - 7] || 0) + s1) | 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[i] + w[i]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Generates an immutable SHA-256 hash for an audit log entry
 */
export async function generateEntryHash(
  entry: Omit<AuditLogEntry, 'sha256Hash'>,
  previousRecordHash: string | null = null
): Promise<string> {
  const canonicalPayload = canonicalizeJson({
    ...entry,
    previousRecordHash: previousRecordHash ?? null,
  });
  return computeSha256(canonicalPayload);
}

/**
 * Verifies an audit log entry's tamper-evident SHA-256 hash
 */
export async function verifyEntryIntegrity(entry: AuditLogEntry): Promise<{
  isValid: boolean;
  computedHash: string;
  storedHash: string;
}> {
  const { sha256Hash, ...entryWithoutHash } = entry;
  const computed = await generateEntryHash(entryWithoutHash, entry.previousRecordHash ?? null);
  return {
    isValid: computed.toLowerCase() === sha256Hash.toLowerCase(),
    computedHash: computed,
    storedHash: sha256Hash,
  };
}

/**
 * Verifies the integrity of an entire hash-chained audit ledger
 */
export async function verifyAuditChain(entries: AuditLogEntry[]): Promise<{
  chainValid: boolean;
  brokenAtIndex: number | null;
  error?: string;
}> {
  if (entries.length === 0) {
    return { chainValid: true, brokenAtIndex: null };
  }

  const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prevHash = i === 0 ? null : sorted[i - 1].sha256Hash;

    if (i > 0 && current.previousRecordHash && current.previousRecordHash !== prevHash) {
      return {
        chainValid: false,
        brokenAtIndex: i,
        error: `Broken hash chain at index ${i} (${current.vendorName}): previousRecordHash '${current.previousRecordHash}' does not match prior entry hash '${prevHash}'.`
      };
    }

    const { isValid, computedHash } = await verifyEntryIntegrity(current);
    if (!isValid) {
      return {
        chainValid: false,
        brokenAtIndex: i,
        error: `Tampered record detected at index ${i} (${current.vendorName}): Stored hash '${current.sha256Hash}' does not match recomputed SHA-256 '${computedHash}'.`
      };
    }
  }

  return { chainValid: true, brokenAtIndex: null };
}
