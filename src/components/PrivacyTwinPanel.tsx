import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  CreditCard,
  Eye,
  Fingerprint,
  Landmark,
  Mail,
  PencilLine,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SecurityFinding, SecurityGateResult } from '../types/audit';

interface PrivacyTwinPanelProps {
  securityResult: SecurityGateResult | null;
  rawInput: string;
  selectedFile: File | null;
  onChangePayload: (value: string) => void;
  onRunAudit: () => void;
  onAutoRun: (payload: string) => void;
  isRunning: boolean;
  editorSignal: number;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const maskValue = (value: string) => {
  if (value.length <= 4) return '••••';
  const visible = value.length > 12 ? 3 : 2;
  return `${value.slice(0, visible)}${'•'.repeat(Math.min(10, Math.max(4, value.length - visible - 2)))}${value.slice(-2)}`;
};

const FINDING_GROUPS: Array<{
  type: SecurityFinding['type'];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: 'PROMPT_INJECTION', label: 'Injection attempt', icon: ShieldAlert },
  { type: 'PII_EMAIL', label: 'Email address', icon: Mail },
  { type: 'PII_IBAN', label: 'IBAN', icon: Landmark },
  { type: 'PII_TAX_ID', label: 'Tax ID', icon: CreditCard },
  { type: 'PII_PERSONAL_ID', label: 'Personal ID', icon: Fingerprint },
];

export const PrivacyTwinPanel: React.FC<PrivacyTwinPanelProps> = ({
  securityResult,
  rawInput,
  selectedFile,
  onChangePayload,
  onRunAudit,
  onAutoRun,
  isRunning,
  editorSignal,
}) => {
  const [activeTab, setActiveTab] = useState<'raw' | 'sanitized'>('raw');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (editorSignal > 0) {
      setActiveTab('raw');
      setIsEditing(true);
      const timer = window.setTimeout(() => document.getElementById('invoice-payload')?.focus(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [editorSignal]);

  const displayRaw = rawInput || (selectedFile ? `[Attached document: ${selectedFile.name}]` : '');
  const sanitizedDisplay = securityResult?.sanitizedPayload || '';

  const findings = securityResult?.findings ?? [];
  const piiCount = securityResult?.piiRedactedCount ?? 0;
  const injectionCount = securityResult?.injectionCount ?? 0;
  const isBlocked = Boolean(securityResult?.blockedBeforeModel);

  const statusBadge = isBlocked
    ? { label: 'Blocked · 0 model calls', tone: 'border-danger/40 bg-danger-dim text-danger', Icon: ShieldAlert }
    : securityResult?.status === 'UNPROTECTED_WARNING'
      ? { label: 'Gate off · unprotected', tone: 'border-danger/40 bg-danger-dim text-danger', Icon: ShieldAlert }
      : securityResult?.status === 'PII_REDACTED'
        ? { label: 'PII redacted', tone: 'border-warning/30 bg-warning-dim text-warning', Icon: ShieldCheck }
        : securityResult
          ? { label: 'Sanitized · clean', tone: 'border-primary/30 bg-primary-dim text-primary-light', Icon: ShieldCheck }
          : { label: 'Not analyzed yet', tone: 'border-border bg-surface-dark text-text-muted', Icon: ShieldCheck };
  const StatusIcon = statusBadge.Icon;

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!event.clipboardData.getData('text').trim()) return;
    const target = event.currentTarget;
    window.setTimeout(() => {
      onChangePayload(target.value);
      onAutoRun(target.value);
    }, 0);
  };

  const renderHighlightedRawText = (text: string) => {
    if (!securityResult || securityResult.findings.length === 0) {
      return <span>{text || 'No document loaded.'}</span>;
    }

    let formattedText = text;

    const injectionFindings = securityResult.findings.filter((finding) => finding.type === 'PROMPT_INJECTION');
    for (const finding of injectionFindings) {
      const regex = new RegExp(`(${escapeRegExp(finding.matchedText)})`, 'gi');
      formattedText = formattedText.replace(regex, '___INJECTION_START___$1___INJECTION_END___');
    }

    const piiFindings = securityResult.findings.filter((finding) => finding.type.startsWith('PII_'));
    for (const finding of piiFindings) {
      const regex = new RegExp(`(${escapeRegExp(finding.matchedText)})`, 'gi');
      formattedText = formattedText.replace(regex, '___PII_START___$1___PII_END___');
    }

    const parts = formattedText.split(/(___INJECTION_START___.*?___INJECTION_END___|___PII_START___.*?___PII_END___)/s);

    return parts.map((part, index) => {
      if (part.startsWith('___INJECTION_START___') && part.endsWith('___INJECTION_END___')) {
        return (
          <mark key={index} className="highlight-injection" title="Prompt-injection signature">
            {part.replace('___INJECTION_START___', '').replace('___INJECTION_END___', '')}
          </mark>
        );
      }
      if (part.startsWith('___PII_START___') && part.endsWith('___PII_END___')) {
        return (
          <mark key={index} className="highlight-pii" title="Sensitive data redacted before model transit">
            {part.replace('___PII_START___', '').replace('___PII_END___', '')}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <section
      id="invoice-preview"
      aria-labelledby="privacy-twin-title"
      className="min-w-0 rounded-card border border-border bg-surface p-4 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lilac/15 text-lilac">
            <Eye className="h-4 w-4" />
          </span>
          <div>
            <h2 id="privacy-twin-title" className="text-sm font-extrabold tracking-tight text-white">
              Invoice Preview &amp; Security Analysis
            </h2>
            <p className="text-[10px] text-text-muted">
              The trust boundary: raw document on the left, what the model receives on the right.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${statusBadge.tone}`}>
            <StatusIcon className="h-3 w-3" />
            {statusBadge.label}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-dark p-1" role="tablist" aria-label="Payload view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'raw'}
            onClick={() => setActiveTab('raw')}
            className={`rounded-lg px-3 py-1.5 text-[10.5px] font-semibold transition-colors focus-ring ${
              activeTab === 'raw'
                ? 'bg-lilac text-slate-950 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Raw Input
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sanitized'}
            onClick={() => setActiveTab('sanitized')}
            className={`rounded-lg px-3 py-1.5 text-[10.5px] font-semibold transition-colors focus-ring ${
              activeTab === 'sanitized'
                ? 'bg-primary text-slate-950 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Sanitized Payload
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {activeTab === 'raw' && (
            <button
              type="button"
              onClick={() => setIsEditing((current) => !current)}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-dark px-2.5 py-1.5 text-[10px] font-semibold text-text-secondary transition-colors hover:border-primary/40 hover:text-white focus-ring"
            >
              <PencilLine className="h-3 w-3" />
              {isEditing ? 'Preview' : 'Edit text'}
            </button>
          )}

          <button
            type="button"
            onClick={onRunAudit}
            disabled={isRunning || (!rawInput.trim() && !selectedFile)}
            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-950 transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
          >
            <Play className="h-3 w-3" />
            {isRunning ? 'Auditing' : 'Run audit'}
          </button>

          <button
            type="button"
            onClick={() => handleCopy(activeTab === 'raw' ? displayRaw : sanitizedDisplay)}
            aria-label={`Copy ${activeTab === 'raw' ? 'raw' : 'sanitized'} payload`}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface-dark px-2 py-1.5 text-[10px] text-text-muted transition-colors hover:text-white focus-ring"
          >
            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {selectedFile && (
        <div className="mt-2 rounded-xl border border-danger/30 bg-danger-dim px-3 py-2 text-[9.5px] leading-relaxed text-danger">
          <strong className="font-bold uppercase tracking-wide">File outside scan:</strong>{' '}
          the security findings below cover only the text payload. Uploaded file bytes were not scanned for PII or
          injection content.
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 min-[1700px]:grid-cols-[minmax(0,1fr)_220px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-dark">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-muted">
              {activeTab === 'raw' ? 'Untrusted input' : isBlocked ? 'Payload withheld' : 'Model-bound payload'}
            </span>
            <span className="font-mono text-[9.5px] text-text-muted">
              {(activeTab === 'raw' ? displayRaw : sanitizedDisplay).length} chars
            </span>
          </div>

          <div className="max-h-[300px] overflow-auto p-3 font-mono text-[11px] leading-relaxed">
            {activeTab === 'raw' ? (
              isEditing ? (
                <textarea
                  id="invoice-payload"
                  aria-label="Untrusted supplier invoice text"
                  aria-describedby="payload-note"
                  value={rawInput}
                  onChange={(event) => onChangePayload(event.target.value)}
                  onPaste={handlePaste}
                  disabled={isRunning}
                  rows={10}
                  placeholder="Paste untrusted invoice text, freight manifest, or supplier billing payload here…"
                  className="w-full resize-y rounded-lg border border-border bg-[#081220] p-3 font-mono text-[11px] text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                  spellCheck={false}
                />
              ) : (
                <div className="whitespace-pre-wrap text-text-secondary">
                  {renderHighlightedRawText(displayRaw)}
                </div>
              )
            ) : sanitizedDisplay ? (
              <div className="whitespace-pre-wrap text-text-primary">{sanitizedDisplay}</div>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-center text-text-muted">
                <ShieldCheck className="h-8 w-8 text-primary/50" />
                <p className="max-w-[240px] text-[11px]">
                  No sanitized payload yet. Run an audit to see exactly what would reach the model.
                </p>
              </div>
            )}
          </div>

          <div id="payload-note" className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-3 py-2 text-[9.5px] text-text-muted">
            <span>
              {activeTab === 'raw'
                ? 'Amber marks PII. Red wavy marks injection attempts.'
                : isBlocked
                  ? 'The document never reached the model.'
                  : 'This is the exact text passed to the model; uploaded file bytes are separate.'}
            </span>
            <span className="font-mono">Best-effort regex redaction</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Security findings</span>
            <span className="font-mono text-[10px] text-text-muted">
              {securityResult ? `${findings.length}` : '—'}
            </span>
          </div>

          {!securityResult ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-dark/50 px-3 py-5 text-center text-[10px] leading-relaxed text-text-muted">
              <Sparkles className="mx-auto mb-1.5 h-4 w-4 text-lilac" />
              Run or paste a document to inspect PII and injection findings.
            </div>
          ) : findings.length === 0 ? (
            <div className="rounded-2xl border border-primary/20 bg-primary-dim px-3 py-5 text-center text-[10px] leading-relaxed text-primary-light">
              <ShieldCheck className="mx-auto mb-1.5 h-5 w-5" />
              {selectedFile
                ? 'No findings in the text payload. Uploaded file bytes were not scanned.'
                : 'No sensitive data or injection signatures detected.'}
            </div>
          ) : (
            <>
              {FINDING_GROUPS.map(({ type, label, icon: Icon }) => {
                const matches = findings.filter((finding) => finding.type === type);
                if (matches.length === 0) return null;
                const first = matches[0];
                return (
                  <div key={type} className="rounded-xl border border-white/5 bg-surface-dark px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-text-primary">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md ${
                          type === 'PROMPT_INJECTION' ? 'bg-danger-dim text-danger' : 'bg-warning-dim text-warning'
                        }`}>
                          <Icon className="h-3 w-3" />
                        </span>
                        {label}
                      </span>
                      <span className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
                        ×{matches.length}
                      </span>
                    </div>
                    <p className="mt-1 truncate pl-6 font-mono text-[9.5px] text-text-muted">
                      {maskValue(first.matchedText)}
                    </p>
                  </div>
                );
              })}

              <div className="rounded-xl border border-warning/20 bg-warning-dim px-3 py-2.5">
                <p className="text-[10px] font-semibold text-warning">
                  {piiCount + injectionCount} sensitive item{piiCount + injectionCount === 1 ? '' : 's'} detected
                </p>
                <p className="mt-0.5 text-[9.5px] leading-relaxed text-warning/80">
                  {isBlocked
                    ? 'Model invocation blocked. Nothing was transmitted.'
                    : 'PII redacted before external model processing.'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
