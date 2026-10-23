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
    <section aria-labelledby="scenario-title" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="scenario-title" className="text-xs font-mono font-semibold tracking-wider text-text-secondary uppercase flex items-center gap-1.5">
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
          let cardSurface = 'bg-gradient-to-br from-[#d9ffd6] to-[#baf2c2] text-slate-950';

          if (scenario.id === 'anomaly') {
            icon = <AlertTriangle className="w-4 h-4 text-warning" />;
            borderColor = isSelected ? 'border-warning ring-1 ring-warning/40' : 'border-border hover:border-warning/40';
            badgeBg = 'bg-warning-dim text-warning border-warning/30';
            cardSurface = 'bg-gradient-to-br from-[#e5d4ff] to-[#b89cff] text-slate-950';
          } else if (scenario.id === 'adversarial') {
            icon = <ShieldX className="w-4 h-4 text-danger" />;
            borderColor = isSelected ? 'border-danger ring-1 ring-danger/40' : 'border-border hover:border-danger/40';
            badgeBg = 'bg-danger-dim text-danger border-danger/30';
            cardSurface = 'bg-gradient-to-br from-[#ffc7df] to-[#f69bc2] text-slate-950';
          }

          return (
            <button
              key={scenario.id}
              disabled={isRunning}
              aria-pressed={isSelected}
              aria-label={`${scenario.title}, expected verdict ${scenario.expectedVerdict.replace('_', ' ')}`}
              onClick={() => onSelectScenario(scenario)}
              className={`text-left p-4 rounded-2xl transition-all duration-200 relative overflow-hidden flex flex-col justify-between border ${cardSurface} ${borderColor} ${
                isSelected ? 'shadow-[0_12px_30px_rgba(116,255,147,0.14)] scale-[1.01]' : 'hover:-translate-y-0.5'
              } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-slate-700/70">
                    {scenario.number}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${badgeBg}`}>
                    {scenario.badge}
                  </span>
                </div>

                <div className="flex items-start gap-2 mb-1.5">
                  <div className="mt-0.5 shrink-0">{icon}</div>
                  <div>
                    <h3 className="text-[16px] font-extrabold leading-tight">
                      {scenario.title}
                    </h3>
                    <p className="text-xs text-slate-700/80 font-medium mt-0.5">
                      {scenario.vendorName}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-800/80 line-clamp-2 mt-2 leading-relaxed">
                  {scenario.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-700/70">Target Verdict:</span>
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
    </section>
  );
};
