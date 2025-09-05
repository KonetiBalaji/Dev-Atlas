// DevAtlas Enterprise DTOs
// Created by Balaji Koneti

import { IsString, IsArray, IsNumber, IsOptional, IsDateString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyPermissionsDto {
  @ApiProperty({ description: 'Read permission' })
  @IsNumber()
  read: number;

  @ApiProperty({ description: 'Write permission' })
  @IsNumber()
  write: number;

  @ApiProperty({ description: 'Admin permission' })
  @IsNumber()
  admin: number;

  @ApiProperty({ description: 'Scopes' })
  @IsArray()
  @IsString({ each: true })
  scopes: string[];
}

export class CreateApiKeyDto {
  @ApiProperty({ description: 'API key name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'API key permissions' })
  @ValidateNested()
  @Type(() => ApiKeyPermissionsDto)
  permissions: ApiKeyPermissionsDto;

  @ApiProperty({ description: 'Expiration date', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ScoringWeightsDto {
  @ApiProperty({ description: 'Craft weight' })
  @IsNumber()
  craft: number;

  @ApiProperty({ description: 'Reliability weight' })
  @IsNumber()
  reliability: number;

  @ApiProperty({ description: 'Documentation weight' })
  @IsNumber()
  documentation: number;

  @ApiProperty({ description: 'Security weight' })
  @IsNumber()
  security: number;

  @ApiProperty({ description: 'Impact weight' })
  @IsNumber()
  impact: number;

  @ApiProperty({ description: 'Collaboration weight' })
  @IsNumber()
  collaboration: number;
}

export class CreateWeightProfileDto {
  @ApiProperty({ description: 'Profile name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Profile description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Scoring weights' })
  @ValidateNested()
  @Type(() => ScoringWeightsDto)
  weights: ScoringWeightsDto;
}

export class DataRetentionRuleDto {
  @ApiProperty({ description: 'Data type' })
  @IsString()
  dataType: string;

  @ApiProperty({ description: 'Retention period in days' })
  @IsNumber()
  retentionPeriod: number;

  @ApiProperty({ description: 'Action (delete, archive, anonymize)' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Additional conditions', required: false })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;
}

export class CreateDataRetentionPolicyDto {
  @ApiProperty({ description: 'Policy name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Policy description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Retention rules' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataRetentionRuleDto)
  rules: DataRetentionRuleDto[];
}
