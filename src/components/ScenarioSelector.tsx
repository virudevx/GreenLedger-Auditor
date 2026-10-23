import React from 'react';
import { DEMO_SCENARIOS, DemoScenario } from '../constants/scenarios';
import { CheckCircle2, AlertTriangle, ShieldX, Sparkles } from 'lucide-react';

interface ScenarioSelectorProps {
  selectedScenarioId: string;
  onSelectScenario: (scenario: DemoScenario) => void;
  isRunning: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  selectedScenarioId,
  onSelectScenario,
  isRunning,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Evaluation Scenarios</span>
        </h2>
        <span className="text-[11px] text-text-muted">Select to populate simulated supplier invoice</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DEMO_SCENARIOS.map((scenario) => {
          const isSelected = selectedScenarioId === scenario.id;
          
          let icon = <CheckCircle2 className="w-4 h-4 text-primary" />;
          let borderColor = isSelected ? 'border-primary ring-1 ring-primary/40' : 'border-border hover:border-primary/40';
          let badgeBg = 'bg-primary-dim text-primary-light border-primary/30';

          if (scenario.id === 'anomaly') {
            icon = <AlertTriangle className="w-4 h-4 text-warning" />;
            borderColor = isSelected ? 'border-warning ring-1 ring-warning/40' : 'border-border hover:border-warning/40';
            badgeBg = 'bg-warning-dim text-warning border-warning/30';
          } else if (scenario.id === 'adversarial') {
            icon = <ShieldX className="w-4 h-4 text-danger" />;
            borderColor = isSelected ? 'border-danger ring-1 ring-danger/40' : 'border-border hover:border-danger/40';
            badgeBg = 'bg-danger-dim text-danger border-danger/30';
          }

          return (
            <button
              key={scenario.id}
              disabled={isRunning}
              onClick={() => onSelectScenario(scenario)}
              className={`text-left p-3.5 rounded-card bg-surface transition-all duration-200 relative overflow-hidden flex flex-col justify-between border ${borderColor} ${
                isSelected ? 'shadow-md bg-surface-card' : 'hover:bg-surface-light/40'
              } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-text-muted">
                    {scenario.number}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${badgeBg}`}>
                    {scenario.badge}
                  </span>
                </div>

                <div className="flex items-start gap-2 mb-1.5">
                  <div className="mt-0.5 shrink-0">{icon}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary leading-tight">
                      {scenario.title}
                    </h3>
                    <p className="text-xs text-text-secondary font-mono mt-0.5">
                      {scenario.vendorName}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-text-secondary/90 line-clamp-2 mt-2 leading-relaxed">
                  {scenario.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-text-muted">Target Verdict:</span>
                <span className={`font-semibold ${
                  scenario.expectedVerdict === 'AUTO_APPROVED' ? 'text-primary' :
                  scenario.expectedVerdict === 'ESCALATED_REMEDIATION' ? 'text-warning' : 'text-danger'
                }`}>
                  {scenario.expectedVerdict.replace('_', ' ')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
