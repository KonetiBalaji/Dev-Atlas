import { Controller, Get, Param } from '@nestjs/common';
import { AnalysesService } from './analyses.service';

@Controller('analyses')
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.analysesService.findOne(id);
  }

  @Get(':id/score')
  getScore(@Param('id') id: string) {
    return this.analysesService.getScore(id);
  }

  @Get(':id/repos')
  getRepos(@Param('id') id: string) {
    return this.analysesService.getRepos(id);
  }
}
