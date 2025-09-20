import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: { 
    email: string; 
    name?: string; 
    orgId: string; 
    role?: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    provider?: string;
  }) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query('orgId') orgId?: string) {
    if (orgId) {
      return this.usersService.findByOrg(orgId);
    }
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: { 
    name?: string; 
    role?: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  }) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
