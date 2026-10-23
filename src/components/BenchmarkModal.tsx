import React, { useEffect, useRef } from 'react';
import { BENCHMARK_CATALOG, BENCHMARK_DATASET_VERSION } from '../constants/benchmarks';
import { X, BookOpen, CheckCircle2, Info, ExternalLink } from 'lucide-react';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" role="presentation" onMouseDown={onClose}>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="benchmark-modal-title"
        className="w-full max-w-4xl max-h-[90vh] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-dark">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-dim border border-primary/30">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 id="benchmark-modal-title" className="text-base sm:text-lg font-bold text-text-primary">
                Trusted Reference Benchmark Catalog
              </h2>
              <p className="text-xs text-text-secondary font-mono">
                Version: <span className="text-primary-light">{BENCHMARK_DATASET_VERSION}</span> • 8 Active Procurement Baselines
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close benchmark catalog"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <div className="p-3 rounded-xl bg-surface-dark border border-border text-xs text-text-secondary leading-relaxed">
            <strong className="text-text-primary font-semibold">Deterministic Benchmark Policy: </strong>
            GreenLedger Auditor verifies all incoming supplier claims against this deterministic index. Price markups exceeding 10% and carbon discrepancies trigger autonomous escalation. Baseline figures are derived from official emission factors (DEFRA, GLEC, ECHA) and curated industry indices.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {BENCHMARK_CATALOG.map((item) => (
              <div 
                key={item.id}
                className="p-3.5 rounded-xl bg-surface-dark/90 border border-border/80 hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-light border border-border text-text-muted">
                      {item.category}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                      item.isVerified 
                        ? 'bg-primary-dim text-primary-light border-primary/30' 
                        : 'bg-surface-light text-text-muted border-border'
                    }`}>
                      {item.isVerified ? 'VERIFIED' : 'ILLUSTRATIVE'}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-text-primary leading-tight">
                    {item.name}
                  </h3>

                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Index Price:</span>
                    <span className="font-semibold text-text-primary">
                      ${item.benchmarkPrice.toFixed(2)} / {item.benchmarkUnit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Scope 3 Carbon Factor:</span>
                    <span className="font-semibold text-emerald-400">
                      {item.carbonFactor} {item.carbonFactorUnit}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted pt-1 truncate" title={item.dataSource}>
                    Source: {item.dataSource}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-border bg-surface-dark flex items-center justify-between">
          <span className="text-xs text-text-muted font-mono">
            Immutable trusted memory registry
          </span>
          <button
            type="button"
            aria-label="Close benchmark catalog"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-surface-light border border-border hover:bg-surface text-text-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
