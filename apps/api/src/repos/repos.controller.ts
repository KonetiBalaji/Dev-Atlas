// DevAtlas Repos Controller
// Created by Balaji Koneti

import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReposService } from './repos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('repos')
@Controller('repos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Get('analyses/:analysisId')
  @ApiOperation({ summary: 'Get all repos for an analysis' })
  @ApiResponse({ status: 200, description: 'Repos retrieved successfully' })
  findByAnalysis(@Param('analysisId') analysisId: string, @Request() req) {
    return this.reposService.findByAnalysis(analysisId, req.user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific repo' })
  @ApiResponse({ status: 200, description: 'Repo retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Repo not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.reposService.findOne(id, req.user.orgId);
  }

  @Get(':id/ownership')
  @ApiOperation({ summary: 'Get ownership information for a repo' })
  @ApiResponse({ status: 200, description: 'Ownership retrieved successfully' })
  getOwnership(@Param('id') id: string, @Request() req) {
    return this.reposService.getOwnership(id, req.user.orgId);
  }
}
