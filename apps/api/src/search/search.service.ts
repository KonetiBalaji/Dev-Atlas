import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from 'ai';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async search(query: string, limit: number = 5) {
    // For now, return a simple text search
    // In a real implementation, this would use vector similarity search
    const repos = await this.prisma.repo.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        analysis: {
          include: {
            project: true,
          },
        },
      },
      take: limit,
    });

    return {
      query,
      results: repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        url: repo.url,
        summary: repo.summary,
        project: repo.analysis.project.handle,
        score: (repo.analysis as any).score?.overall || 0,
      })),
    };
  }
}
