// DevAtlas Prometheus Metrics
// Created by Balaji Koneti

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export class MetricsService {
  // HTTP metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestSize: Histogram<string>;
  private httpResponseSize: Histogram<string>;

  // Analysis metrics
  private analysisTotal: Counter<string>;
  private analysisDuration: Histogram<string>;
  private analysisSuccess: Counter<string>;
  private analysisFailed: Counter<string>;

  // Repository metrics
  private reposAnalyzed: Counter<string>;
  private reposTotal: Gauge<string>;
  private reposByLanguage: Gauge<string>;

  // LLM metrics
  private llmRequestsTotal: Counter<string>;
  private llmTokensUsed: Counter<string>;
  private llmCost: Counter<string>;

  // GitHub API metrics
  private githubApiRequests: Counter<string>;
  private githubApiRateLimit: Gauge<string>;

  // Database metrics
  private dbConnections: Gauge<string>;
  private dbQueriesTotal: Counter<string>;
  private dbQueryDuration: Histogram<string>;

  // Queue metrics
  private queueJobsTotal: Counter<string>;
  private queueJobsActive: Gauge<string>;
  private queueJobsWaiting: Gauge<string>;

  constructor() {
    // Collect default metrics
    collectDefaultMetrics({ register });

    // Initialize HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'org_id'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'org_id'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route', 'org_id'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [register],
    });

    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'org_id'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [register],
    });

    // Initialize analysis metrics
    this.analysisTotal = new Counter({
      name: 'analysis_total',
      help: 'Total number of analyses',
      labelNames: ['org_id', 'project_type'],
      registers: [register],
    });

    this.analysisDuration = new Histogram({
      name: 'analysis_duration_seconds',
      help: 'Duration of analyses in seconds',
      labelNames: ['org_id', 'project_type'],
      buckets: [60, 300, 600, 1800, 3600, 7200],
      registers: [register],
    });

    this.analysisSuccess = new Counter({
      name: 'analysis_success_total',
      help: 'Total number of successful analyses',
      labelNames: ['org_id', 'project_type'],
      registers: [register],
    });

    this.analysisFailed = new Counter({
      name: 'analysis_failed_total',
      help: 'Total number of failed analyses',
      labelNames: ['org_id', 'project_type', 'error_type'],
      registers: [register],
    });

    // Initialize repository metrics
    this.reposAnalyzed = new Counter({
      name: 'repos_analyzed_total',
      help: 'Total number of repositories analyzed',
      labelNames: ['org_id', 'language'],
      registers: [register],
    });

    this.reposTotal = new Gauge({
      name: 'repos_total',
      help: 'Total number of repositories',
      labelNames: ['org_id'],
      registers: [register],
    });

    this.reposByLanguage = new Gauge({
      name: 'repos_by_language',
      help: 'Number of repositories by language',
      labelNames: ['org_id', 'language'],
      registers: [register],
    });

    // Initialize LLM metrics
    this.llmRequestsTotal = new Counter({
      name: 'llm_requests_total',
      help: 'Total number of LLM requests',
      labelNames: ['provider', 'model', 'org_id'],
      registers: [register],
    });

    this.llmTokensUsed = new Counter({
      name: 'llm_tokens_used_total',
      help: 'Total number of LLM tokens used',
      labelNames: ['provider', 'model', 'org_id', 'type'],
      registers: [register],
    });

    this.llmCost = new Counter({
      name: 'llm_cost_total',
      help: 'Total LLM cost in USD',
      labelNames: ['provider', 'model', 'org_id'],
      registers: [register],
    });

    // Initialize GitHub API metrics
    this.githubApiRequests = new Counter({
      name: 'github_api_requests_total',
      help: 'Total number of GitHub API requests',
      labelNames: ['endpoint', 'status_code'],
      registers: [register],
    });

    this.githubApiRateLimit = new Gauge({
      name: 'github_api_rate_limit_remaining',
      help: 'GitHub API rate limit remaining',
      labelNames: ['endpoint'],
      registers: [register],
    });

    // Initialize database metrics
    this.dbConnections = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [register],
    });

    this.dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table'],
      registers: [register],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [register],
    });

    // Initialize queue metrics
    this.queueJobsTotal = new Counter({
      name: 'queue_jobs_total',
      help: 'Total number of queue jobs',
      labelNames: ['queue', 'status'],
      registers: [register],
    });

    this.queueJobsActive = new Gauge({
      name: 'queue_jobs_active',
      help: 'Number of active queue jobs',
      labelNames: ['queue'],
      registers: [register],
    });

    this.queueJobsWaiting = new Gauge({
      name: 'queue_jobs_waiting',
      help: 'Number of waiting queue jobs',
      labelNames: ['queue'],
      registers: [register],
    });
  }

  // HTTP metrics methods
  recordHttpRequest(method: string, route: string, statusCode: number, orgId?: string) {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString(), org_id: orgId || 'unknown' });
  }

  recordHttpRequestDuration(method: string, route: string, duration: number, orgId?: string) {
    this.httpRequestDuration.observe({ method, route, org_id: orgId || 'unknown' }, duration);
  }

  recordHttpRequestSize(method: string, route: string, size: number, orgId?: string) {
    this.httpRequestSize.observe({ method, route, org_id: orgId || 'unknown' }, size);
  }

  recordHttpResponseSize(method: string, route: string, size: number, orgId?: string) {
    this.httpResponseSize.observe({ method, route, org_id: orgId || 'unknown' }, size);
  }

  // Analysis metrics methods
  recordAnalysisStart(orgId: string, projectType: string) {
    this.analysisTotal.inc({ org_id: orgId, project_type: projectType });
  }

  recordAnalysisDuration(orgId: string, projectType: string, duration: number) {
    this.analysisDuration.observe({ org_id: orgId, project_type: projectType }, duration);
  }

  recordAnalysisSuccess(orgId: string, projectType: string) {
    this.analysisSuccess.inc({ org_id: orgId, project_type: projectType });
  }

  recordAnalysisFailure(orgId: string, projectType: string, errorType: string) {
    this.analysisFailed.inc({ org_id: orgId, project_type: projectType, error_type: errorType });
  }

  // Repository metrics methods
  recordRepoAnalyzed(orgId: string, language: string) {
    this.reposAnalyzed.inc({ org_id: orgId, language });
  }

  setReposTotal(orgId: string, count: number) {
    this.reposTotal.set({ org_id: orgId }, count);
  }

  setReposByLanguage(orgId: string, language: string, count: number) {
    this.reposByLanguage.set({ org_id: orgId, language }, count);
  }

  // LLM metrics methods
  recordLlmRequest(provider: string, model: string, orgId: string) {
    this.llmRequestsTotal.inc({ provider, model, org_id: orgId });
  }

  recordLlmTokens(provider: string, model: string, orgId: string, type: string, tokens: number) {
    this.llmTokensUsed.inc({ provider, model, org_id: orgId, type }, tokens);
  }

  recordLlmCost(provider: string, model: string, orgId: string, cost: number) {
    this.llmCost.inc({ provider, model, org_id: orgId }, cost);
  }

  // GitHub API metrics methods
  recordGithubApiRequest(endpoint: string, statusCode: number) {
    this.githubApiRequests.inc({ endpoint, status_code: statusCode.toString() });
  }

  setGithubApiRateLimit(endpoint: string, remaining: number) {
    this.githubApiRateLimit.set({ endpoint }, remaining);
  }

  // Database metrics methods
  setDbConnections(count: number) {
    this.dbConnections.set(count);
  }

  recordDbQuery(operation: string, table: string) {
    this.dbQueriesTotal.inc({ operation, table });
  }

  recordDbQueryDuration(operation: string, table: string, duration: number) {
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  // Queue metrics methods
  recordQueueJob(queue: string, status: string) {
    this.queueJobsTotal.inc({ queue, status });
  }

  setQueueJobsActive(queue: string, count: number) {
    this.queueJobsActive.set({ queue }, count);
  }

  setQueueJobsWaiting(queue: string, count: number) {
    this.queueJobsWaiting.set({ queue }, count);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    register.clear();
  }
}

