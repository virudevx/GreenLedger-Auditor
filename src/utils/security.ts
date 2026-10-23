import { SecurityFinding, SecurityGateResult, SecurityStatus } from '../types/audit';

export interface SensitivePatternDefinition {
  type: SecurityFinding['type'];
  label: string;
  regex: RegExp;
  placeholder: string;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Configurable regex patterns for enterprise PII & sensitive identification
export const SENSITIVE_PATTERNS: SensitivePatternDefinition[] = [
  {
    type: 'PII_EMAIL',
    label: 'Email Address',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    placeholder: '[REDACTED_EMAIL]',
    description: 'Direct contact identifier subject to GDPR / CCPA data privacy safeguards.',
    confidence: 'HIGH'
  },
  {
    type: 'PII_IBAN',
    label: 'IBAN Banking Number',
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
    placeholder: '[REDACTED_IBAN]',
    description: 'International Bank Account Number; potential vector for unverified payment rerouting.',
    confidence: 'HIGH'
  },
  {
    type: 'PII_TAX_ID',
    label: 'Tax Identification / EIN / VAT',
    regex: /\b(?:US-EIN\s*[:#]?\s*\d{2}-\d{7}|VAT\s*[:#]?\s*[A-Z]{2}[A-Z0-9]{6,12}|DE\d{9}|GB\d{9,12})\b/gi,
    placeholder: '[REDACTED_TAX_ID]',
    description: 'Corporate or individual legal tax registration number.',
    confidence: 'HIGH'
  },
  {
    type: 'PII_PERSONAL_ID',
    label: 'Personal Identifier / SSN',
    regex: /\b(?:SSN\s*[:#]?\s*\d{3}-\d{2}-\d{4}|\b\d{3}-\d{2}-\d{4}\b)\b/gi,
    placeholder: '[REDACTED_PERSONAL_ID]',
    description: 'Social Security Number or national identity number.',
    confidence: 'HIGH'
  }
];

// Heuristics and adversarial prompt injection signatures
export interface InjectionRule {
  pattern: RegExp;
  label: string;
  description: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const INJECTION_RULES: InjectionRule[] = [
  {
    pattern: /(?:SYSTEM\s+OVERRIDE|ADMIN\s+OVERRIDE|DEVELOPER\s+MODE|ROOT\s+EXECUTE)/i,
    label: 'Privilege Escalation Override',
    description: 'Explicit attempt to bypass system role boundaries and assert unauthorized administrative control.',
    threatLevel: 'CRITICAL'
  },
  {
    pattern: /(?:ignore\s+(?:all\s+)?previous\s+rules|disregard\s+(?:all\s+)?prior\s+instructions|forget\s+(?:all\s+)?constraints)/i,
    label: 'Context Purge / Instruction Hijacking',
    description: 'Classic jailbreak directive instructing language model to discard system boundaries.',
    threatLevel: 'CRITICAL'
  },
  {
    pattern: /(?:approve\s+.*wire\s+transfer|transfer\s+\$[\d,]+|execute\s+payment|release\s+funds)/i,
    label: 'Unauthorized Financial Execution Instruction',
    description: 'Adversarial attempt to coerce model or agent into authorizing disbursement or bypassing AP approval workflows.',
    threatLevel: 'CRITICAL'
  },
  {
    pattern: /(?:mark\s+carbon\s+emissions\s+as\s+0|set\s+emissions?\s+to\s+zero|report\s+0kg|disregard\s+environmental)/i,
    label: 'Emissions Falsification Injection',
    description: 'Direct command to erase or spoof carbon reporting metrics, violating regulatory Scope 3 compliance.',
    threatLevel: 'CRITICAL'
  },
  {
    pattern: /(?:output\s+AUTO_APPROVED|force\s+verdict|bypass\s+audit)/i,
    label: 'Audit Gate Bypass Command',
    description: 'Attempt to force automated pass verdict into downstream state machine.',
    threatLevel: 'HIGH'
  },
  {
    pattern: /(?:reveal\s+(?:api\s*key|system\s*prompt|secret|credential))/i,
    label: 'System Prompt & Secret Exfiltration',
    description: 'Attempt to elicit internal configuration, API tokens, or server context.',
    threatLevel: 'HIGH'
  }
];

/**
 * Deterministic pre-flight security scanner.
 * Executes purely in local trusted memory before calling any external LLM or API.
 */
export function runPreFlightSecurityScan(
  rawInput: string,
  gateEnabled: boolean = true
): SecurityGateResult {
  const findings: SecurityFinding[] = [];
  let sanitizedText = rawInput;
  let piiRedactedCount = 0;
  let injectionCount = 0;

  // 1. Detect & Redact PII (always executed even in Red-Team demo mode for safety)
  for (const item of SENSITIVE_PATTERNS) {
    const matches = Array.from(rawInput.matchAll(item.regex));
    for (const match of matches) {
      const matchedText = match[0];
      piiRedactedCount++;
      findings.push({
        type: item.type,
        label: item.label,
        matchedText,
        redactedText: item.placeholder,
        confidence: item.confidence,
        description: item.description,
        location: match.index !== undefined ? { start: match.index, end: match.index + matchedText.length } : undefined
      });
    }
    // Replace in sanitized output
    sanitizedText = sanitizedText.replace(item.regex, item.placeholder);
  }

  // 2. Detect Prompt Injections & Policy Violations
  for (const rule of INJECTION_RULES) {
    const matches = Array.from(rawInput.matchAll(new RegExp(rule.pattern.source, 'gi')));
    for (const match of matches) {
      injectionCount++;
      findings.push({
        type: 'PROMPT_INJECTION',
        label: rule.label,
        matchedText: match[0],
        confidence: 'HIGH',
        description: rule.description,
        location: match.index !== undefined ? { start: match.index, end: match.index + match[0].length } : undefined
      });
    }
  }

  const injectionDetected = injectionCount > 0;
  const blockedBeforeModel = gateEnabled && injectionDetected;

  let status: SecurityStatus = 'CLEAN';
  if (gateEnabled && injectionDetected) {
    status = 'INJECTION_BLOCKED';
  } else if (!gateEnabled && injectionDetected) {
    status = 'UNPROTECTED_WARNING';
  } else if (piiRedactedCount > 0) {
    status = 'PII_REDACTED';
  }

  return {
    status,
    gateEnabled,
    injectionDetected,
    blockedBeforeModel,
    piiRedactedCount,
    injectionCount,
    findings,
    sanitizedPayload: sanitizedText,
    rawPayload: rawInput,
    blockedReason: blockedBeforeModel 
      ? `Blocked by Zero-Trust Gate: ${injectionCount} adversarial prompt-injection patterns detected. Zero external model calls permitted.`
      : undefined
  };
}
