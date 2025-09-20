import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Query('orgId') orgId?: string) {
    return this.projectsService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Get(':id/analyses/latest')
  getLatestAnalysis(@Param('id') id: string) {
    return this.projectsService.getLatestAnalysis(id);
  }

  @Post()
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Post(':id/analyze')
  analyze(@Param('id') id: string) {
    return this.projectsService.analyze(id);
  }
}
