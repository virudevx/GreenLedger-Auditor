import React from 'react';
import { StageProgress, PipelineStageState } from '../types/audit';
import { ShieldCheck, Cpu, CheckCircle2, AlertTriangle, ShieldX, XCircle, Loader2, GitCommit } from 'lucide-react';

interface PipelineStepperProps {
  stages: StageProgress[];
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ stages }) => {
  const renderStatusBadge = (state: PipelineStageState) => {
    switch (state) {
      case 'SCANNING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            PROCESSING
          </span>
        );
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary-dim text-primary-light border border-primary/30">
            <CheckCircle2 className="w-3 h-3" />
            PASSED
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-warning-dim text-warning border border-warning/30">
            <AlertTriangle className="w-3 h-3" />
            ESCALATED
          </span>
        );
      case 'QUARANTINED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-danger-dim text-danger border border-danger/30">
            <ShieldX className="w-3 h-3" />
            QUARANTINED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-danger-dim text-danger border border-danger/30">
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface-light text-text-muted border border-border">
            IDLE
          </span>
        );
    }
  };

  const getStageBorderClass = (state: PipelineStageState) => {
    switch (state) {
      case 'SCANNING':
        return 'border-blue-500/50';
      case 'PASSED':
        return 'border-primary/40';
      case 'ESCALATED':
        return 'border-warning/50';
      case 'QUARANTINED':
      case 'FAILED':
        return 'border-danger/60';
      default:
        return 'border-border opacity-70';
    }
  };

  const getStageSurfaceClass = (stageNumber: number) => {
    if (stageNumber === 1) return 'bg-gradient-to-br from-[#d7ffd6] to-[#a8eeb9] text-slate-950';
    if (stageNumber === 2) return 'bg-gradient-to-br from-[#c8f1ff] to-[#8bdaf1] text-slate-950';
    if (stageNumber === 3) return 'bg-gradient-to-br from-[#eadbff] to-[#c0a4f3] text-slate-950';
    return 'bg-gradient-to-br from-[#ffd4ec] to-[#f3a7cd] text-slate-950';
  };

  return (
    <section aria-labelledby="pipeline-title" className="bg-surface/80 rounded-2xl border border-white/10 p-4 space-y-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-primary" />
          <h2 id="pipeline-title" className="text-base font-bold text-text-primary">
            Autonomous Audit Pipeline
          </h2>
        </div>
        <span className="text-[11px] font-mono text-text-muted">
          State Machine Execution
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stages.map((stage) => {
          return (
            <div
              key={stage.stageNumber}
              className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${getStageSurfaceClass(stage.stageNumber)} ${getStageBorderClass(stage.state)}`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-2xl font-black leading-none">
                    {stage.stageNumber}
                  </span>
                  {renderStatusBadge(stage.state)}
                </div>

                <h3 className="text-xs font-extrabold leading-tight">
                  {stage.name}
                </h3>

                <p className="text-[11px] text-slate-800/75 mt-1.5 leading-relaxed min-h-[34px]">
                  {stage.summary || 'Awaiting prior pipeline execution.'}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-900/10 flex items-center justify-between text-[10px] font-mono text-slate-700/70">
                <span>Duration</span>
                <span className="font-semibold text-slate-950">
                  {stage.elapsedMs !== undefined ? `${stage.elapsedMs} ms` : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
