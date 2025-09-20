import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('analysis') private readonly analysisQueue: Queue,
  ) {}

  create(createProjectDto: CreateProjectDto) {
    return this.prisma.project.create({
      data: createProjectDto,
    });
  }

  findAll(orgId?: string) {
    return this.prisma.project.findMany({
      where: orgId ? { orgId } : undefined,
      include: {
        analyses: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 1, // Get only the latest analysis
          include: {
            score: true,
            repos: {
              include: {
                ownership: true,
              },
            },
          },
        },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: {
            startedAt: 'desc',
          },
          include: {
            score: true,
            repos: {
              include: {
                ownership: true,
              },
            },
          },
        },
      },
    });
  }

  async getLatestAnalysis(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
          include: {
            score: true,
            repos: {
              include: {
                ownership: true,
              },
            },
          },
        },
      },
    });

    if (!project || project.analyses.length === 0) {
      return null;
    }

    return project.analyses[0];
  }

  async analyze(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new Error('Project not found');
    }

    // Add a job to the queue
    const job = await this.analysisQueue.add('analyze-project', {
      projectId: id,
    });

    // Update project status to "queued"
    await this.prisma.project.update({
      where: { id },
      data: { status: 'queued' },
    });

    return { message: 'Analysis has been queued.', jobId: job.id };
  }
}
