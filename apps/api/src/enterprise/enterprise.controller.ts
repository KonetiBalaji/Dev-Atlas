// DevAtlas Enterprise Controller
// Created by Balaji Koneti

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnterpriseService } from './enterprise.service';
import { CreateApiKeyDto, CreateWeightProfileDto, CreateDataRetentionPolicyDto } from './dto/enterprise.dto';

@ApiTags('enterprise')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  // API Keys Management
  @Get('api-keys')
  @ApiOperation({ summary: 'Get organization API keys' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  async getApiKeys(@Request() req: any) {
    return this.enterpriseService.getApiKeys(req.user.orgId);
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async createApiKey(
    @Body() createApiKeyDto: CreateApiKeyDto,
    @Request() req: any,
  ) {
    return this.enterpriseService.createApiKey(req.user.orgId, createApiKeyDto, req.user.id);
  }

  @Delete('api-keys/:id')
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 200, description: 'API key deleted successfully' })
  async deleteApiKey(@Param('id') id: string, @Request() req: any) {
    return this.enterpriseService.deleteApiKey(id, req.user.orgId);
  }

  // Weight Profiles Management
  @Get('weight-profiles')
  @ApiOperation({ summary: 'Get organization weight profiles' })
  @ApiResponse({ status: 200, description: 'Weight profiles retrieved successfully' })
  async getWeightProfiles(@Request() req: any) {
    return this.enterpriseService.getWeightProfiles(req.user.orgId);
  }

  @Post('weight-profiles')
  @ApiOperation({ summary: 'Create new weight profile' })
  @ApiResponse({ status: 201, description: 'Weight profile created successfully' })
  async createWeightProfile(
    @Body() createWeightProfileDto: CreateWeightProfileDto,
    @Request() req: any,
  ) {
    return this.enterpriseService.createWeightProfile(req.user.orgId, createWeightProfileDto, req.user.id);
  }

  @Put('weight-profiles/:id')
  @ApiOperation({ summary: 'Update weight profile' })
  @ApiResponse({ status: 200, description: 'Weight profile updated successfully' })
  async updateWeightProfile(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateWeightProfileDto>,
    @Request() req: any,
  ) {
    return this.enterpriseService.updateWeightProfile(id, updateData, req.user.orgId, req.user.id);
  }

  @Delete('weight-profiles/:id')
  @ApiOperation({ summary: 'Delete weight profile' })
  @ApiResponse({ status: 200, description: 'Weight profile deleted successfully' })
  async deleteWeightProfile(@Param('id') id: string, @Request() req: any) {
    return this.enterpriseService.deleteWeightProfile(id, req.user.orgId);
  }

  // Data Retention Policies
  @Get('data-retention')
  @ApiOperation({ summary: 'Get organization data retention policies' })
  @ApiResponse({ status: 200, description: 'Data retention policies retrieved successfully' })
  async getDataRetentionPolicies(@Request() req: any) {
    return this.enterpriseService.getDataRetentionPolicies(req.user.orgId);
  }

  @Post('data-retention')
  @ApiOperation({ summary: 'Create new data retention policy' })
  @ApiResponse({ status: 201, description: 'Data retention policy created successfully' })
  async createDataRetentionPolicy(
    @Body() createDataRetentionPolicyDto: CreateDataRetentionPolicyDto,
    @Request() req: any,
  ) {
    return this.enterpriseService.createDataRetentionPolicy(req.user.orgId, createDataRetentionPolicyDto, req.user.id);
  }

  // Audit Logs
  @Get('audit-logs')
  @ApiOperation({ summary: 'Get organization audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async getAuditLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Request() req?: any,
  ) {
    return this.enterpriseService.getAuditLogs(req.user.orgId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      action,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  // SSO Configuration
  @Get('sso')
  @ApiOperation({ summary: 'Get SSO configuration' })
  @ApiResponse({ status: 200, description: 'SSO configuration retrieved successfully' })
  async getSSOConfig(@Request() req: any) {
    return this.enterpriseService.getSSOConfig(req.user.orgId);
  }

  @Post('sso/test')
  @ApiOperation({ summary: 'Test SSO connection' })
  @ApiResponse({ status: 200, description: 'SSO connection tested successfully' })
  async testSSOConnection(@Body() body: { provider: string }, @Request() req: any) {
    return this.enterpriseService.testSSOConnection(body.provider);
  }
}
