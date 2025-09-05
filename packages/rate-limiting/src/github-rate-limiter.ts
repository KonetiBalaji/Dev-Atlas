// DevAtlas GitHub API Rate Limiter
// Created by Balaji Koneti

import { Octokit } from 'octokit';
import Redis from 'ioredis';

export interface GitHubRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export class GitHubRateLimiter {
  private redis: Redis;
  private octokit: Octokit;

  constructor(redis: Redis, octokit: Octokit) {
    this.redis = redis;
    this.octokit = octokit;
  }

  /**
   * Check GitHub API rate limit
   */
  async checkRateLimit(): Promise<GitHubRateLimitInfo> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      const rateLimit = response.data.rate;
      
      // Cache rate limit info
      await this.redis.setex(
        'github:rate_limit',
        60, // Cache for 1 minute
        JSON.stringify(rateLimit)
      );

      return rateLimit;
    } catch (error) {
      // Fallback to cached data if API call fails
      const cached = await this.redis.get('github:rate_limit');
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Default values if no cache available
      return {
        limit: 5000,
        remaining: 0,
        reset: Date.now() + 3600000, // 1 hour from now
        used: 5000,
      };
    }
  }

  /**
   * Check if we can make a GitHub API request
   */
  async canMakeRequest(): Promise<boolean> {
    const rateLimit = await this.checkRateLimit();
    return rateLimit.remaining > 0;
  }

  /**
   * Wait until rate limit resets
   */
  async waitForReset(): Promise<void> {
    const rateLimit = await this.checkRateLimit();
    const resetTime = rateLimit.reset * 1000; // Convert to milliseconds
    const now = Date.now();
    
    if (resetTime > now) {
      const waitTime = resetTime - now;
      console.log(`GitHub rate limit exceeded. Waiting ${waitTime}ms until reset.`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get time until rate limit resets
   */
  async getTimeUntilReset(): Promise<number> {
    const rateLimit = await this.checkRateLimit();
    const resetTime = rateLimit.reset * 1000;
    const now = Date.now();
    
    return Math.max(0, resetTime - now);
  }

  /**
   * Make a GitHub API request with rate limit handling
   */
  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    // Check if we can make the request
    if (!(await this.canMakeRequest())) {
      await this.waitForReset();
    }

    try {
      const result = await requestFn();
      
      // Update rate limit info after successful request
      await this.checkRateLimit();
      
      return result;
    } catch (error: any) {
      // Handle rate limit exceeded error
      if (error.status === 403 && error.message.includes('rate limit')) {
        console.log('GitHub rate limit exceeded, waiting for reset...');
        await this.waitForReset();
        
        // Retry the request
        return requestFn();
      }
      
      throw error;
    }
  }

  /**
   * Get rate limit status for different endpoints
   */
  async getEndpointStatus(): Promise<{
    core: GitHubRateLimitInfo;
    search: GitHubRateLimitInfo;
    graphql: GitHubRateLimitInfo;
  }> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      const data = response.data;
      
      return {
        core: data.rate,
        search: data.search,
        graphql: data.graphql,
      };
    } catch (error) {
      // Fallback to cached data
      const cached = await this.redis.get('github:rate_limit:endpoints');
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Default values
      const defaultLimit = {
        limit: 5000,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + 3600,
        used: 5000,
      };
      
      return {
        core: defaultLimit,
        search: defaultLimit,
        graphql: defaultLimit,
      };
    }
  }

  /**
   * Monitor rate limit usage
   */
  async monitorUsage(): Promise<{
    usage: number;
    limit: number;
    percentage: number;
    remaining: number;
    resetIn: number;
  }> {
    const rateLimit = await this.checkRateLimit();
    const usage = rateLimit.used;
    const limit = rateLimit.limit;
    const percentage = (usage / limit) * 100;
    const remaining = rateLimit.remaining;
    const resetIn = await this.getTimeUntilReset();

    return {
      usage,
      limit,
      percentage,
      remaining,
      resetIn,
    };
  }
}

