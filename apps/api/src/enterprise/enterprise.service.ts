// DevAtlas Enterprise Service
// Created by Balaji Koneti

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyService, WeightProfileService, DataRetentionService, AuditLogger, SSOService } from '@devatlas/enterprise';
import { CreateApiKeyDto, CreateWeightProfileDto, CreateDataRetentionPolicyDto } from './dto/enterprise.dto';

@Injectable()
export class EnterpriseService {
  private apiKeyService: ApiKeyService;
  private weightProfileService: WeightProfileService;
  private dataRetentionService: DataRetentionService;
  private auditLogger: AuditLogger;
  private ssoService: SSOService;

  constructor(private readonly prisma: PrismaService) {
    this.apiKeyService = new ApiKeyService();
    this.weightProfileService = new WeightProfileService();
    this.dataRetentionService = new DataRetentionService();
    this.auditLogger = new AuditLogger();
    this.ssoService = new SSOService();
  }

  // API Keys Management
  async getApiKeys(orgId: string) {
    try {
      // In a real implementation, this would query the database
      // For now, return mock data
      return { apiKeys: [] };
    } catch (error) {
      throw new BadRequestException(`Failed to get API keys: ${error.message}`);
    }
  }

  async createApiKey(orgId: string, dto: CreateApiKeyDto, createdBy: string) {
    try {
      const { apiKey, plainKey } = this.apiKeyService.createApiKey(
        orgId,
        dto.name,
        this.apiKeyService.createPermissions(dto.permissions),
        createdBy,
        dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      );

      // In a real implementation, this would save to database
      // For now, just return the created key
      
      this.auditLogger.logConfigChange('api_key_created', {
        orgId,
        userId: createdBy,
        resourceId: apiKey.id,
        resourceType: 'api_key',
        newValue: { name: dto.name, permissions: dto.permissions },
      });

      return { apiKey, plainKey };
    } catch (error) {
      throw new BadRequestException(`Failed to create API key: ${error.message}`);
    }
  }

  async deleteApiKey(id: string, orgId: string) {
    try {
      const success = this.apiKeyService.deleteProfile(id);
      if (!success) {
        throw new NotFoundException('API key not found');
      }

      this.auditLogger.logConfigChange('api_key_deleted', {
        orgId,
        resourceId: id,
        resourceType: 'api_key',
      });

      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Failed to delete API key: ${error.message}`);
    }
  }

  // Weight Profiles Management
  async getWeightProfiles(orgId: string) {
    try {
      const profiles = this.weightProfileService.getProfilesForOrg(orgId);
      return { profiles };
    } catch (error) {
      throw new BadRequestException(`Failed to get weight profiles: ${error.message}`);
    }
  }

  async createWeightProfile(orgId: string, dto: CreateWeightProfileDto, createdBy: string) {
    try {
      const profile = this.weightProfileService.createProfile(
        orgId,
        dto.name,
        dto.description,
        dto.weights,
        createdBy,
      );

      this.auditLogger.logConfigChange('weight_profile_created', {
        orgId,
        userId: createdBy,
        resourceId: profile.id,
        resourceType: 'weight_profile',
        newValue: { name: dto.name, weights: dto.weights },
      });

      return { profile };
    } catch (error) {
      throw new BadRequestException(`Failed to create weight profile: ${error.message}`);
    }
  }

  async updateWeightProfile(id: string, updateData: Partial<CreateWeightProfileDto>, orgId: string, updatedBy: string) {
    try {
      const profile = this.weightProfileService.updateProfile(id, updateData, updatedBy);
      if (!profile) {
        throw new NotFoundException('Weight profile not found');
      }

      this.auditLogger.logConfigChange('weight_profile_updated', {
        orgId,
        userId: updatedBy,
        resourceId: id,
        resourceType: 'weight_profile',
        newValue: updateData,
      });

      return { profile };
    } catch (error) {
      throw new BadRequestException(`Failed to update weight profile: ${error.message}`);
    }
  }

  async deleteWeightProfile(id: string, orgId: string) {
    try {
      const success = this.weightProfileService.deleteProfile(id);
      if (!success) {
        throw new NotFoundException('Weight profile not found');
      }

      this.auditLogger.logConfigChange('weight_profile_deleted', {
        orgId,
        resourceId: id,
        resourceType: 'weight_profile',
      });

      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Failed to delete weight profile: ${error.message}`);
    }
  }

  // Data Retention Policies
  async getDataRetentionPolicies(orgId: string) {
    try {
      const policies = this.dataRetentionService.getPoliciesForOrg(orgId);
      return { policies };
    } catch (error) {
      throw new BadRequestException(`Failed to get data retention policies: ${error.message}`);
    }
  }

  async createDataRetentionPolicy(orgId: string, dto: CreateDataRetentionPolicyDto, createdBy: string) {
    try {
      const policy = this.dataRetentionService.createPolicy(
        orgId,
        dto.name,
        dto.description,
        dto.rules,
        createdBy,
      );

      this.auditLogger.logConfigChange('data_retention_policy_created', {
        orgId,
        userId: createdBy,
        resourceId: policy.id,
        resourceType: 'data_retention_policy',
        newValue: { name: dto.name, rules: dto.rules },
      });

      return { policy };
    } catch (error) {
      throw new BadRequestException(`Failed to create data retention policy: ${error.message}`);
    }
  }

  // Audit Logs
  async getAuditLogs(orgId: string, filters: any) {
    try {
      const logs = this.auditLogger.getLogs({
        orgId,
        ...filters,
      });

      const stats = this.auditLogger.getStats(orgId, filters.startDate, filters.endDate);

      return { logs, stats };
    } catch (error) {
      throw new BadRequestException(`Failed to get audit logs: ${error.message}`);
    }
  }

  // SSO Configuration
  async getSSOConfig(orgId: string) {
    try {
      const providers = this.ssoService.getAvailableProviders();
      return { providers };
    } catch (error) {
      throw new BadRequestException(`Failed to get SSO configuration: ${error.message}`);
    }
  }

  async testSSOConnection(provider: string) {
    try {
      const result = await this.ssoService.testConnection(provider);
      return result;
    } catch (error) {
      throw new BadRequestException(`Failed to test SSO connection: ${error.message}`);
    }
  }
}
