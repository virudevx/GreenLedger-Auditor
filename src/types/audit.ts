// GreenLedger Auditor - Core Domain Types

export type SecurityStatus = 
  | 'CLEAN'
  | 'PII_REDACTED'
  | 'INJECTION_BLOCKED'
  | 'UNPROTECTED_WARNING';

export type PipelineStageState = 
  | 'IDLE'
  | 'SCANNING'
  | 'PASSED'
  | 'ESCALATED'
  | 'QUARANTINED'
  | 'FAILED';

export type AuditVerdict = 
  | 'AUTO_APPROVED'
  | 'ESCALATED_REMEDIATION'
  | 'QUARANTINED';

export interface SecurityFinding {
  type: 'PII_EMAIL' | 'PII_IBAN' | 'PII_TAX_ID' | 'PII_PERSONAL_ID' | 'PROMPT_INJECTION' | 'POLICY_OVERRIDE' | 'FINANCIAL_TAMPER';
  label: string;
  matchedText: string;
  redactedText?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  location?: { start: number; end: number };
}

export interface SecurityGateResult {
  status: SecurityStatus;
  gateEnabled: boolean;
  injectionDetected: boolean;
  blockedBeforeModel: boolean;
  piiRedactedCount: number;
  injectionCount: number;
  findings: SecurityFinding[];
  sanitizedPayload: string;
  rawPayload: string;
  blockedReason?: string;
}

export interface RawLineItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  billedUnitPrice: number;
  lineTotal: number;
  claimedCarbonKg?: number | null;
  claimedIntensity?: number | null;
  sustainabilityClaims?: string[];
  certificationRefs?: string[];
}

export interface ExtractedInvoice {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  lineItems: RawLineItem[];
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  claimedTotalCarbonKg?: number | null;
  overallSustainabilityClaims?: string[];
  certificationReferences?: string[];
  extractionSource: 'GEMINI_2_5_FLASH' | 'GEMINI_2_5_PRO' | 'DEMO_FIXTURE';
  isFixture: boolean;
}

export interface BenchmarkItem {
  id: string;
  name: string;
  category: string;
  benchmarkUnit: string;
  benchmarkPrice: number;
  currency: string;
  carbonFactor: number;
  carbonFactorUnit: string;
  dataSource: string;
  datasetVersion: string;
  isVerified: boolean;
  description: string;
  notes?: string;
}

export interface VerifiedLineItem {
  id: string;
  description: string;
  matchedBenchmarkId: string | null;
  benchmarkName: string | null;
  quantity: number;
  unit: string;
  billedUnitPrice: number;
  benchmarkUnitPrice: number | null;
  priceVariancePercent: number | null;
  priceStatus: 'NORMAL' | 'ELEVATED' | 'ANOMALY' | 'UNMATCHED';
  estimatedCarbonKg: number | null;
  benchmarkCarbonFactor: number | null;
  claimedCarbonKg: number | null;
  carbonVariancePercent: number | null;
  carbonMismatchRatio: number | null;
  carbonStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'MISMATCH' | 'UNMATCHED' | 'INVALID_UNIT';
  notes: string;
}

export interface VerificationResult {
  lineItems: VerifiedLineItem[];
  totalBilledAmount: number;
  totalEstimatedCarbonKg: number | null;
  totalClaimedCarbonKg: number | null;
  maxPriceVariancePercent: number | null;
  hasUnmatchedItems: boolean;
  hasPriceAnomaly: boolean;
  hasCarbonMismatch: boolean;
  hasUnitIncompatibility: boolean;
  benchmarkVersion: string;
  verificationTimestamp: string;
}

export interface DecisionResult {
  verdict: AuditVerdict;
  modelTierUsed: string;
  isEscalated: boolean;
  escalationReason?: string | null;
  reasoningSummary: string;
  deterministicRulesChecked: {
    rule: string;
    passed: boolean;
    detail: string;
  }[];
  remediationActions: string[];
}

export interface TelemetryData {
  latencyMs: number;
  startTime: string;
  endTime: string;
  tokenSavingsPercent: number | null;
  tokensConsumed?: number;
  baselineTokensWithoutGate?: number;
  modelTier: string;
  securityGateState: boolean;
}

export interface StageProgress {
  stageNumber: number;
  name: string;
  state: PipelineStageState;
  startedAt?: string;
  completedAt?: string;
  elapsedMs?: number;
  summary?: string;
  error?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  vendorName: string;
  invoiceNumber: string;
  securityStatus: SecurityStatus;
  piiRedactedCount: number;
  modelTierUsed: string;
  latencyMs: number;
  tokenSavingsPercent: number | null;
  totalBilledAmount: number;
  totalCarbonKg: number | null;
  maxPriceVariancePercent: number | null;
  verdict: AuditVerdict;
  reasoningSummary: string;
  sha256Hash: string;
  previousRecordHash?: string | null;
  benchmarkDatasetVersion?: string;
  securityFindings?: SecurityFinding[];
  verifiedLineItems?: VerifiedLineItem[];
  remediationActions?: string[];
  quarantineReason?: string;
  isVerified?: boolean;
  rawPayloadSnippet?: string;
}

export interface AuditCertificate {
  schemaVersion: string;
  auditId: string;
  timestamp: string;
  vendorName: string;
  invoiceNumber: string;
  security: {
    status: SecurityStatus;
    redactionCount: number;
    findingsCount: number;
    blockedBeforeModel: boolean;
  };
  aiExecution: {
    modelTier: string;
    latencyMs: number;
    tokenSavingsPercent: number | null;
    isDemonstrationFixture: boolean;
  };
  verification: {
    benchmarkDatasetVersion: string;
    totalBilledAmount: number;
    totalEstimatedCarbonKg: number | null;
    maxPriceVariancePercent: number | null;
    lineItemCount: number;
  };
  decision: {
    verdict: AuditVerdict;
    reasoningSummary: string;
    remediationActions: string[];
  };
  integrity: {
    sha256Hash: string;
    hashingAlgorithm: string;
    previousRecordHash: string | null;
    canonicalization: string;
  };
}
