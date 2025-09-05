// DevAtlas Repos Service
// Created by Balaji Koneti

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReposService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all repos for an analysis
   */
  async findByAnalysis(analysisId: string, orgId: string) {
    // Verify analysis belongs to org
    const analysis = await this.prisma.analysis.findFirst({
      where: {
        id: analysisId,
        project: { orgId },
      },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    return this.prisma.repo.findMany({
      where: { analysisId },
      include: {
        ownership: true,
        _count: {
          select: { embeddings: true },
        },
      },
      orderBy: { stars: 'desc' },
    });
  }

  /**
   * Get a specific repo
   */
  async findOne(id: string, orgId: string) {
    const repo = await this.prisma.repo.findFirst({
      where: {
        id,
        analysis: {
          project: { orgId },
        },
      },
      include: {
        analysis: {
          include: {
            project: true,
          },
        },
        ownership: true,
        embeddings: true,
      },
    });

    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    return repo;
  }

  /**
   * Get ownership information for a repo
   */
  async getOwnership(repoId: string, orgId: string) {
    // Verify repo belongs to org
    const repo = await this.prisma.repo.findFirst({
      where: {
        id: repoId,
        analysis: {
          project: { orgId },
        },
      },
    });

    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    return this.prisma.ownership.findMany({
      where: { repoId },
      orderBy: { share: 'desc' },
    });
  }
}
