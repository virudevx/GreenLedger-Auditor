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
        return 'border-blue-500/50 bg-blue-500/5';
      case 'PASSED':
        return 'border-primary/40 bg-surface';
      case 'ESCALATED':
        return 'border-warning/50 bg-warning-dim/20';
      case 'QUARANTINED':
      case 'FAILED':
        return 'border-danger/60 bg-danger-dim/30';
      default:
        return 'border-border bg-surface/50 opacity-70';
    }
  };

  return (
    <div className="bg-surface rounded-card border border-border p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">
            Four-Stage Agentic Audit Pipeline
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
              className={`p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between ${getStageBorderClass(
                stage.state
              )}`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-mono font-bold text-text-muted">
                    STAGE 0{stage.stageNumber}
                  </span>
                  {renderStatusBadge(stage.state)}
                </div>

                <h3 className="text-xs font-semibold text-text-primary leading-tight">
                  {stage.name}
                </h3>

                <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed min-h-[34px]">
                  {stage.summary || 'Awaiting prior pipeline execution.'}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-text-muted">
                <span>Duration</span>
                <span className="font-semibold text-text-primary">
                  {stage.elapsedMs !== undefined ? `${stage.elapsedMs} ms` : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
