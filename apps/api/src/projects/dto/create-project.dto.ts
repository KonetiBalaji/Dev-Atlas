// DevAtlas Create Project DTO
// Created by Balaji Koneti

import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'octocat', description: 'GitHub username or organization name' })
  @IsString()
  handle: string;

  @ApiProperty({ example: 'user', enum: ['user', 'org'], description: 'Type of GitHub entity' })
  @IsIn(['user', 'org'])
  type: string;

  @ApiProperty({ example: 'idle', description: 'Initial project status', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
