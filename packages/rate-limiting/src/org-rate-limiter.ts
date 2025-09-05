// DevAtlas Organization Rate Limiter
// Created by Balaji Koneti

import { RateLimiter, RateLimitConfig, RateLimitResult } from './rate-limiter';
import Redis from 'ioredis';

export interface OrgRateLimitConfig {
  // API rate limits
  apiRequests: {
    windowMs: number;
    maxRequests: number;
  };
  
  // Analysis rate limits
  analysisRequests: {
    windowMs: number;
    maxRequests: number;
  };
  
  // LLM rate limits
  llmRequests: {
    windowMs: number;
    maxRequests: number;
    maxTokens: number;
  };
  
  // GitHub API rate limits
  githubApiRequests: {
    windowMs: number;
    maxRequests: number;
  };
}

export class OrgRateLimiter {
  private redis: Redis;
  private config: OrgRateLimitConfig;
  private limiters: Map<string, RateLimiter> = new Map();

  constructor(redis: Redis, config: OrgRateLimitConfig) {
    this.redis = redis;
    this.config = config;
    this.initializeLimiters();
  }

  private initializeLimiters() {
    // API rate limiter
    this.limiters.set('api', new RateLimiter(this.redis, {
      windowMs: this.config.apiRequests.windowMs,
      maxRequests: this.config.apiRequests.maxRequests,
    }));

    // Analysis rate limiter
    this.limiters.set('analysis', new RateLimiter(this.redis, {
      windowMs: this.config.analysisRequests.windowMs,
      maxRequests: this.config.analysisRequests.maxRequests,
    }));

    // LLM rate limiter
    this.limiters.set('llm', new RateLimiter(this.redis, {
      windowMs: this.config.llmRequests.windowMs,
      maxRequests: this.config.llmRequests.maxRequests,
    }));

    // GitHub API rate limiter
    this.limiters.set('github', new RateLimiter(this.redis, {
      windowMs: this.config.githubApiRequests.windowMs,
      maxRequests: this.config.githubApiRequests.maxRequests,
    }));
  }

  /**
   * Check API rate limit for organization
   */
  async checkApiLimit(orgId: string): Promise<RateLimitResult> {
    const limiter = this.limiters.get('api');
    if (!limiter) throw new Error('API rate limiter not initialized');
    
    return limiter.checkLimit(`rate_limit:api:${orgId}`);
  }

  /**
   * Check analysis rate limit for organization
   */
  async checkAnalysisLimit(orgId: string): Promise<RateLimitResult> {
    const limiter = this.limiters.get('analysis');
    if (!limiter) throw new Error('Analysis rate limiter not initialized');
    
    return limiter.checkLimit(`rate_limit:analysis:${orgId}`);
  }

  /**
   * Check LLM rate limit for organization
   */
  async checkLlmLimit(orgId: string): Promise<RateLimitResult> {
    const limiter = this.limiters.get('llm');
    if (!limiter) throw new Error('LLM rate limiter not initialized');
    
    return limiter.checkLimit(`rate_limit:llm:${orgId}`);
  }

  /**
   * Check GitHub API rate limit for organization
   */
  async checkGithubLimit(orgId: string): Promise<RateLimitResult> {
    const limiter = this.limiters.get('github');
    if (!limiter) throw new Error('GitHub rate limiter not initialized');
    
    return limiter.checkLimit(`rate_limit:github:${orgId}`);
  }

  /**
   * Check token usage limit for LLM
   */
  async checkTokenLimit(orgId: string, tokens: number): Promise<boolean> {
    const key = `token_usage:llm:${orgId}`;
    const windowMs = this.config.llmRequests.windowMs;
    const maxTokens = this.config.llmRequests.maxTokens;
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove expired entries
    await this.redis.zremrangebyscore(key, 0, windowStart);
    
    // Get current usage
    const currentUsage = await this.redis.zcard(key);
    
    // Check if adding tokens would exceed limit
    if (currentUsage + tokens > maxTokens) {
      return false;
    }
    
    // Add current token usage
    await this.redis.zadd(key, now, `${now}-${tokens}`);
    await this.redis.expire(key, Math.ceil(windowMs / 1000));
    
    return true;
  }

  /**
   * Get rate limit status for all services
   */
  async getOrgStatus(orgId: string): Promise<{
    api: RateLimitResult;
    analysis: RateLimitResult;
    llm: RateLimitResult;
    github: RateLimitResult;
  }> {
    const [api, analysis, llm, github] = await Promise.all([
      this.limiters.get('api')?.peek(`rate_limit:api:${orgId}`),
      this.limiters.get('analysis')?.peek(`rate_limit:analysis:${orgId}`),
      this.limiters.get('llm')?.peek(`rate_limit:llm:${orgId}`),
      this.limiters.get('github')?.peek(`rate_limit:github:${orgId}`),
    ]);

    return {
      api: api || { allowed: true, remaining: 0, resetTime: 0, totalHits: 0 },
      analysis: analysis || { allowed: true, remaining: 0, resetTime: 0, totalHits: 0 },
      llm: llm || { allowed: true, remaining: 0, resetTime: 0, totalHits: 0 },
      github: github || { allowed: true, remaining: 0, resetTime: 0, totalHits: 0 },
    };
  }

  /**
   * Reset all rate limits for an organization
   */
  async resetOrgLimits(orgId: string): Promise<void> {
    const keys = [
      `rate_limit:api:${orgId}`,
      `rate_limit:analysis:${orgId}`,
      `rate_limit:llm:${orgId}`,
      `rate_limit:github:${orgId}`,
      `token_usage:llm:${orgId}`,
    ];

    await this.redis.del(...keys);
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<OrgRateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeLimiters();
  }

  /**
   * Get current configuration
   */
  getConfig(): OrgRateLimitConfig {
    return { ...this.config };
  }
}

