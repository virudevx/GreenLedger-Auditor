import React from 'react';
import { 
  DecisionResult, 
  VerificationResult, 
  SecurityGateResult, 
  ExtractedInvoice 
} from '../types/audit';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldX, 
  CheckCheck, 
  FileCheck2, 
  Download, 
  RotateCcw, 
  FileLock2, 
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { VarianceChart } from './VarianceChart';

interface VerdictCardProps {
  decision: DecisionResult;
  verification: VerificationResult;
  security: SecurityGateResult;
  extraction: ExtractedInvoice;
  onCommitLedger: () => void;
  onQuarantineVendor: () => void;
  onExportCertificate: () => void;
  onReset: () => void;
  isCommitted: boolean;
  isQuarantined: boolean;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  decision,
  verification,
  security,
  extraction,
  onCommitLedger,
  onQuarantineVendor,
  onExportCertificate,
  onReset,
  isCommitted,
  isQuarantined,
}) => {
  const { verdict } = decision;

  let verdictColor = 'text-primary border-primary bg-primary-dim';
  let verdictIcon = <CheckCircle2 className="w-6 h-6 text-primary" />;
  let verdictTitle = 'AUTO-APPROVED: PROCUREMENT CLEARED';
  let verdictSubtitle = 'All deterministic security rules, pricing thresholds, and Scope 3 carbon baselines verified.';

  if (verdict === 'ESCALATED_REMEDIATION') {
    verdictColor = 'text-warning border-warning bg-warning-dim';
    verdictIcon = <AlertTriangle className="w-6 h-6 text-warning" />;
    verdictTitle = 'FLAGGED: ESCALATED FOR REMEDIATION';
    verdictSubtitle = 'Deterministic threshold violation detected. Automated payment blocked pending vendor resolution.';
  } else if (verdict === 'QUARANTINED') {
    verdictColor = 'text-danger border-danger bg-danger-dim';
    verdictIcon = <ShieldX className="w-6 h-6 text-danger" />;
    verdictTitle = 'BLOCKED: ADVERSARIAL THREAT QUARANTINED';
    verdictSubtitle = 'Zero-trust pre-flight gate intercepted prompt injection. Vendor quarantined in application state.';
  }

  return (
    <div className="bg-surface rounded-card border border-border p-5 space-y-5">
      
      {/* Prominent Verdict Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${verdictColor}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface/50 border border-current shrink-0">
            {verdictIcon}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-mono tracking-tight leading-tight">
              {verdictTitle}
            </h2>
            <p className="text-xs opacity-90 mt-0.5">
              {verdictSubtitle}
            </p>
          </div>
        </div>

        {/* Vendor & Invoice Metadata Pill */}
        <div className="text-right font-mono text-xs shrink-0 self-end sm:self-center">
          <div className="font-semibold text-text-primary">{extraction.vendorName}</div>
          <div className="text-text-muted">{extraction.invoiceNumber}</div>
        </div>
      </div>

      {/* A. Line-Item Verification Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-primary" />
            <span>Line-Item Verification Matrix</span>
          </h3>
          <span className="text-[11px] font-mono text-text-muted">
            Catalog Version: {verification.benchmarkVersion}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-dark border-b border-border text-[11px] font-mono text-text-muted uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Billed Unit</th>
                <th className="py-2.5 px-3 text-right">Benchmark</th>
                <th className="py-2.5 px-3 text-right">Price Variance</th>
                <th className="py-2.5 px-3 text-right">Est. Scope 3 (kg)</th>
                <th className="py-2.5 px-3 text-center">Carbon Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {verification.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-text-muted">
                    No line items available (Document blocked before extraction).
                  </td>
                </tr>
              ) : (
                verification.lineItems.map((item) => {
                  let varianceBadge = 'text-primary';
                  if (item.priceStatus === 'ANOMALY') varianceBadge = 'text-danger font-bold';
                  else if (item.priceStatus === 'ELEVATED') varianceBadge = 'text-warning font-semibold';
                  else if (item.priceStatus === 'UNMATCHED') varianceBadge = 'text-text-muted';

                  let carbonBadge = 'bg-primary-dim text-primary-light border-primary/30';
                  let carbonLabel = 'OPTIMAL';
                  if (item.carbonStatus === 'MISMATCH') {
                    carbonBadge = 'bg-warning-dim text-warning border-warning/40';
                    carbonLabel = `${item.carbonMismatchRatio ? `${item.carbonMismatchRatio}× ` : ''}MISMATCH`;
                  } else if (item.carbonStatus === 'UNMATCHED') {
                    carbonBadge = 'bg-surface-light text-text-muted border-border';
                    carbonLabel = 'UNMATCHED';
                  } else if (item.carbonStatus === 'INVALID_UNIT') {
                    carbonBadge = 'bg-danger-dim text-danger border-danger/40';
                    carbonLabel = 'UNIT ERROR';
                  }

                  return (
                    <tr key={item.id} className="hover:bg-surface-light/30 transition-colors">
                      <td className="py-2 px-3 font-sans max-w-[200px]">
                        <div className="font-medium text-text-primary truncate" title={item.description}>
                          {item.description}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono truncate">
                          {item.benchmarkName || 'No catalog match'}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-text-primary">
                        {item.quantity.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right text-text-primary">
                        ${item.billedUnitPrice.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-text-muted">
                        {item.benchmarkUnitPrice !== null ? `$${item.benchmarkUnitPrice.toFixed(2)}` : 'N/A'}
                      </td>
                      <td className={`py-2 px-3 text-right ${varianceBadge}`}>
                        {item.priceVariancePercent !== null 
                          ? `${item.priceVariancePercent > 0 ? '+' : ''}${item.priceVariancePercent.toFixed(1)}%`
                          : 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-right text-text-primary font-semibold">
                        {item.estimatedCarbonKg !== null ? item.estimatedCarbonKg.toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-semibold ${carbonBadge}`}>
                          {carbonLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {verification.lineItems.length > 0 && (
              <tfoot className="bg-surface-dark border-t border-border font-mono font-semibold text-xs">
                <tr>
                  <td className="py-2.5 px-3 text-text-secondary uppercase">Total Aggregates</td>
                  <td colSpan={2} className="py-2.5 px-3 text-right text-text-primary">
                    Billed: ${verification.totalBilledAmount.toLocaleString()}
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-right text-text-secondary">
                    Max Var: {verification.maxPriceVariancePercent !== null ? `${verification.maxPriceVariancePercent}%` : 'N/A'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">
                    {verification.totalEstimatedCarbonKg !== null ? `${verification.totalEstimatedCarbonKg.toLocaleString()} kg CO₂e` : 'N/A'}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Visual Chart Comparison */}
      {verification.lineItems.length > 0 && (
        <VarianceChart lineItems={verification.lineItems} />
      )}

      {/* B. Agent Reasoning & Rule Breakdown */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-primary" />
          <span>Zero-Trust Policy & Deterministic Rule Checks</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {decision.deterministicRulesChecked.map((rule, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                rule.passed 
                  ? 'bg-surface-dark border-border text-text-secondary' 
                  : 'bg-danger-dim/30 border-danger/40 text-danger'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {rule.passed ? (
                  <CheckCheck className="w-4 h-4 text-primary" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-danger" />
                )}
              </div>
              <div>
                <div className="font-mono font-semibold text-text-primary text-[11px]">
                  {rule.rule}
                </div>
                <div className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                  {rule.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Narrative Reasoning Summary */}
        <div className="p-3.5 rounded-xl bg-surface-dark border border-border text-xs leading-relaxed">
          <div className="font-mono font-semibold text-primary-light uppercase text-[11px] mb-1">
            Agent Reasoning & Audit Synthesis:
          </div>
          <p className="text-text-primary">
            {decision.reasoningSummary}
          </p>
        </div>
      </div>

      {/* C. Remediation Recommendations */}
      {decision.remediationActions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-warning-dim/30 border border-warning/40 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-warning uppercase">
            <AlertTriangle className="w-4 h-4" />
            <span>Recommended Procurement & ESG Remediation Actions:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-text-primary">
            {decision.remediationActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* D. Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isCommitted || verdict === 'QUARANTINED'}
            onClick={onCommitLedger}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wide transition-colors ${
              isCommitted
                ? 'bg-surface-light text-text-muted border border-border cursor-not-allowed'
                : 'bg-primary text-black hover:bg-primary-hover shadow-glow-emerald'
            }`}
          >
            <FileLock2 className="w-4 h-4" />
            <span>{isCommitted ? 'Ledger Committed' : 'Commit Ledger Verdict'}</span>
          </button>

          <button
            type="button"
            disabled={isQuarantined}
            onClick={onQuarantineVendor}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wide border transition-colors ${
              isQuarantined
                ? 'bg-danger-dim text-danger border-danger/60 cursor-not-allowed'
                : 'bg-surface-light border-danger/40 text-danger hover:bg-danger-dim'
            }`}
          >
            <ShieldX className="w-4 h-4" />
            <span>{isQuarantined ? 'Vendor Quarantined' : 'Quarantine Vendor'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportCertificate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium bg-surface-light border border-border hover:border-text-secondary text-text-primary hover:bg-surface transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export Certificate (JSON)</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

    </div>
  );
};
