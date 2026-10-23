import { AuditLogEntry, AuditCertificate } from '../types/audit';

const LEDGER_STORAGE_KEY = 'greenledger_audit_log_v1';
const PREFS_STORAGE_KEY = 'greenledger_preferences_v1';

export interface GreenLedgerPreferences {
  securityGateEnabled: boolean;
  priceVarianceTolerancePercent: number;
  carbonVarianceTolerancePercent: number;
  useOfflineDemoFixturesOnly: boolean;
}

export const DEFAULT_PREFERENCES: GreenLedgerPreferences = {
  securityGateEnabled: true,
  priceVarianceTolerancePercent: 10.0,
  carbonVarianceTolerancePercent: 15.0,
  useOfflineDemoFixturesOnly: false,
};

/**
 * Loads the audit log from browser local storage with defensive schema validation
 */
export function loadAuditLogFromStorage(): AuditLogEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LEDGER_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('Malformed audit ledger in storage. Resetting to empty array.');
      return [];
    }

    // Filter valid entries
    return parsed.filter(item => 
      item && 
      typeof item.id === 'string' && 
      typeof item.sha256Hash === 'string' && 
      typeof item.vendorName === 'string'
    );
  } catch (err) {
    console.error('Failed to read audit log from localStorage:', err);
    return [];
  }
}

/**
 * Saves audit log entries to localStorage
 */
export function saveAuditLogToStorage(entries: AuditLogEntry[]): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (err) {
    console.error('Failed to persist audit log to localStorage:', err);
    return false;
  }
}

/**
 * Loads user preferences
 */
export function loadPreferences(): GreenLedgerPreferences {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Saves user preferences
 */
export function savePreferences(prefs: GreenLedgerPreferences): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
}

/**
 * Downloads any JSON-serializable payload as a local file.
 */
export function downloadJsonFile(filename: string, data: unknown): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a cryptographic Audit Certificate as formatted JSON
 */
export function downloadAuditCertificate(certificate: AuditCertificate): void {
  downloadJsonFile(
    `GreenLedger-Certificate-${certificate.auditId}-${certificate.vendorName.replace(/[^a-zA-Z0-9]/g, '_')}.json`,
    certificate
  );
}
