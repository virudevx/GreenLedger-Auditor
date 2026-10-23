import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  Download,
  Layers,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { AuditCertificate, AuditLogEntry } from '../types/audit';
import { verifyAuditChain } from '../utils/crypto';
import { downloadAuditCertificate, downloadJsonFile } from '../utils/storage';

interface AuditLedgerProps {
  entries: AuditLogEntry[];
  onClearLedger: () => void;
}

const securityTone = (status: AuditLogEntry['securityStatus']) => {
  switch (status) {
    case 'CLEAN':
      return 'border-primary/30 bg-primary-dim text-primary-light';
    case 'PII_REDACTED':
      return 'border-warning/30 bg-warning-dim text-warning';
    case 'INJECTION_BLOCKED':
    case 'UNPROTECTED_WARNING':
      return 'border-danger/40 bg-danger-dim text-danger';
    default:
      return 'border-border bg-surface-light text-text-muted';
  }
};

const verdictTone = (verdict: AuditLogEntry['verdict']) => {
  if (verdict === 'AUTO_APPROVED') return 'border-primary/30 bg-primary-dim text-primary-light';
  if (verdict === 'ESCALATED_REMEDIATION') return 'border-warning/30 bg-warning-dim text-warning';
  return 'border-danger/40 bg-danger-dim text-danger';
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const AuditLedger: React.FC<AuditLedgerProps> = ({ entries, onClearLedger }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<{ chainValid: boolean; error?: string }>({ chainValid: true });
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    verifyAuditChain(entries).then((result) => {
      if (isMounted) setChainStatus({ chainValid: result.chainValid, error: result.error });
    });
    return () => {
      isMounted = false;
    };
  }, [entries]);

  const handleCopyHash = (hash: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    window.setTimeout(() => setCopiedHash(null), 1800);
  };

  const handleExportEntryCertificate = (entry: AuditLogEntry, event: React.MouseEvent) => {
    event.stopPropagation();
    const cert: AuditCertificate = {
      schemaVersion: '1.0.0-GLA',
      auditId: entry.id,
      timestamp: entry.timestamp,
      vendorName: entry.vendorName,
      invoiceNumber: entry.invoiceNumber,
      security: {
        status: entry.securityStatus,
        redactionCount: entry.piiRedactedCount,
        findingsCount: entry.securityFindings?.length || 0,
        blockedBeforeModel: entry.securityStatus === 'INJECTION_BLOCKED',
      },
      aiExecution: {
        modelTier: entry.modelTierUsed,
        latencyMs: entry.latencyMs,
        tokenSavingsPercent: entry.tokenSavingsPercent,
        isDemonstrationFixture: entry.modelTierUsed.includes('fixture') || entry.modelTierUsed.includes('deterministic'),
      },
      verification: {
        benchmarkDatasetVersion: entry.benchmarkDatasetVersion || '2026.Q1-EU-DEFRA-EPA-HYBRID',
        totalBilledAmount: entry.totalBilledAmount,
        totalEstimatedCarbonKg: entry.totalCarbonKg,
        maxPriceVariancePercent: entry.maxPriceVariancePercent,
        lineItemCount: entry.verifiedLineItems?.length || 0,
      },
      decision: {
        verdict: entry.verdict,
        reasoningSummary: entry.reasoningSummary,
        remediationActions: entry.remediationActions || [],
      },
      integrity: {
        sha256Hash: entry.sha256Hash,
        hashingAlgorithm: 'SHA-256 (Canonical JSON Payload)',
        previousRecordHash: entry.previousRecordHash || null,
        canonicalization: 'RFC-8785 Canonical JSON Serialization',
      },
    };
    downloadAuditCertificate(cert);
  };

  const handleExportLog = () => {
    downloadJsonFile(`GreenLedger-Audit-Log-${new Date().toISOString().slice(0, 10)}.json`, {
      schemaVersion: '1.0.0-GLA',
      exportedAt: new Date().toISOString(),
      recordCount: entries.length,
      chainVerified: chainStatus.chainValid,
      entries,
    });
  };

  return (
    <div id="audit-ledger" className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary">
            <Database className="h-4 w-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-white">Immutable Audit Log</h2>
              <span className="rounded-full border border-border bg-surface-dark px-2 py-0.5 font-mono text-[9px] text-text-muted">
                {entries.length} {entries.length === 1 ? 'record' : 'records'} sealed
              </span>
            </div>
            <p className="text-[10px] text-text-muted">SHA-256 hash chain persisted in this browser.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold tracking-wide ${
                chainStatus.chainValid
                  ? 'border-primary/30 bg-primary-dim text-primary-light'
                  : 'border-danger/40 bg-danger-dim text-danger'
              }`}
            >
              {chainStatus.chainValid ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              {chainStatus.chainValid ? 'CHAIN VERIFIED' : 'CHAIN TAMPERED'}
            </span>
          )}

          <button
            type="button"
            onClick={handleExportLog}
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-light px-2.5 py-1.5 text-[10px] font-semibold text-text-primary transition-colors hover:border-text-secondary disabled:cursor-not-allowed disabled:opacity-40 focus-ring"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            Export log
          </button>

          {entries.length > 0 && (
            <button
              type="button"
              onClick={onClearLedger}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[10px] font-medium text-text-muted transition-colors hover:text-danger focus-ring"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-left text-[10.5px]">
          <thead className="bg-surface-dark text-[9px] uppercase tracking-[0.1em] text-text-muted">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Timestamp</th>
              <th className="px-3 py-2.5 font-semibold">Vendor</th>
              <th className="px-3 py-2.5 font-semibold">Security</th>
              <th className="px-3 py-2.5 font-semibold">Model</th>
              <th className="px-3 py-2.5 text-right font-semibold">Total CO₂e</th>
              <th className="px-3 py-2.5 text-center font-semibold">Verdict</th>
              <th className="px-3 py-2.5 text-right font-semibold">Hash</th>
              <th className="px-3 py-2.5 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-mono">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[10px] text-text-muted">
                  No records yet. An audit auto-runs on load — commit its verdict to seal the first record.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                      className={`cursor-pointer transition-colors hover:bg-surface-light/30 ${isExpanded ? 'bg-surface-light/20' : ''}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">{formatTimestamp(entry.timestamp)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-sans font-semibold text-text-primary">{entry.vendorName}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${securityTone(entry.securityStatus)}`}>
                          {entry.securityStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2.5 text-[9.5px] text-text-secondary">{entry.modelTierUsed}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-primary-light">
                        {entry.totalCarbonKg !== null ? `${entry.totalCarbonKg.toLocaleString()} kg` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${verdictTone(entry.verdict)}`}>
                          {entry.verdict.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={(event) => handleCopyHash(entry.sha256Hash, event)}
                          className="inline-flex items-center gap-1 text-[9.5px] text-text-muted transition-colors hover:text-text-primary focus-ring"
                          title="Copy the full SHA-256 hash"
                        >
                          <span>{entry.sha256Hash.slice(0, 7)}…{entry.sha256Hash.slice(-4)}</span>
                          {copiedHash === entry.sha256Hash ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 opacity-60" />}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(event) => handleExportEntryCertificate(entry, event)}
                            className="rounded p-1 text-text-muted transition-colors hover:bg-surface hover:text-primary focus-ring"
                            title="Export certificate JSON"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <span className="rounded p-1 text-text-muted">
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-surface-dark/80">
                        <td colSpan={8} className="space-y-3 border-y border-border/70 p-4 font-sans">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2 text-[10px]">
                            <div className="flex flex-wrap items-center gap-2 font-mono">
                              <Lock className="h-3.5 w-3.5 text-primary" />
                              <span className="text-text-muted">Audit ID:</span>
                              <span className="font-semibold text-text-primary">{entry.id}</span>
                              <span className="text-text-muted">Invoice:</span>
                              <span className="text-text-primary">{entry.invoiceNumber}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-text-muted">Billed:</span>
                              <span className="font-semibold text-text-primary">${entry.totalBilledAmount.toLocaleString()}</span>
                              <span className="text-text-muted">Max variance:</span>
                              <span className="font-semibold text-warning">
                                {entry.maxPriceVariancePercent !== null ? `${entry.maxPriceVariancePercent}%` : '—'}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl border border-border bg-surface p-2.5 font-mono text-[10px]">
                            <div className="flex items-center justify-between text-[9px] text-text-muted">
                              <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3 text-primary" />
                                Record SHA-256 digest
                              </span>
                              <button
                                type="button"
                                onClick={(event) => handleCopyHash(entry.sha256Hash, event)}
                                className="text-primary hover:underline"
                              >
                                {copiedHash === entry.sha256Hash ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <div className="mt-1 break-all font-semibold text-primary-light">{entry.sha256Hash}</div>
                            {entry.previousRecordHash && (
                              <div className="mt-1 truncate text-[9px] text-text-muted">
                                Previous: <span className="text-text-secondary">{entry.previousRecordHash}</span>
                              </div>
                            )}
                          </div>

                          <p className="text-[10.5px] leading-relaxed text-text-secondary">
                            <strong className="text-text-primary">Reasoning: </strong>
                            {entry.reasoningSummary}
                          </p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 rounded-xl border border-border/60 bg-surface-dark p-2.5 text-[9.5px] leading-relaxed text-text-muted">
        <strong className="font-mono text-text-secondary">Integrity model:</strong> each record is canonicalized and
        SHA-256 hashed, with the previous record's hash chained in. This detects local tampering, but browser storage can
        be rewritten by a privileged user; server-side append-only anchoring is still required for independent finality.
      </div>
    </div>
  );
};
