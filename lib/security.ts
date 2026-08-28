/**
 * Enterprise Cyber Security & Anti-Hacking Protection Module
 * For Gram Panchayat Financial & Tax Management System
 */

// --- 1. XSS & SCRIPT INJECTION SANITIZATION ---

/**
 * Strips HTML tags, script execution patterns, and harmful entities from inputs
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return '';
    return String(input);
  }

  // Remove null bytes, HTML tags, script payloads, and harmful protocols
  return input
    .replace(/\0/g, '') // Null byte injection
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Iframes
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Objects
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Embeds
    .replace(/<[^>]+>/g, '') // All generic HTML tags
    .replace(/javascript:/gi, '') // Javascript URI scheme
    .replace(/data:text\/html/gi, '') // Data HTML scheme
    .replace(/vbscript:/gi, '') // VBScript scheme
    .replace(/onload\s*=/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onclick\s*=/gi, '')
    .trim();
}

/**
 * Deep sanitizes all string properties within an object or array before persistence
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeInput(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitizedObj[key] = sanitizeObject((obj as Record<string, any>)[key]);
      }
    }
    return sanitizedObj as T;
  }

  return obj;
}

/**
 * Safely parses and validates numbers, preventing NaN, Infinity, and overflow exploits
 */
export function sanitizeNumber(value: unknown, defaultValue: number = 0, min?: number, max?: number): number {
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) return defaultValue;
    let res = value;
    if (min !== undefined && res < min) res = min;
    if (max !== undefined && res > max) res = max;
    return res;
  }

  if (typeof value === 'string') {
    const cleanStr = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed) || !isFinite(parsed)) return defaultValue;
    let res = parsed;
    if (min !== undefined && res < min) res = min;
    if (max !== undefined && res > max) res = max;
    return res;
  }

  return defaultValue;
}

/**
 * Validates 10-digit Indian mobile number format strictly
 */
export function validateMobileStrict(mobile: string): boolean {
  if (!mobile) return false;
  const clean = mobile.replace(/[^0-9]/g, '');
  return /^[6-9]\d{9}$/.test(clean);
}

/**
 * Validates Samagra Family/Member ID format (8 to 9 digits)
 */
export function validateSamagraIdStrict(id: string): boolean {
  if (!id) return false;
  const clean = id.replace(/[^0-9]/g, '');
  return /^\d{8,9}$/.test(clean);
}

/**
 * Validates safe HTTP/HTTPS URL protocols for image assets
 */
export function sanitizeUrl(url?: string): string {
  if (!url) return '';
  const clean = url.trim();
  if (clean.startsWith('https://') || clean.startsWith('http://') || clean.startsWith('/')) {
    return clean;
  }
  return '';
}

// --- 2. BRUTE-FORCE RATE LIMITING & LOCKOUT GUARD ---

interface LoginAttemptRecord {
  attempts: number;
  lockedUntil: number; // Timestamp (ms)
  lastAttemptTime: number;
}

const ATTEMPTS_STORAGE_KEY = 'gp_security_login_attempts';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes lockout

export function getLoginSecurityStatus(identifier: string): { isLocked: boolean; remainingSeconds: number; attempts: number } {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    const records: Record<string, LoginAttemptRecord> = JSON.parse(raw);
    const userRecord = records[identifier.toLowerCase().trim()];
    if (!userRecord) return { isLocked: false, remainingSeconds: 0, attempts: 0 };

    const now = Date.now();
    if (userRecord.lockedUntil > now) {
      const remainingSeconds = Math.ceil((userRecord.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, attempts: userRecord.attempts };
    }

    // Lockout expired, reset attempts if old
    if (now - userRecord.lastAttemptTime > 15 * 60 * 1000) {
      delete records[identifier.toLowerCase().trim()];
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(records));
      return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }

    return { isLocked: false, remainingSeconds: 0, attempts: userRecord.attempts };
  } catch (e) {
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  }
}

export function recordFailedLoginAttempt(identifier: string): { isLocked: boolean; remainingSeconds: number; attempts: number } {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    const records: Record<string, LoginAttemptRecord> = raw ? JSON.parse(raw) : {};
    const key = identifier.toLowerCase().trim();
    const now = Date.now();

    const current = records[key] || { attempts: 0, lockedUntil: 0, lastAttemptTime: now };
    current.attempts += 1;
    current.lastAttemptTime = now;

    let isLocked = false;
    let remainingSeconds = 0;

    if (current.attempts >= MAX_FAILED_ATTEMPTS) {
      current.lockedUntil = now + LOCKOUT_DURATION_MS;
      isLocked = true;
      remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
      logSecurityEvent('BRUTE_FORCE_LOCKOUT', `User/IP '${key}' locked for 5 minutes after ${current.attempts} failed attempts`);
    } else {
      logSecurityEvent('FAILED_LOGIN_ATTEMPT', `Failed login attempt ${current.attempts}/${MAX_FAILED_ATTEMPTS} for '${key}'`);
    }

    records[key] = current;
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(records));

    return { isLocked, remainingSeconds, attempts: current.attempts };
  } catch (e) {
    return { isLocked: false, remainingSeconds: 0, attempts: 1 };
  }
}

export function resetLoginAttempts(identifier: string): void {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (!raw) return;
    const records: Record<string, LoginAttemptRecord> = JSON.parse(raw);
    const key = identifier.toLowerCase().trim();
    if (records[key]) {
      delete records[key];
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(records));
    }
  } catch (e) {}
}

// --- 3. AUDIT TRAIL & CYBER SECURITY LOGGING ---

export interface SecurityEventLog {
  id: string;
  type: 'LOGIN_SUCCESS' | 'FAILED_LOGIN_ATTEMPT' | 'BRUTE_FORCE_LOCKOUT' | 'DATA_EXPORT' | 'UNAUTHORIZED_ACCESS_BLOCKED' | 'SUSPICIOUS_INPUT_SANITIZED' | 'SESSION_TIMEOUT';
  description: string;
  timestamp: string;
  panchayat?: string;
  userAgent?: string;
}

const SECURITY_LOGS_KEY = 'gp_security_audit_logs';

export function logSecurityEvent(type: SecurityEventLog['type'], description: string, panchayat?: string): void {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_KEY);
    const logs: SecurityEventLog[] = raw ? JSON.parse(raw) : [];

    const newLog: SecurityEventLog = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      description: sanitizeInput(description),
      timestamp: new Date().toISOString(),
      panchayat: panchayat ? sanitizeInput(panchayat) : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    };

    // Keep last 100 security events
    const updated = [newLog, ...logs].slice(0, 100);
    localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {}
}

export function getSecurityAuditLogs(): SecurityEventLog[] {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function clearSecurityAuditLogs(): void {
  try {
    localStorage.removeItem(SECURITY_LOGS_KEY);
  } catch (e) {}
}

// --- 4. SENSITIVE DATA MASKING ---

/**
 * Masks bank account number showing only last 4 digits (e.g. "•••• •••• 5678")
 */
export function maskAccountNumber(accNo?: string): string {
  if (!accNo) return '';
  const clean = accNo.trim();
  if (clean.length <= 4) return clean;
  return `•••• •••• ${clean.slice(-4)}`;
}

/**
 * Masks Aadhaar number showing only last 4 digits (e.g. "XXXX-XXXX-1234")
 */
export function maskAadhaar(aadhaar?: string): string {
  if (!aadhaar) return '';
  const clean = aadhaar.replace(/[^0-9]/g, '');
  if (clean.length !== 12) return aadhaar;
  return `XXXX-XXXX-${clean.slice(-4)}`;
}
