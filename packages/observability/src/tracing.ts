// DevAtlas OpenTelemetry Tracing
// Created by Balaji Koneti

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export class TracingService {
  private sdk: NodeSDK;

  constructor(config: {
    serviceName: string;
    serviceVersion: string;
    jaegerEndpoint?: string;
    environment?: string;
  }) {
    // Create Jaeger exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: config.jaegerEndpoint || 'http://localhost:14268/api/traces',
    });

    // Initialize OpenTelemetry SDK
    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment || 'development',
      }),
      traceExporter: jaegerExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable file system instrumentation
          },
        }),
      ],
    });

    // Start the SDK
    this.sdk.start();
  }

  /**
   * Create a new span
   */
  createSpan(name: string, attributes?: Record<string, any>) {
    const tracer = trace.getTracer('devatlas');
    return tracer.startSpan(name, { attributes });
  }

  /**
   * Execute a function within a span
   */
  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.createSpan(name, attributes);
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), fn);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add attributes to current span
   */
  addAttributes(attributes: Record<string, any>) {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Record<string, any>) {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Shutdown tracing
   */
  async shutdown() {
    await this.sdk.shutdown();
  }
}

