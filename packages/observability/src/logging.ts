// DevAtlas Logging Service
// Created by Balaji Koneti

import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  requestId?: string;
  orgId?: string;
  userId?: string;
  spanId?: string;
  traceId?: string;
}

class LogContextStorage {
  private static instance: AsyncLocalStorage<LogContext>;
  
  static getInstance(): AsyncLocalStorage<LogContext> {
    if (!this.instance) {
      this.instance = new AsyncLocalStorage<LogContext>();
    }
    return this.instance;
  }
}

export class LoggingService {
  private logger: pino.Logger;
  private contextStorage: AsyncLocalStorage<LogContext>;

  constructor(config: {
    level?: string;
    serviceName?: string;
    environment?: string;
  }) {
    this.contextStorage = LogContextStorage.getInstance();
    
    this.logger = pino({
      level: config.level || 'info',
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => {
          const context = this.contextStorage.getStore();
          return {
            ...object,
            service: config.serviceName || 'devatlas',
            environment: config.environment || 'development',
            ...context,
          };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: [
          'password',
          'token',
          'secret',
          'key',
          'authorization',
          'cookie',
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
      },
    });
  }

  /**
   * Run a function with logging context
   */
  withContext<T>(context: LogContext, fn: () => T): T {
    return this.contextStorage.run(context, fn);
  }

  /**
   * Set logging context
   */
  setContext(context: Partial<LogContext>) {
    const currentContext = this.contextStorage.getStore() || {};
    this.contextStorage.enterWith({ ...currentContext, ...context });
  }

  /**
   * Get current context
   */
  getContext(): LogContext | undefined {
    return this.contextStorage.getStore();
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any) {
    this.logger.debug(data, message);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any) {
    this.logger.info(data, message);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any) {
    this.logger.warn(data, message);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, data?: any) {
    if (error instanceof Error) {
      this.logger.error({
        ...data,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }, message);
    } else {
      this.logger.error({ ...data, error }, message);
    }
  }

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error | any, data?: any) {
    if (error instanceof Error) {
      this.logger.fatal({
        ...data,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }, message);
    } else {
      this.logger.fatal({ ...data, error }, message);
    }
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): pino.Logger {
    return this.logger.child(context);
  }

  /**
   * Log HTTP request
   */
  logHttpRequest(req: any, res: any, duration: number) {
    const context = this.getContext();
    this.info('HTTP request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      ...context,
    });
  }

  /**
   * Log analysis start
   */
  logAnalysisStart(analysisId: string, projectId: string, orgId: string) {
    this.info('Analysis started', {
      analysisId,
      projectId,
      orgId,
    });
  }

  /**
   * Log analysis completion
   */
  logAnalysisComplete(analysisId: string, duration: number, repoCount: number) {
    this.info('Analysis completed', {
      analysisId,
      duration,
      repoCount,
    });
  }

  /**
   * Log analysis failure
   */
  logAnalysisFailure(analysisId: string, error: Error, stage?: string) {
    this.error('Analysis failed', error, {
      analysisId,
      stage,
    });
  }

  /**
   * Log LLM request
   */
  logLlmRequest(provider: string, model: string, tokens: number, cost: number) {
    this.info('LLM request completed', {
      provider,
      model,
      tokens,
      cost,
    });
  }

  /**
   * Log GitHub API request
   */
  logGithubApiRequest(endpoint: string, statusCode: number, rateLimitRemaining?: number) {
    this.info('GitHub API request', {
      endpoint,
      statusCode,
      rateLimitRemaining,
    });
  }

  /**
   * Log database query
   */
  logDbQuery(operation: string, table: string, duration: number) {
    this.debug('Database query', {
      operation,
      table,
      duration,
    });
  }

  /**
   * Log queue job
   */
  logQueueJob(queue: string, jobId: string, status: string, data?: any) {
    this.info('Queue job', {
      queue,
      jobId,
      status,
      data,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: any) {
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this[logLevel](`Security event: ${event}`, data);
  }

  /**
   * Log performance metric
   */
  logPerformanceMetric(metric: string, value: number, unit: string, tags?: Record<string, string>) {
    this.info('Performance metric', {
      metric,
      value,
      unit,
      tags,
    });
  }
}

