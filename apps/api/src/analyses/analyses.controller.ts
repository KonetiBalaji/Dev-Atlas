// DevAtlas Analyses Controller
// Created by Balaji Koneti

import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalysesService } from './analyses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Analysis, Project } from '@devatlas/db';

@ApiTags('analyses')
@Controller('analyses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Post('projects/:projectId/analyze')
  @ApiOperation({ summary: 'Start a new analysis for a project' })
  @ApiResponse({ status: 201, description: 'Analysis started successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  startAnalysis(@Param('projectId') projectId: string, @Request() req): Promise<Analysis> {
    return this.analysesService.startAnalysis(projectId, req.user.orgId);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get all analyses for a project' })
  @ApiResponse({ status: 200, description: 'Analyses retrieved successfully' })
  findByProject(@Param('projectId') projectId: string, @Request() req): Promise<Array<Analysis & { score: any; _count: { repos: number } }>> {
    return this.analysesService.findByProject(projectId, req.user.orgId);
  }

  @Get('projects/:projectId/latest')
  @ApiOperation({ summary: 'Get latest analysis for a project' })
  @ApiResponse({ status: 200, description: 'Latest analysis retrieved successfully' })
  findLatest(@Param('projectId') projectId: string, @Request() req): Promise<(Analysis & { score: any; repos: Array<any> }) | null> {
    return this.analysesService.findLatest(projectId, req.user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific analysis' })
  @ApiResponse({ status: 200, description: 'Analysis retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  findOne(@Param('id') id: string, @Request() req): Promise<Analysis & { project: Project; score: any; repos: Array<any> }> {
    return this.analysesService.findOne(id, req.user.orgId);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get analysis statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats(@Request() req): Promise<{ totalAnalyses: number; runningAnalyses: number; completedAnalyses: number }> {
    return this.analysesService.getStats(req.user.orgId);
  }
}
