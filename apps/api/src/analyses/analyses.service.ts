// DevAtlas Analyses Service
// Created by Balaji Koneti

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Analysis, Project } from '@devatlas/db';

@Injectable()
export class AnalysesService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('analysis') private analysisQueue: Queue,
  ) {}

  /**
   * Start a new analysis for a project
   */
  async startAnalysis(projectId: string, orgId: string): Promise<Analysis> {
    // Verify project exists and belongs to org
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Create analysis record
    const analysis = await this.prisma.analysis.create({
      data: {
        projectId,
        status: 'queued',
      },
    });

    // Queue the analysis job
    await this.analysisQueue.add('analyze-project', {
      analysisId: analysis.id,
      projectId,
      handle: project.handle,
      type: project.type,
    });

    return analysis;
  }

  /**
   * Get all analyses for a project
   */
  async findByProject(projectId: string, orgId: string): Promise<Array<Analysis & { score: any; _count: { repos: number } }>> {
    // Verify project belongs to org
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.analysis.findMany({
      where: { projectId },
      include: {
        score: true,
        _count: {
          select: { repos: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get a specific analysis
   */
  async findOne(id: string, orgId: string): Promise<Analysis & { project: Project; score: any; repos: Array<any> }> {
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id,
        project: { orgId },
      },
      include: {
        project: true,
        score: true,
        repos: {
          include: {
            ownership: true,
            _count: {
              select: { embeddings: true },
            },
          },
        },
      },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    return analysis;
  }

  /**
   * Get latest analysis for a project
   */
  async findLatest(projectId: string, orgId: string): Promise<(Analysis & { score: any; repos: Array<any> }) | null> {
    // Verify project belongs to org
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.analysis.findFirst({
      where: { projectId },
      include: {
        score: true,
        repos: {
          include: {
            ownership: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Update analysis status
   */
  async updateStatus(id: string, status: string, summary?: string): Promise<Analysis> {
    return this.prisma.analysis.update({
      where: { id },
      data: {
        status,
        ...(summary !== undefined && { summary }),
        ...(status === 'complete' || status === 'failed' ? { finishedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Get analysis statistics
   */
  async getStats(orgId: string): Promise<{ totalAnalyses: number; runningAnalyses: number; completedAnalyses: number }> {
    const [totalAnalyses, runningAnalyses, completedAnalyses] = await Promise.all([
      this.prisma.analysis.count({
        where: { project: { orgId } },
      }),
      this.prisma.analysis.count({
        where: { project: { orgId }, status: 'running' },
      }),
      this.prisma.analysis.count({
        where: { project: { orgId }, status: 'complete' },
      }),
    ]);

    return {
      totalAnalyses,
      runningAnalyses,
      completedAnalyses,
    };
  }
}
