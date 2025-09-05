// DevAtlas GitHub Webhook Service
// Created by Balaji Koneti

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devatlas/db';
import { Queue } from 'bullmq';
// import { createBullBoard } from '@bull-board/api';
// import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
// import { ExpressAdapter } from '@bull-board/express';

export interface GitHubWebhookPayload {
  action: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    clone_url: string;
    language: string;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
  };
  organization?: {
    id: number;
    login: string;
  };
  sender: {
    id: number;
    login: string;
    type: string;
  };
}

@Injectable()
export class GitHubWebhookService {
  private analysisQueue: Queue;

  constructor(private prisma: PrismaService) {
    this.analysisQueue = new Queue('analysis', {
      connection: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379'),
      },
    });
  }

  /**
   * Process GitHub webhook payload
   */
  async processWebhook(payload: GitHubWebhookPayload): Promise<void> {
    console.log(`Processing GitHub webhook: ${payload.action} for ${payload.repository.full_name}`);

    switch (payload.action) {
      case 'push':
        await this.handlePush(payload);
        break;
      case 'pull_request':
        await this.handlePullRequest(payload);
        break;
      case 'issues':
        await this.handleIssue(payload);
        break;
      case 'workflow_run':
        await this.handleWorkflowRun(payload);
        break;
      case 'repository':
        await this.handleRepository(payload);
        break;
      default:
        console.log(`Unhandled webhook action: ${payload.action}`);
    }
  }

  /**
   * Handle push events
   */
  private async handlePush(payload: GitHubWebhookPayload): Promise<void> {
    const { repository } = payload;

    // Find projects that monitor this repository
    const projects = await this.findProjectsByRepository(repository.full_name);

    for (const project of projects) {
      // Check if we should trigger a re-analysis
      if (this.shouldTriggerAnalysis(project, 'push')) {
        await this.scheduleAnalysis(project.id, {
          trigger: 'webhook',
          triggerType: 'push',
          repository: repository.full_name,
          commit: (payload as any).head_commit?.id,
        });
      }
    }

    // Update repository metadata
    await this.updateRepositoryMetadata(repository);
  }

  /**
   * Handle pull request events
   */
  private async handlePullRequest(payload: GitHubWebhookPayload): Promise<void> {
    const { repository } = payload;

    // Find projects that monitor this repository
    const projects = await this.findProjectsByRepository(repository.full_name);

    for (const project of projects) {
      // Check if we should trigger a re-analysis
      if (this.shouldTriggerAnalysis(project, 'pull_request')) {
        await this.scheduleAnalysis(project.id, {
          trigger: 'webhook',
          triggerType: 'pull_request',
          repository: repository.full_name,
          pullRequest: (payload as any).pull_request?.number,
        });
      }
    }
  }

  /**
   * Handle issue events
   */
  private async handleIssue(payload: GitHubWebhookPayload): Promise<void> {
    const { repository } = payload;

    // Find projects that monitor this repository
    const projects = await this.findProjectsByRepository(repository.full_name);

    for (const project of projects) {
      // Check if we should trigger a re-analysis
      if (this.shouldTriggerAnalysis(project, 'issue')) {
        await this.scheduleAnalysis(project.id, {
          trigger: 'webhook',
          triggerType: 'issue',
          repository: repository.full_name,
          issue: (payload as any).issue?.number,
        });
      }
    }
  }

  /**
   * Handle workflow run events
   */
  private async handleWorkflowRun(payload: GitHubWebhookPayload): Promise<void> {
    const { repository } = payload;

    // Find projects that monitor this repository
    const projects = await this.findProjectsByRepository(repository.full_name);

    for (const project of projects) {
      // Check if we should trigger a re-analysis
      if (this.shouldTriggerAnalysis(project, 'workflow_run')) {
        await this.scheduleAnalysis(project.id, {
          trigger: 'webhook',
          triggerType: 'workflow_run',
          repository: repository.full_name,
          workflow: (payload as any).workflow_run?.name,
        });
      }
    }
  }

  /**
   * Handle repository events
   */
  private async handleRepository(payload: GitHubWebhookPayload): Promise<void> {
    const { repository } = payload;

    // Find projects that monitor this repository
    const projects = await this.findProjectsByRepository(repository.full_name);

    for (const project of projects) {
      // Check if we should trigger a re-analysis
      if (this.shouldTriggerAnalysis(project, 'repository')) {
        await this.scheduleAnalysis(project.id, {
          trigger: 'webhook',
          triggerType: 'repository',
          repository: repository.full_name,
        });
      }
    }

    // Update repository metadata
    await this.updateRepositoryMetadata(repository);
  }

  /**
   * Find projects that monitor a specific repository
   */
  private async findProjectsByRepository(repositoryFullName: string): Promise<any[]> {
    const [owner] = repositoryFullName.split('/');
    
    // Find projects by owner (user or organization)
    const projects = await this.prisma.project.findMany({
      where: {
        OR: [
          { handle: owner, type: 'user' },
          { handle: owner, type: 'org' },
        ],
      },
      include: {
        org: true,
      },
    });

    return projects;
  }

  /**
   * Determine if we should trigger an analysis
   */
  private shouldTriggerAnalysis(project: any, triggerType: string): boolean {
    // Check if project is active
    if (project.status !== 'active') {
      return false;
    }

    // Check if webhook triggers are enabled for this project
    const webhookSettings = project.webhookSettings || {};
    if (!webhookSettings.enabled) {
      return false;
    }

    // Check if this trigger type is enabled
    const enabledTriggers = webhookSettings.triggers || [];
    if (!enabledTriggers.includes(triggerType)) {
      return false;
    }

    // Check rate limiting
    if (this.isRateLimited(project)) {
      return false;
    }

    return true;
  }

  /**
   * Check if project is rate limited
   */
  private isRateLimited(project: any): boolean {
    // Simple rate limiting: max 1 analysis per hour per project
    const lastAnalysis = project.lastAnalysisAt;
    if (!lastAnalysis) {
      return false;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastAnalysis > oneHourAgo;
  }

  /**
   * Schedule an analysis job
   */
  private async scheduleAnalysis(projectId: string, metadata: any): Promise<void> {
    try {
      await this.analysisQueue.add('analyze-project', {
        projectId,
        metadata,
      }, {
        delay: 5000, // 5 second delay to avoid rapid re-analysis
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      console.log(`Scheduled analysis for project ${projectId}`);
    } catch (error) {
      console.error(`Failed to schedule analysis for project ${projectId}:`, error);
    }
  }

  /**
   * Update repository metadata
   */
  private async updateRepositoryMetadata(repository: any): Promise<void> {
    try {
      // Find existing repo record
      const existingRepo = await this.prisma.repo.findFirst({
        where: {
          url: repository.html_url,
        },
      });

      if (existingRepo) {
        // Update existing repo
        await this.prisma.repo.update({
          where: { id: existingRepo.id },
          data: {
            stars: repository.stargazers_count,
            forks: repository.forks_count,
            language: repository.language,
            updatedAt: new Date(repository.updated_at),
          },
        });
      }
    } catch (error) {
      console.error('Failed to update repository metadata:', error);
    }
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(orgId: string): Promise<{
    totalWebhooks: number;
    webhooksByType: Record<string, number>;
    lastWebhookAt: Date | null;
  }> {
    const webhooks = await this.prisma.auditLog.findMany({
      where: {
        orgId,
        action: 'webhook_received',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const webhooksByType: Record<string, number> = {};
    let lastWebhookAt: Date | null = null;

    for (const webhook of webhooks) {
      const type = webhook.metadata?.type || 'unknown';
      webhooksByType[type] = (webhooksByType[type] || 0) + 1;
      
      if (!lastWebhookAt || webhook.createdAt > lastWebhookAt) {
        lastWebhookAt = webhook.createdAt;
      }
    }

    return {
      totalWebhooks: webhooks.length,
      webhooksByType,
      lastWebhookAt,
    };
  }
}

