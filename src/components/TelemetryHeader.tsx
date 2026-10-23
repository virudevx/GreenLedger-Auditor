import React from 'react';
import { AlertTriangle, BookOpen, Clock, Fingerprint, Leaf, Shield, ShieldAlert, Zap } from 'lucide-react';
import { TelemetryData } from '../types/audit';

interface TelemetryHeaderProps {
  telemetry: TelemetryData | null;
  gateEnabled: boolean;
  redactionCount: number | null;
  onToggleGate: () => void;
  onOpenBenchmarkCatalog: () => void;
}

interface StatPillProps {
  tone: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  title?: string;
}

const StatPill: React.FC<StatPillProps> = ({ tone, icon, label, value, title }) => (
  <div className={`stat-pill ${tone}`} title={title}>
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/45 text-slate-900">
      {icon}
    </span>
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-70">{label}</div>
      <div className="max-w-[160px] truncate text-[13px] font-extrabold leading-tight">{value}</div>
    </div>
  </div>
);

export const TelemetryHeader: React.FC<TelemetryHeaderProps> = ({
  telemetry,
  gateEnabled,
  redactionCount,
  onToggleGate,
  onOpenBenchmarkCatalog,
}) => {
  return (
    <header className="relative z-40 border-b border-white/5 bg-[#060d18]/90 backdrop-blur-xl lg:sticky lg:top-0">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-mark h-12 w-12">
              <Leaf className="h-7 w-7 -rotate-12 text-[#0d2a19]" />
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-white">
                GreenLedger Auditor
              </h1>
              <p className="text-[11px] font-medium tracking-wide text-slate-400">
                Autonomous Sustainability &amp; Procurement Auditor
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleGate}
              aria-pressed={gateEnabled}
              aria-label={gateEnabled ? 'Disable security gate' : 'Enable security gate'}
              className={`stat-pill pastel-mint focus-ring pr-2.5 transition-transform hover:-translate-y-0.5 ${
                gateEnabled ? '' : 'pastel-blush'
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/50 text-slate-900">
                {gateEnabled ? <Shield className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              </span>
              <div className="text-left">
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-70">Security Gate</div>
                <div className="text-[13px] font-extrabold leading-tight">{gateEnabled ? 'ARMED' : 'DISARMED'}</div>
              </div>
              <span className={`switch ml-1 ${gateEnabled ? 'switch-on' : ''}`} aria-hidden="true" />
            </button>

            <StatPill
              tone="pastel-yellow"
              icon={<Clock className="h-4 w-4" />}
              label="Last Audit Latency"
              value={telemetry ? (telemetry.latencyMs < 1 ? '<1 ms' : `${telemetry.latencyMs} ms`) : '—'}
            />
            <StatPill
              tone="pastel-lilac"
              icon={<Zap className="h-4 w-4" />}
              label="Model Tier"
              value={telemetry?.modelTier || 'Standby'}
              title={telemetry?.modelTier}
            />
            <StatPill
              tone="pastel-sky"
              icon={<Fingerprint className="h-4 w-4" />}
              label="PII Redacted"
              value={redactionCount === null ? '—' : `${redactionCount} value${redactionCount === 1 ? '' : 's'}`}
            />

            <button
              type="button"
              onClick={onOpenBenchmarkCatalog}
              aria-label="Open benchmark catalog"
              title="Benchmark catalog"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:border-primary/40 hover:text-white focus-ring"
            >
              <BookOpen className="h-4 w-4" />
            </button>

            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-lilac via-sky to-primary text-[11px] font-extrabold text-slate-950 shadow-glow-emerald"
              aria-hidden="true"
              title="GreenLedger workspace"
            >
              GL
            </div>
          </div>
        </div>

        {!gateEnabled && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger-dim px-3 py-2.5 text-xs text-danger animate-fadeIn">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong className="font-bold uppercase tracking-wide">Red-team mode active:</strong>{' '}
                pre-flight interception is disabled for pasted text. PII in text is still redacted, but uploaded file
                contents are never pre-scanned. The final verdict remains deterministic.
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleGate}
              className="shrink-0 rounded-lg bg-danger px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-danger-hover focus-ring"
            >
              Re-arm gate
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
