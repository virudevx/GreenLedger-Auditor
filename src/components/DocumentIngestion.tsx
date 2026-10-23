import React, { useRef } from 'react';
import { Upload, FileText, Play, RotateCcw, AlertOctagon, FileCheck, X } from 'lucide-react';

interface DocumentIngestionProps {
  rawPayload: string;
  onChangePayload: (val: string) => void;
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  onRunAudit: () => void;
  onReset: () => void;
  isRunning: boolean;
  uploadError: string | null;
  setUploadError: (err: string | null) => void;
}

export const DocumentIngestion: React.FC<DocumentIngestionProps> = ({
  rawPayload,
  onChangePayload,
  selectedFile,
  onSelectFile,
  onRunAudit,
  onReset,
  isRunning,
  uploadError,
  setUploadError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed size (10 MB).`);
      return;
    }

    // Validate type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(`Unsupported file format '${file.type}'. Please upload PDF, PNG, JPEG, or WEBP documents.`);
      return;
    }

    onSelectFile(file);

    // If text is currently empty, add a placeholder note
    if (!rawPayload.trim()) {
      onChangePayload(`[ATTACHED DOCUMENT: ${file.name} - ${(file.size / 1024).toFixed(1)} KB]
Extracted multimodal document stream will be processed by Gemini 2.5 Flash with zero-trust safety checks.`);
    }
  };

  const removeFile = () => {
    onSelectFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section aria-labelledby="ingestion-title" className="bg-surface rounded-card border border-border p-4 space-y-3">
      
      {/* Header with Trust Boundary Label */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h2 id="ingestion-title" className="text-sm font-semibold text-text-primary">
            Supplier Invoice Ingestion
          </h2>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-danger-dim border border-danger/40 text-danger">
            <AlertOctagon className="w-3 h-3" />
            UNTRUSTED INPUT BOUNDARY
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* File Upload Hidden Input */}
          <input
            id="invoice-file"
            aria-label="Upload supplier invoice document"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
          />

          <button
            type="button"
            disabled={isRunning}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-surface-light border border-border hover:border-text-secondary text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF / Image</span>
          </button>

          <button
            type="button"
            disabled={isRunning || !rawPayload.trim()}
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-light border border-border hover:border-text-secondary text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
            title="Reset to blank"
            aria-label="Clear invoice input"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div role="alert" className="p-2.5 rounded-lg bg-danger-dim border border-danger/40 text-xs text-danger flex items-center justify-between">
          <span>{uploadError}</span>
          <button type="button" aria-label="Dismiss upload error" onClick={() => setUploadError(null)} className="text-danger hover:text-white font-bold ml-2">×</button>
        </div>
      )}

      {/* Attached File Indicator */}
      {selectedFile && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-surface-light border border-primary/30 text-xs text-text-primary">
          <div className="flex items-center gap-2 truncate">
            <FileCheck className="w-4 h-4 text-primary shrink-0" />
            <span className="font-mono font-semibold truncate">{selectedFile.name}</span>
            <span className="text-[11px] text-text-muted font-mono">
              ({(selectedFile.size / 1024).toFixed(1)} KB, {selectedFile.type})
            </span>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1 hover:bg-surface rounded text-text-muted hover:text-danger transition-colors"
            title="Remove uploaded file"
            aria-label={`Remove uploaded file ${selectedFile.name}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Raw Monospace Textarea */}
      <div className="relative">
        <textarea
          id="invoice-payload"
          aria-label="Untrusted supplier invoice text"
          aria-describedby="payload-help payload-count"
          value={rawPayload}
          onChange={(e) => onChangePayload(e.target.value)}
          disabled={isRunning}
          placeholder="Paste untrusted invoice text, freight manifest, or supplier billing payload here..."
          rows={9}
          className="w-full rounded-lg bg-surface-dark border border-border p-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-y leading-relaxed"
          spellCheck={false}
        />
        <div id="payload-count" aria-live="polite" className="absolute bottom-2.5 right-3 text-[10px] font-mono text-text-muted pointer-events-none">
          {rawPayload.length} chars • {rawPayload.split('\n').length} lines
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="flex items-center justify-between pt-1">
        <div id="payload-help" className="text-[11px] text-text-muted font-mono">
          Security Gate will inspect payload before any Gemini model invocation.
        </div>

        <button
          type="button"
          disabled={isRunning || !rawPayload.trim()}
          onClick={onRunAudit}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-black bg-primary hover:bg-primary-hover shadow-glow-emerald transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-mono ${
            isRunning ? 'animate-pulse' : ''
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isRunning ? 'Auditing Pipeline...' : 'Run Autonomous Audit'}</span>
        </button>
      </div>

    </section>
  );
};
