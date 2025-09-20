import { Controller, Get, Param } from '@nestjs/common';
import { ReposService } from './repos.service';

@Controller('repos')
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Get(':id/ownership')
  getOwnership(@Param('id') id: string) {
    return this.reposService.getOwnership(id);
  }
}
