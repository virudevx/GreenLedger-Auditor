import React from 'react';
import { Shield, ShieldAlert, Zap, Clock, Database, BookOpen, AlertTriangle } from 'lucide-react';
import { TelemetryData } from '../types/audit';

interface TelemetryHeaderProps {
  telemetry: TelemetryData | null;
  gateEnabled: boolean;
  onToggleGate: () => void;
  onOpenBenchmarkCatalog: () => void;
}

export const TelemetryHeader: React.FC<TelemetryHeaderProps> = ({
  telemetry,
  gateEnabled,
  onToggleGate,
  onOpenBenchmarkCatalog,
}) => {
  return (
    <header className="border-b border-border bg-surface-dark/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-dark via-surface-card to-background border border-primary/40 flex items-center justify-center shadow-glow-emerald">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
                  GreenLedger <span className="text-primary font-mono text-sm uppercase px-1.5 py-0.5 rounded bg-primary-dim border border-primary/30">Auditor</span>
                </h1>
                <span className="hidden sm:inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface-light border border-border text-text-secondary">
                  v1.0.0-PROD
                </span>
              </div>
              <p className="text-xs text-text-secondary font-mono tracking-wider">
                ZERO-TRUST AGENTIC ERP GATE • <span className="text-text-muted">Trust Nothing. Verify Everything.</span>
              </p>
            </div>
          </div>

          {/* Telemetry Bar & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Telemetry Metric: Latency */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs">
              <Clock className="w-3.5 h-3.5 text-text-muted" />
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted leading-none uppercase font-mono">Audit Latency</span>
                <span className="font-mono font-semibold text-text-primary">
                  {telemetry ? `${telemetry.latencyMs} ms` : '0 ms (Ready)'}
                </span>
              </div>
            </div>

            {/* Telemetry Metric: Model Tier */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs">
              <Zap className="w-3.5 h-3.5 text-primary-light" />
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted leading-none uppercase font-mono">Active Model Tier</span>
                <span className="font-mono font-semibold text-text-primary max-w-[150px] truncate" title={telemetry?.modelTier || 'gemini-2.5-flash'}>
                  {telemetry?.modelTier || 'gemini-2.5-flash'}
                </span>
              </div>
            </div>

            {/* Telemetry Metric: Token Savings */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted leading-none uppercase font-mono">Est. Token Savings</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {telemetry?.tokenSavingsPercent !== null && telemetry?.tokenSavingsPercent !== undefined
                    ? `${telemetry.tokenSavingsPercent}% Saved`
                    : '--'}
                </span>
              </div>
            </div>

            {/* Benchmark Catalog Button */}
            <button
              onClick={onOpenBenchmarkCatalog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-text-secondary text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              title="Inspect 8-Category Reference Benchmark Catalog"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>Catalog</span>
            </button>

            {/* Security Gate Toggle Switch */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <button
                type="button"
                onClick={onToggleGate}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold tracking-wide border transition-all duration-200 ${
                  gateEnabled
                    ? 'bg-primary-dim border-primary/50 text-primary-light hover:bg-primary-dim/80'
                    : 'bg-danger-dim border-danger/60 text-danger hover:bg-danger-dim/80 pulse-glow-danger'
                }`}
              >
                {gateEnabled ? (
                  <>
                    <Shield className="w-4 h-4 text-primary animate-pulse" />
                    <span>GATE: ON</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-danger animate-bounce" />
                    <span>GATE: OFF</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* RED-TEAM / UNSAFE DEMONSTRATION MODE WARNING BANNER */}
        {!gateEnabled && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-danger-dim border border-danger/50 text-xs text-danger flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-danger animate-pulse" />
              <div>
                <strong className="font-bold tracking-wide uppercase">RED-TEAM / UNSAFE DEMONSTRATION MODE ACTIVE:</strong>{' '}
                Pre-flight model interception is disabled to demonstrate threat vectors. Sensitive PII remains safely redacted, and backend ERP payment execution is strictly firewalled.
              </div>
            </div>
            <button
              onClick={onToggleGate}
              className="shrink-0 px-2 py-0.5 text-[11px] font-bold rounded bg-danger text-white hover:bg-danger-hover transition-colors uppercase font-mono"
            >
              Re-Enable Gate
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
