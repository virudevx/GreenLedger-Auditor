import React, { useState } from 'react';
import { SecurityGateResult } from '../types/audit';
import { Eye, ShieldCheck, ShieldAlert, AlertTriangle, Copy, Check } from 'lucide-react';

interface PrivacyTwinPanelProps {
  securityResult: SecurityGateResult | null;
  rawInput: string;
}

export const PrivacyTwinPanel: React.FC<PrivacyTwinPanelProps> = ({
  securityResult,
  rawInput,
}) => {
  const [activeTab, setActiveTab] = useState<'raw' | 'sanitized'>('sanitized');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render raw text with highlighted spans for PII and Injections
  const renderHighlightedRawText = (text: string) => {
    if (!securityResult || securityResult.findings.length === 0) {
      return text;
    }

    // Sort findings by position if available, or replace tokens with markers
    let formattedText = text;

    // Highlight injections first (red)
    const injectionFindings = securityResult.findings.filter(f => f.type === 'PROMPT_INJECTION');
    for (const finding of injectionFindings) {
      const regex = new RegExp(`(${escapeRegExp(finding.matchedText)})`, 'gi');
      formattedText = formattedText.replace(regex, '___INJECTION_START___$1___INJECTION_END___');
    }

    // Highlight PII (amber)
    const piiFindings = securityResult.findings.filter(f => f.type.startsWith('PII_'));
    for (const finding of piiFindings) {
      const regex = new RegExp(`(${escapeRegExp(finding.matchedText)})`, 'gi');
      formattedText = formattedText.replace(regex, '___PII_START___$1___PII_END___');
    }

    // Split and render elements
    const parts = formattedText.split(/(___INJECTION_START___.*?___INJECTION_END___|___PII_START___.*?___PII_END___)/s);

    return parts.map((part, idx) => {
      if (part.startsWith('___INJECTION_START___') && part.endsWith('___INJECTION_END___')) {
        const content = part.replace('___INJECTION_START___', '').replace('___INJECTION_END___', '');
        return (
          <mark key={idx} className="highlight-injection" title="Adversarial Prompt Injection Signature Detected">
            {content}
          </mark>
        );
      }
      if (part.startsWith('___PII_START___') && part.endsWith('___PII_END___')) {
        const content = part.replace('___PII_START___', '').replace('___PII_END___', '');
        return (
          <mark key={idx} className="highlight-pii" title="Sensitive PII Detected (Redacted prior to model invocation)">
            {content}
          </mark>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const sanitizedDisplay = securityResult ? securityResult.sanitizedPayload : rawInput;

  return (
    <div className="bg-surface rounded-card border border-border p-4 space-y-3">
      
      {/* Header and View Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">
            Privacy Twin: Trust Boundary Inspector
          </h2>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-dark border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === 'raw'
                ? 'bg-surface-light text-text-primary border border-border'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Raw Untrusted Input
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sanitized')}
            className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === 'sanitized'
                ? 'bg-primary-dim text-primary-light border border-primary/30'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Sanitized Agent Payload
          </button>
        </div>
      </div>

      {/* Security Telemetry Badge Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-surface-dark border border-border/80 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">PII Redactions:</span>
            <span className={`font-semibold ${securityResult && securityResult.piiRedactedCount > 0 ? 'text-warning' : 'text-text-primary'}`}>
              {securityResult ? securityResult.piiRedactedCount : 0} detected
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Injection Signatures:</span>
            <span className={`font-semibold ${securityResult && securityResult.injectionCount > 0 ? 'text-danger' : 'text-primary'}`}>
              {securityResult ? securityResult.injectionCount : 0} found
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Model State:</span>
            <span className={`font-semibold ${securityResult?.blockedBeforeModel ? 'text-danger' : 'text-primary'}`}>
              {securityResult?.blockedBeforeModel ? 'BLOCKED (0 Model Invocations)' : 'Sanitized for Gemini 2.5 Flash'}
            </span>
          </div>
        </div>

        <button
          onClick={() => handleCopy(activeTab === 'raw' ? rawInput : sanitizedDisplay)}
          className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
          title="Copy payload to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Blocked Model Notification if Blocked */}
      {securityResult?.blockedBeforeModel && (
        <div className="p-3 rounded-lg bg-danger-dim border border-danger/60 text-xs text-danger flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold uppercase tracking-wider">Zero-Trust Pre-Flight Quarantine Active:</strong>{' '}
            Adversarial prompt injection intercepted before reaching the LLM context. No tokens were transmitted to Google Gemini. Zero model inference cost incurred.
          </div>
        </div>
      )}

      {/* Content Display */}
      <div className="rounded-lg bg-surface-dark border border-border p-3 font-mono text-xs overflow-x-auto max-h-[220px] select-text leading-relaxed">
        {activeTab === 'raw' ? (
          <div className="whitespace-pre-wrap text-text-secondary">
            {renderHighlightedRawText(rawInput || 'No document loaded.')}
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-text-primary">
            {sanitizedDisplay || 'No document loaded.'}
          </div>
        )}
      </div>

      {/* Explanatory Footer */}
      <div className="text-[11px] text-text-muted flex items-center justify-between">
        <span>
          Amber highlights sensitive PII redacted before external API transit. Red wavy highlights identify adversarial jailbreaks.
        </span>
        <span className="text-[10px] font-mono">
          GDPR Art. 6 / CCPA Compliant
        </span>
      </div>

    </div>
  );
};
