export type LogLevel = 'info' | 'warn' | 'error' | 'network';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  details?: string;
}

type LogListener = (logs: LogEntry[]) => void;

class AppLoggerService {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 200;
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Log startup
    this.info('System', 'AppLogger initialized');

    // Intercept unhandled JS exceptions if ErrorUtils is available
    const g = typeof globalThis !== 'undefined' ? (globalThis as unknown as { ErrorUtils?: { getGlobalHandler?: () => (err: Error, isFatal?: boolean) => void; setGlobalHandler: (handler: (err: Error, isFatal?: boolean) => void) => void } }) : null;
    if (g?.ErrorUtils) {
      const previousHandler = g.ErrorUtils.getGlobalHandler ? g.ErrorUtils.getGlobalHandler() : null;

      g.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        this.error('Crash', `${isFatal ? '[FATAL] ' : ''}${error.message || 'Unknown error'}`, error.stack);
        if (previousHandler) {
          previousHandler(error, isFatal);
        }
      });
    }
  }

  private addEntry(level: LogLevel, tag: string, message: string, details?: unknown) {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    let formattedDetails: string | undefined;
    if (details !== undefined && details !== null) {
      if (details instanceof Error) {
        formattedDetails = `${details.name}: ${details.message}\n${details.stack || ''}`;
      } else if (typeof details === 'object') {
        try {
          formattedDetails = JSON.stringify(details, null, 2);
        } catch {
          formattedDetails = String(details);
        }
      } else {
        formattedDetails = String(details);
      }
    }

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
      level,
      tag,
      message: String(message),
      details: formattedDetails,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.notify();
  }

  info(tag: string, message: string, details?: unknown) {
    this.addEntry('info', tag, message, details);
  }

  warn(tag: string, message: string, details?: unknown) {
    this.addEntry('warn', tag, message, details);
  }

  error(tag: string, message: string, details?: unknown) {
    this.addEntry('error', tag, message, details);
  }

  network(method: string, path: string, status: number, durationMs?: number, error?: unknown) {
    const isError = status >= 400 || status === 0;
    const tag = `API ${method}`;
    const message = `${status} ${path} (${durationMs ? durationMs + 'ms' : ''})`;
    this.addEntry(isError ? 'error' : 'network', tag, message, error);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.notify();
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getLogs();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch {}
    });
  }
}

export const appLogger = new AppLoggerService();
