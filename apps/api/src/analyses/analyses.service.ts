import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalysesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    return this.prisma.analysis.findUnique({
      where: { id },
      include: {
        project: true,
        score: true,
        repos: {
          include: {
            ownership: true,
            embeddings: true,
          },
        },
      },
    });
  }

  async getScore(id: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: {
        score: true,
      },
    });

    if (!analysis || !analysis.score) {
      return null;
    }

    return analysis.score;
  }

  async getRepos(id: string) {
    return this.prisma.repo.findMany({
      where: { analysisId: id },
      include: {
        ownership: true,
        embeddings: true,
      },
    });
  }
}
