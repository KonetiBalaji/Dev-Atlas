// DevAtlas Projects Service
// Created by Balaji Koneti

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new project
   */
  async create(createProjectDto: CreateProjectDto, orgId: string) {
    // Check if project already exists
    const existingProject = await this.prisma.project.findUnique({
      where: {
        orgId_handle: {
          orgId,
          handle: createProjectDto.handle,
        },
      },
    });

    if (existingProject) {
      throw new BadRequestException('Project with this handle already exists');
    }

    return this.prisma.project.create({
      data: {
        ...createProjectDto,
        orgId,
      },
      include: {
        analyses: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Get all projects for an organization
   */
  async findAll(orgId: string) {
    return this.prisma.project.findMany({
      where: { orgId },
      include: {
        analyses: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { analyses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific project
   */
  async findOne(id: string, orgId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, orgId },
      include: {
        analyses: {
          orderBy: { startedAt: 'desc' },
          include: {
            score: true,
            _count: {
              select: { repos: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  /**
   * Update a project
   */
  async update(id: string, updateProjectDto: UpdateProjectDto, orgId: string) {
    const project = await this.findOne(id, orgId);

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  /**
   * Delete a project
   */
  async remove(id: string, orgId: string) {
    const project = await this.findOne(id, orgId);

    return this.prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Get project statistics
   */
  async getStats(orgId: string) {
    const [totalProjects, activeProjects, totalAnalyses] = await Promise.all([
      this.prisma.project.count({ where: { orgId } }),
      this.prisma.project.count({ where: { orgId, status: 'analyzing' } }),
      this.prisma.analysis.count({
        where: {
          project: { orgId },
        },
      }),
    ]);

    return {
      totalProjects,
      activeProjects,
      totalAnalyses,
    };
  }
}
