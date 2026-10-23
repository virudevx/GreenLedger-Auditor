import React, { useRef, useState } from 'react';
import { AlertTriangle, FileCheck, FileText, PencilLine, Sparkles, Upload, X } from 'lucide-react';
import { FlowerBuddy } from './Characters';

interface DocumentIngestionProps {
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  onAutoRun: (file: File) => void;
  uploadError: string | null;
  setUploadError: (error: string | null) => void;
  isRunning: boolean;
  gateEnabled: boolean;
  onPasteInstead: () => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

const formatFileSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

export const DocumentIngestion: React.FC<DocumentIngestionProps> = ({
  selectedFile,
  onSelectFile,
  onAutoRun,
  uploadError,
  setUploadError,
  isRunning,
  gateEnabled,
  onPasteInstead,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_BYTES) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported format '${file.type || 'unknown'}'. Upload a PDF, PNG, JPEG or WEBP document.`;
    }
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    // Reset the input so picking the same file again still fires a change event.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      onSelectFile(null);
      return;
    }

    setUploadError(null);
    onSelectFile(file);
    onAutoRun(file);
  };

  const removeFile = () => {
    onSelectFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section aria-labelledby="upload-title" className="flex h-full flex-col rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-dim text-primary">
          <Upload className="h-3.5 w-3.5" />
        </span>
        <div>
          <h2 id="upload-title" className="text-sm font-extrabold tracking-tight text-white">
            Or upload your own invoice
          </h2>
          <p className="text-[10px] text-text-muted">Any supplier document, not just the samples.</p>
        </div>
      </div>

      <input
        id="invoice-file"
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        aria-label="Upload supplier invoice document"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop an invoice here or click to choose a file"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`relative mt-3 flex min-h-[128px] flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors focus-ring ${
          isDragging
            ? 'border-primary bg-primary-dim'
            : 'border-white/15 bg-surface-dark/60 hover:border-primary/50 hover:bg-surface-dark'
        } ${isRunning ? 'cursor-wait opacity-70' : ''}`}
      >
        <FlowerBuddy className="character pointer-events-none absolute -right-4 -top-5 h-20 w-20 opacity-90" />
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-primary">
          <Upload className="h-4 w-4" />
        </span>
        <p className="mt-2 text-[11px] font-semibold text-text-primary">
          {isRunning ? 'Auditing document — a new upload replaces it' : 'Drag & drop or click to upload'}
        </p>
        <p className="mt-1 text-[10px] text-text-muted">PDF, JPG, PNG · max 10 MB</p>
        <p className="mt-2 inline-flex items-center gap-1 text-[9.5px] font-medium text-primary-light">
          <Sparkles className="h-3 w-3" />
          Audit starts automatically
        </p>
      </div>

      {uploadError && (
        <div role="alert" className="mt-2 flex items-start justify-between gap-2 rounded-xl border border-danger/40 bg-danger-dim px-2.5 py-2 text-[10.5px] text-danger">
          <span className="flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {uploadError}
          </span>
          <button type="button" aria-label="Dismiss upload error" onClick={() => setUploadError(null)} className="text-danger hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary-dim px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileCheck className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate font-mono text-[10.5px] font-semibold text-text-primary">{selectedFile.name}</p>
              <p className="text-[9.5px] text-text-muted">
                {formatFileSize(selectedFile.size)} · {selectedFile.type}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={removeFile}
            aria-label={`Remove ${selectedFile.name}`}
            className="rounded p-1 text-text-muted transition-colors hover:text-danger focus-ring"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mt-2 rounded-xl border border-warning/20 bg-warning-dim px-2.5 py-2 text-[9.5px] leading-relaxed text-warning/90">
        <strong className="font-semibold">Scan boundary:</strong>{' '}
        {gateEnabled
          ? 'pre-flight PII and injection checks cover pasted text only. Uploaded file contents are not pre-scanned before model transit.'
          : 'gate is disarmed. Uploaded file contents are never pre-scanned.'}
      </div>

      <button
        type="button"
        onClick={onPasteInstead}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface-dark px-3 py-2 text-[11px] font-semibold text-text-secondary transition-colors hover:border-primary/40 hover:text-white focus-ring"
      >
        <FileText className="h-3.5 w-3.5" />
        Paste or edit text instead
        <PencilLine className="ml-auto h-3 w-3 opacity-40" />
      </button>
    </section>
  );
};
