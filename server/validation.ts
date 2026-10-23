import { DEFAULT_VERIFICATION_CONFIG, VerificationConfig } from '../src/utils/verification';

export const MAX_RAW_PAYLOAD_LENGTH = 250_000;
export const MAX_TOLERANCE_PERCENT = 1000;

export interface ParsedAuditRequest {
  gateEnabled: boolean;
  config: VerificationConfig;
}

function parseTolerance(value: unknown, fallback: number, fieldName: string): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_TOLERANCE_PERCENT) {
    throw new Error(`${fieldName} must be a number between 0 and ${MAX_TOLERANCE_PERCENT}.`);
  }
  return parsed;
}

export function parseAuditRequest(body: Record<string, unknown> = {}): ParsedAuditRequest {
  return {
    gateEnabled: body.gateEnabled !== 'false' && body.gateEnabled !== false,
    config: {
      priceVarianceTolerancePercent: parseTolerance(
        body.priceTolerance,
        DEFAULT_VERIFICATION_CONFIG.priceVarianceTolerancePercent,
        'priceTolerance'
      ),
      carbonVarianceTolerancePercent: parseTolerance(
        body.carbonTolerance,
        DEFAULT_VERIFICATION_CONFIG.carbonVarianceTolerancePercent,
        'carbonTolerance'
      )
    }
  };
}

export function validateRawPayload(rawPayload: unknown, hasFile: boolean): string | null {
  if (typeof rawPayload !== 'string') {
    return hasFile ? null : 'Missing rawPayload or uploaded invoice document.';
  }
  if (!rawPayload.trim() && !hasFile) return 'Missing rawPayload or uploaded invoice document.';
  if (rawPayload.length > MAX_RAW_PAYLOAD_LENGTH) {
    return `rawPayload exceeds the maximum allowed length of ${MAX_RAW_PAYLOAD_LENGTH.toLocaleString()} characters.`;
  }
  return null;
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const requests = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now = Date.now()): boolean => {
    for (const [storedKey, value] of requests) {
      if (value.resetAt <= now) requests.delete(storedKey);
    }
    const current = requests.get(key);
    if (!current || current.resetAt <= now) {
      requests.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }
    if (current.count >= options.maxRequests) return false;
    current.count += 1;
    return true;
  };
}
