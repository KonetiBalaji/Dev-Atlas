// DevAtlas Sentry Integration
// Created by Balaji Koneti

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export class SentryService {
  private initialized = false;

  constructor(config: {
    dsn?: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
    profilesSampleRate?: number;
  }) {
    if (config.dsn) {
      this.initialize(config);
    }
  }

  private initialize(config: {
    dsn: string;
    environment?: string;
    release?: string;
    tracesSampleRate?: number;
    profilesSampleRate?: number;
  }) {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment || 'development',
      release: config.release,
      tracesSampleRate: config.tracesSampleRate || 0.1,
      profilesSampleRate: config.profilesSampleRate || 0.1,
      integrations: [
        nodeProfilingIntegration(),
      ],
      beforeSend(event) {
        // Filter out health check requests
        if (event.request?.url?.includes('/health')) {
          return null;
        }
        return event;
      },
    });

    this.initialized = true;
  }

  /**
   * Capture exception
   */
  captureException(error: Error, context?: any) {
    if (!this.initialized) return;

    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureException(error);
    });
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: any) {
    if (!this.initialized) return;

    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    if (!this.initialized) return;
    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; username?: string; orgId?: string }) {
    if (!this.initialized) return;
    Sentry.setUser(user);
  }

  /**
   * Set tag
   */
  setTag(key: string, value: string) {
    if (!this.initialized) return;
    Sentry.setTag(key, value);
  }

  /**
   * Set context
   */
  setContext(key: string, context: any) {
    if (!this.initialized) return;
    Sentry.setContext(key, context);
  }

  /**
   * Start transaction
   */
  startTransaction(name: string, op: string): Sentry.Transaction | undefined {
    if (!this.initialized) return undefined;
    return Sentry.startTransaction({ name, op });
  }

  /**
   * Start span
   */
  startSpan<T>(spanContext: { name: string; op: string }, callback: (span: Sentry.Span) => T): T {
    if (!this.initialized) {
      return callback({} as Sentry.Span);
    }
    return Sentry.startSpan(spanContext, callback);
  }

  /**
   * Flush events
   */
  async flush(timeout?: number): Promise<boolean> {
    if (!this.initialized) return true;
    return Sentry.flush(timeout);
  }

  /**
   * Close Sentry
   */
  async close(): Promise<void> {
    if (!this.initialized) return;
    await Sentry.close();
  }
}

