// DevAtlas Search Controller
// Created by Balaji Koneti

import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: 'Perform semantic search across repositories' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async search(@Body() body: { query: string; limit?: number }, @Request() req) {
    return this.searchService.semanticSearch(body.query, req.user.orgId, body.limit);
  }
}
