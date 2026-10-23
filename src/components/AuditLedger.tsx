import React, { useState, useEffect } from 'react';
import { AuditLogEntry, AuditCertificate } from '../types/audit';
import { 
  verifyEntryIntegrity, 
  verifyAuditChain 
} from '../utils/crypto';
import { downloadAuditCertificate } from '../utils/storage';
import { 
  Database, 
  ShieldCheck, 
  ShieldAlert, 
  Copy, 
  Check, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers
} from 'lucide-react';

interface AuditLedgerProps {
  entries: AuditLogEntry[];
  onClearLedger: () => void;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({
  entries,
  onClearLedger,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<{ chainValid: boolean; error?: string }>({ chainValid: true });
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Run cryptographic chain verification whenever entries change
  useEffect(() => {
    let isMounted = true;
    verifyAuditChain(entries).then((res) => {
      if (isMounted) {
        setChainStatus({ chainValid: res.chainValid, error: res.error });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [entries]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleCopyHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportEntryCertificate = (entry: AuditLogEntry, e: React.MouseEvent) => {
    e.stopPropagation();
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
        blockedBeforeModel: entry.securityStatus === 'INJECTION_BLOCKED'
      },
      aiExecution: {
        modelTier: entry.modelTierUsed,
        latencyMs: entry.latencyMs,
        tokenSavingsPercent: entry.tokenSavingsPercent,
        isDemonstrationFixture: entry.modelTierUsed.includes('fixture') || entry.modelTierUsed.includes('deterministic')
      },
      verification: {
        benchmarkDatasetVersion: entry.benchmarkDatasetVersion || '2026.Q1-EU-DEFRA-EPA-HYBRID',
        totalBilledAmount: entry.totalBilledAmount,
        totalEstimatedCarbonKg: entry.totalCarbonKg,
        maxPriceVariancePercent: entry.maxPriceVariancePercent,
        lineItemCount: entry.verifiedLineItems?.length || 0
      },
      decision: {
        verdict: entry.verdict,
        reasoningSummary: entry.reasoningSummary,
        remediationActions: entry.remediationActions || []
      },
      integrity: {
        sha256Hash: entry.sha256Hash,
        hashingAlgorithm: 'SHA-256 (Canonical JSON Payload)',
        previousRecordHash: entry.previousRecordHash || null,
        canonicalization: 'RFC-8785 Canonical JSON Serialization'
      }
    };
    downloadAuditCertificate(cert);
  };

  return (
    <div className="bg-surface rounded-card border border-border p-5 space-y-4">
      
      {/* Header and Integrity Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
              <span>Tamper-Evident SHA-256 Audit Ledger</span>
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-surface-light border border-border text-text-secondary">
                {entries.length} {entries.length === 1 ? 'Record' : 'Records'} Sealed
              </span>
            </h2>
            <p className="text-xs text-text-secondary">
              Cryptographically chained record ledger with deterministic state persistence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chain Integrity Status Badge */}
          {entries.length > 0 && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border ${
              chainStatus.chainValid 
                ? 'bg-primary-dim border-primary/40 text-primary-light' 
                : 'bg-danger-dim border-danger text-danger animate-pulse'
            }`}>
              {chainStatus.chainValid ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>CHAIN: VERIFIED</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-danger" />
                  <span>CHAIN: TAMPERED!</span>
                </>
              )}
            </div>
          )}

          {entries.length > 0 && (
            <button
              onClick={onClearLedger}
              className="text-[11px] font-mono text-text-muted hover:text-danger transition-colors px-2 py-1"
            >
              Clear Local Log
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-dark border-b border-border text-[11px] font-mono text-text-muted uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Supplier / Vendor</th>
              <th className="py-2.5 px-3">Security Status</th>
              <th className="py-2.5 px-3">Model Tier</th>
              <th className="py-2.5 px-3 text-right">Scope 3 CO₂e</th>
              <th className="py-2.5 px-3 text-center">Verdict</th>
              <th className="py-2.5 px-3 text-right">SHA-256 Hash</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-mono">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-text-muted font-mono">
                  No audit records committed to ledger yet. Run an audit and click "Commit Ledger Verdict".
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isExpanded = expandedId === entry.id;

                let verdictBadge = 'bg-primary-dim text-primary-light border-primary/30';
                if (entry.verdict === 'ESCALATED_REMEDIATION') {
                  verdictBadge = 'bg-warning-dim text-warning border-warning/40';
                } else if (entry.verdict === 'QUARANTINED') {
                  verdictBadge = 'bg-danger-dim text-danger border-danger/40';
                }

                let secBadge = 'text-primary';
                if (entry.securityStatus === 'INJECTION_BLOCKED') secBadge = 'text-danger font-bold';
                else if (entry.securityStatus === 'PII_REDACTED') secBadge = 'text-warning';
                else if (entry.securityStatus === 'UNPROTECTED_WARNING') secBadge = 'text-danger';

                const formattedTime = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <React.Fragment key={entry.id}>
                    <tr 
                      onClick={() => toggleExpand(entry.id)}
                      className={`hover:bg-surface-light/40 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-surface-light/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-text-muted whitespace-nowrap">
                        {formattedTime}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-text-primary whitespace-nowrap">
                        {entry.vendorName}
                      </td>
                      <td className={`py-2.5 px-3 text-[11px] ${secBadge}`}>
                        {entry.securityStatus.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-text-secondary text-[11px] truncate max-w-[130px]">
                        {entry.modelTierUsed}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                        {entry.totalCarbonKg !== null ? `${entry.totalCarbonKg.toLocaleString()} kg` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-semibold ${verdictBadge}`}>
                          {entry.verdict.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => handleCopyHash(entry.sha256Hash, e)}
                          className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors font-mono"
                          title="Click to copy full SHA-256 hash"
                        >
                          <span>{entry.sha256Hash.slice(0, 8)}...{entry.sha256Hash.slice(-6)}</span>
                          {copiedHash === entry.sha256Hash ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => handleExportEntryCertificate(entry, e)}
                            className="p-1 hover:bg-surface rounded text-text-muted hover:text-primary transition-colors"
                            title="Export Audit Certificate JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1 hover:bg-surface rounded text-text-muted hover:text-text-primary transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Audit Log Details Row */}
                    {isExpanded && (
                      <tr className="bg-surface-dark/80">
                        <td colSpan={8} className="p-4 border-t border-b border-border/70 space-y-3 font-sans">
                          
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-border/50 pb-2">
                            <div className="flex items-center gap-2 font-mono">
                              <Lock className="w-3.5 h-3.5 text-primary" />
                              <span className="text-text-muted">Audit ID:</span>
                              <span className="font-semibold text-text-primary">{entry.id}</span>
                              <span className="text-text-muted ml-2">Invoice:</span>
                              <span className="text-text-primary">{entry.invoiceNumber}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-text-muted">Total Billed:</span>
                              <span className="font-semibold text-text-primary">${entry.totalBilledAmount.toLocaleString()}</span>
                              <span className="text-text-muted ml-2">Max Price Var:</span>
                              <span className="font-semibold text-warning">{entry.maxPriceVariancePercent !== null ? `${entry.maxPriceVariancePercent}%` : 'N/A'}</span>
                            </div>
                          </div>

                          {/* Full Cryptographic Hash & Chaining Info */}
                          <div className="p-2.5 rounded-lg bg-surface border border-border text-xs font-mono space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-text-muted">
                              <span className="flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5 text-primary" />
                                <span>Record SHA-256 Digest (Canonical JSON Payload)</span>
                              </span>
                              <button
                                onClick={(e) => handleCopyHash(entry.sha256Hash, e)}
                                className="text-primary hover:underline"
                              >
                                {copiedHash === entry.sha256Hash ? 'Copied to clipboard' : 'Copy Full Hash'}
                              </button>
                            </div>
                            <div className="break-all text-[11px] text-primary-light font-semibold select-all">
                              {entry.sha256Hash}
                            </div>
                            {entry.previousRecordHash && (
                              <div className="pt-1 text-[10px] text-text-muted truncate">
                                Previous Chained Hash: <span className="text-text-secondary">{entry.previousRecordHash}</span>
                              </div>
                            )}
                          </div>

                          {/* Narrative Summary */}
                          <div className="text-xs text-text-secondary leading-relaxed">
                            <strong className="text-text-primary">Reasoning Summary: </strong>
                            {entry.reasoningSummary}
                          </div>

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

      {/* Cryptographic Trust Boundary Disclosure */}
      <div className="p-3 rounded-lg bg-surface-dark border border-border/60 text-[11px] text-text-muted leading-relaxed">
        <strong className="text-text-secondary font-mono">Integrity Model Disclosure: </strong>
        This tamper-evident hash chain canonicalizes every procurement verification event with SHA-256. While tamper-evident against accidental or local data corruption in browser storage, cryptographic finality against root privileged actors requires optional server-side append-only anchoring.
      </div>

    </div>
  );
};
