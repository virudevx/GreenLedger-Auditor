import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  GitBranch,
  GitCommit,
  Loader2,
  ShieldCheck,
  ShieldX,
  XCircle,
} from 'lucide-react';
import { PipelineStageState, StageProgress } from '../types/audit';

interface PipelineStepperProps {
  stages: StageProgress[];
}

const STAGE_META = [
  { title: 'Security Gate', fallback: 'PII & injection scan', icon: ShieldCheck, surface: 'pastel-mint' },
  { title: 'Document Extraction', fallback: 'Structured extraction', icon: FileSearch, surface: 'pastel-sky' },
  { title: 'Benchmark Verification', fallback: 'Price & carbon check', icon: BarChart3, surface: 'pastel-lilac' },
  { title: 'Decision Routing', fallback: 'Deterministic policy engine', icon: GitBranch, surface: 'pastel-blush' },
];

const StatusBadge: React.FC<{ state: PipelineStageState }> = ({ state }) => {
  switch (state) {
    case 'SCANNING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0b2434] px-2 py-0.5 text-[9px] font-bold tracking-wide text-sky">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          RUNNING
        </span>
      );
    case 'PASSED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0f2f1d] px-2 py-0.5 text-[9px] font-bold tracking-wide text-primary">
          <CheckCircle2 className="h-2.5 w-2.5" />
          PASSED
        </span>
      );
    case 'ESCALATED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#3a2a07] px-2 py-0.5 text-[9px] font-bold tracking-wide text-warning">
          <AlertTriangle className="h-2.5 w-2.5" />
          ESCALATED
        </span>
      );
    case 'QUARANTINED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#3a1022] px-2 py-0.5 text-[9px] font-bold tracking-wide text-blush">
          <ShieldX className="h-2.5 w-2.5" />
          QUARANTINED
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#3a1022] px-2 py-0.5 text-[9px] font-bold tracking-wide text-blush">
          <XCircle className="h-2.5 w-2.5" />
          FAILED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-950/10 bg-slate-950/10 px-2 py-0.5 text-[9px] font-bold tracking-wide text-slate-700">
          IDLE
        </span>
      );
  }
};

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ stages }) => {
  return (
    <section aria-labelledby="pipeline-title" className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary">
            <GitCommit className="h-4 w-4" />
          </span>
          <div>
            <h2 id="pipeline-title" className="text-sm font-extrabold tracking-tight text-white">
              Autonomous Audit Pipeline
            </h2>
            <p className="text-[10px] text-text-muted">Four stages, deterministic verdict, live execution state.</p>
          </div>
        </div>
        <span className="rounded-full border border-border bg-surface-dark px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">
          Auto · live
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-stretch" aria-live="polite">
        {stages.map((stage, index) => {
          const meta = STAGE_META[index] ?? STAGE_META[0];
          const Icon = meta.icon;
          return (
            <React.Fragment key={stage.stageNumber}>
              <div
                className={`flex min-w-0 flex-1 flex-col justify-between rounded-2xl border p-3 ${meta.surface} ${
                  stage.state === 'SCANNING' ? 'ring-2 ring-white/60' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/65 text-[12px] font-black text-slate-950">
                      {stage.stageNumber}
                    </span>
                    <StatusBadge state={stage.state} />
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-slate-800" />
                    <h3 className="truncate text-[11.5px] font-extrabold leading-tight text-slate-950">
                      {meta.title}
                    </h3>
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-[28px] text-[9.5px] leading-relaxed text-slate-800/80">
                    {stage.summary || meta.fallback}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-950/10 pt-1.5 font-mono text-[9px] text-slate-700">
                  <span>{meta.fallback}</span>
                  <span className="font-bold text-slate-950">
                    {stage.elapsedMs === undefined ? '—' : stage.elapsedMs < 1 ? '<1 ms' : `${stage.elapsedMs} ms`}
                  </span>
                </div>
              </div>

              {index < stages.length - 1 && (
                <div className="hidden items-center justify-center lg:flex" aria-hidden="true">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-dark text-primary">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};
