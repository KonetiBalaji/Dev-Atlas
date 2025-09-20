import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrgsService } from './orgs.service';

@Controller('orgs')
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Post()
  create(@Body() createOrgDto: { name: string; stripeId?: string }) {
    return this.orgsService.create(createOrgDto);
  }

  @Get()
  findAll() {
    return this.orgsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orgsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrgDto: { name?: string; stripeId?: string }) {
    return this.orgsService.update(id, updateOrgDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orgsService.remove(id);
  }
}
