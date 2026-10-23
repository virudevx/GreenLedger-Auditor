import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  Cpu,
  Download,
  FileCheck2,
  FileLock2,
  Lightbulb,
  RotateCcw,
  ShieldX,
  Sparkles,
} from 'lucide-react';
import { DecisionResult, ExtractedInvoice, SecurityGateResult, VerificationResult, VerifiedLineItem } from '../types/audit';
import { VerdictBlob } from './Characters';
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

const getLineStatus = (item: VerifiedLineItem) => {
  if (item.carbonStatus === 'INVALID_UNIT') {
    return { label: 'Unit error', tone: 'border-danger/40 bg-danger-dim text-danger', Icon: AlertOctagon };
  }
  if (item.priceStatus === 'UNMATCHED' || item.carbonStatus === 'UNMATCHED') {
    return { label: 'No match', tone: 'border-border bg-surface-light text-text-muted', Icon: AlertTriangle };
  }
  if (item.priceStatus === 'ANOMALY' || item.carbonStatus === 'MISMATCH') {
    return { label: 'Flag', tone: 'border-warning/40 bg-warning-dim text-warning', Icon: AlertTriangle };
  }
  if (item.priceStatus === 'ELEVATED' || item.carbonStatus === 'ACCEPTABLE') {
    return { label: 'Watch', tone: 'border-warning/30 bg-warning-dim text-warning', Icon: AlertTriangle };
  }
  return { label: 'OK', tone: 'border-primary/30 bg-primary-dim text-primary-light', Icon: CheckCircle2 };
};

const formatNumber = (value: number | null, digits = 0) => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
};

const getProvenance = (security: SecurityGateResult, extraction: ExtractedInvoice) => {
  if (security.status === 'INJECTION_BLOCKED') {
    return { label: 'Blocked at gate', tone: 'border-danger/40 bg-danger-dim text-danger' };
  }
  if (extraction.isFixture) {
    return { label: 'Sample data (fixture)', tone: 'border-warning/30 bg-warning-dim text-warning' };
  }
  if (extraction.extractionSource === 'GEMINI_2_5_FLASH' || extraction.extractionSource === 'GEMINI_2_5_PRO') {
    return { label: 'Gemini extraction', tone: 'border-sky/30 bg-sky/10 text-sky' };
  }
  return { label: 'Local parser', tone: 'border-border bg-surface-dark text-text-muted' };
};

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

  const tone =
    verdict === 'AUTO_APPROVED'
      ? {
          banner: 'pastel-mint',
          title: 'AUTO-APPROVED',
          subtitle: 'Invoice passed all checks and meets the configured sustainability and pricing thresholds.',
          character: 'mint' as const,
          icon: <CheckCircle2 className="h-6 w-6 text-slate-950" />,
        }
      : verdict === 'ESCALATED_REMEDIATION'
        ? {
            banner: 'pastel-yellow',
            title: 'FLAGGED FOR REMEDIATION',
            subtitle: 'A deterministic threshold failed. Automated approval is blocked pending vendor resolution.',
            character: 'amber' as const,
            icon: <AlertTriangle className="h-6 w-6 text-slate-950" />,
          }
        : {
            banner: 'pastel-blush',
            title: 'QUARANTINED',
            subtitle: 'The pre-flight gate intercepted a hostile document before any model invocation.',
            character: 'blush' as const,
            icon: <ShieldX className="h-6 w-6 text-slate-950" />,
          };

  const provenance = getProvenance(security, extraction);
  const failedRules = decision.deterministicRulesChecked.filter((rule) => !rule.passed);
  const recommendations =
    decision.remediationActions.length > 0
      ? decision.remediationActions
      : ['Proceed with procurement within the configured policy limits.', 'Store the audit certificate and hash with the vendor record.'];

  return (
    <div className="min-w-0 rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary">
            <FileCheck2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-white">Audit Verdict</h2>
            <p className="text-[10px] text-text-muted">Trusted rules decide; the model only reads the document.</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold ${provenance.tone}`}>
          <Sparkles className="h-3 w-3" />
          {provenance.label}
        </span>
      </div>

      <div className={`relative mt-3 overflow-hidden rounded-2xl border p-4 ${tone.banner}`}>
        <VerdictBlob tone={tone.character} className="character pointer-events-none absolute -bottom-5 -right-2 h-28 w-28 opacity-95" />
        <div className="relative z-10 flex items-start gap-3 pr-20">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/55">
            {tone.icon}
          </span>
          <div>
            <h3 className="text-lg font-black leading-tight tracking-tight text-slate-950">{tone.title}</h3>
            <p className="mt-0.5 max-w-[430px] text-[10.5px] leading-relaxed text-slate-800/85">{tone.subtitle}</p>
            <p className="mt-1.5 font-mono text-[9.5px] font-semibold text-slate-700">
              {extraction.vendorName} · {extraction.invoiceNumber}
            </p>
          </div>
        </div>
      </div>

      {security.status === 'UNPROTECTED_WARNING' && (
        <div className="mt-2 rounded-xl border border-danger/30 bg-danger-dim px-2 py-2 text-[9.5px] leading-relaxed text-danger">
          <strong className="font-bold uppercase tracking-wide">Reduced protection:</strong>{' '}
          the security gate was disarmed for this run, so prompt-injection blocking was disabled. The verdict still
          comes from deterministic trusted rules, never from the document's instructions.
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Line item verification</h3>
          <span className="font-mono text-[9px] text-text-muted">Catalog {verification.benchmarkVersion}</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[560px] text-left text-[10.5px]">
            <thead className="bg-surface-dark text-[9px] uppercase tracking-[0.1em] text-text-muted">
              <tr>
                <th className="px-2 py-2 font-semibold">Item</th>
                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                <th className="px-2 py-2 font-semibold">Unit</th>
                <th className="px-2 py-2 text-right font-semibold">Billed</th>
                <th className="px-2 py-2 text-right font-semibold">Benchmark</th>
                <th className="px-2 py-2 text-right font-semibold">Variance</th>
                <th className="px-2 py-2 text-right font-semibold">Est. CO₂e</th>
                <th className="px-2 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {verification.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-[10px] text-text-muted">
                    No line items — the document was blocked before extraction.
                  </td>
                </tr>
              ) : (
                verification.lineItems.map((item) => {
                  const status = getLineStatus(item);
                  const StatusIcon = status.Icon;
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-surface-light/30">
                      <td className="max-w-[190px] px-2 py-2">
                        <div className="truncate font-sans text-[10.5px] font-medium text-text-primary" title={item.description}>
                          {item.description}
                        </div>
                        <div className="truncate text-[9px] text-text-muted">{item.benchmarkName || 'No catalog match'}</div>
                      </td>
                      <td className="px-2 py-2 text-right text-text-secondary">{item.quantity.toLocaleString()}</td>
                      <td className="px-2 py-2 text-text-secondary">{item.unit}</td>
                      <td className="px-2 py-2 text-right text-text-primary">${item.billedUnitPrice.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-text-muted">
                        {item.benchmarkUnitPrice !== null ? `$${item.benchmarkUnitPrice.toFixed(2)}` : '—'}
                      </td>
                      <td className={`px-2 py-2 text-right font-semibold ${
                        item.priceStatus === 'ANOMALY' ? 'text-danger' : item.priceStatus === 'ELEVATED' ? 'text-warning' : 'text-text-secondary'
                      }`}>
                        {item.priceVariancePercent !== null
                          ? `${item.priceVariancePercent > 0 ? '+' : ''}${item.priceVariancePercent.toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-right text-text-secondary">{formatNumber(item.estimatedCarbonKg)}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${status.tone}`}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="border-t border-border bg-surface-dark text-[10px] font-semibold text-text-secondary">
              <tr>
                <td className="px-2 py-2 uppercase tracking-wide" colSpan={3}>
                  Totals
                </td>
                <td className="px-2 py-2 text-right text-text-primary">${verification.totalBilledAmount.toLocaleString()}</td>
                <td className="px-2 py-2 text-right" colSpan={2}>
                  Max var {verification.maxPriceVariancePercent !== null ? `${verification.maxPriceVariancePercent}%` : '—'}
                </td>
                <td className="px-2 py-2 text-right text-primary-light">
                  {formatNumber(verification.totalEstimatedCarbonKg)} kg
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {verification.lineItems.length > 0 && <VarianceChart lineItems={verification.lineItems} />}

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-dark p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-primary-light">
            <Cpu className="h-3.5 w-3.5" />
            Agent reasoning
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-text-secondary">{decision.reasoningSummary}</p>
          <details className="mt-2 group">
            <summary className="cursor-pointer list-none text-[9.5px] font-semibold text-text-muted transition-colors hover:text-text-primary">
              {decision.deterministicRulesChecked.length} deterministic checks · {failedRules.length} failed
            </summary>
            <ul className="mt-2 space-y-1">
              {decision.deterministicRulesChecked.map((rule) => (
                <li key={rule.rule} className="flex items-start gap-1.5 text-[9.5px] leading-snug">
                  {rule.passed ? (
                    <CheckCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  ) : (
                    <AlertOctagon className="mt-0.5 h-3 w-3 shrink-0 text-danger" />
                  )}
                  <span className={rule.passed ? 'text-text-muted' : 'text-danger'}>{rule.rule}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="rounded-2xl border border-border bg-surface-dark p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-warning">
            <Lightbulb className="h-3.5 w-3.5" />
            Recommendations
          </div>
          <ul className="mt-1.5 space-y-1.5">
            {recommendations.map((action) => (
              <li key={action} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-text-secondary">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isCommitted || verdict === 'QUARANTINED'}
            onClick={onCommitLedger}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[10.5px] font-bold tracking-wide transition-colors focus-ring ${
              isCommitted
                ? 'cursor-not-allowed border border-border bg-surface-light text-text-muted'
                : 'bg-primary text-slate-950 hover:bg-primary-hover shadow-glow-emerald disabled:cursor-not-allowed disabled:opacity-50'
            }`}
          >
            <FileLock2 className="h-3.5 w-3.5" />
            {isCommitted ? 'Ledger committed' : 'Commit ledger verdict'}
          </button>

          <button
            type="button"
            disabled={isQuarantined}
            onClick={onQuarantineVendor}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[10.5px] font-bold tracking-wide transition-colors focus-ring ${
              isQuarantined
                ? 'cursor-not-allowed border-danger/60 bg-danger-dim text-danger'
                : 'border-danger/40 bg-surface-light text-danger hover:bg-danger-dim'
            }`}
          >
            <ShieldX className="h-3.5 w-3.5" />
            {isQuarantined ? 'Vendor quarantined' : 'Quarantine vendor'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportCertificate}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-light px-2 py-2 text-[10.5px] font-semibold text-text-primary transition-colors hover:border-text-secondary focus-ring"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            Export certificate
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10.5px] font-semibold text-text-muted transition-colors hover:bg-surface-light hover:text-text-primary focus-ring"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
