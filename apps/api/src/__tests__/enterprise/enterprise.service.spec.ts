// DevAtlas Enterprise Service Tests
// Created by Balaji Koneti

import { Test, TestingModule } from '@nestjs/testing';
import { EnterpriseService } from '../enterprise.service';
import { PrismaService } from '@devatlas/db';
import { AuditLogger } from '@devatlas/enterprise';

describe('EnterpriseService', () => {
  let service: EnterpriseService;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;

  beforeEach(async () => {
    mockPrisma = {
      apiKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      weightProfile: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      dataRetentionPolicy: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    mockAuditLogger = {
      log: jest.fn(),
      getLogs: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnterpriseService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditLogger,
          useValue: mockAuditLogger,
        },
      ],
    }).compile();

    service = module.get<EnterpriseService>(EnterpriseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createApiKey', () => {
    it('should create an API key', async () => {
      const mockApiKey = {
        id: 'key_123',
        name: 'Test API Key',
        key: 'sk_test_123',
        orgId: 'org_123',
        createdAt: new Date(),
      };

      mockPrisma.apiKey.create.mockResolvedValue(mockApiKey as any);

      const result = await service.createApiKey({
        orgId: 'org_123',
        name: 'Test API Key',
        permissions: ['read', 'write'],
      });

      expect(result).toEqual(mockApiKey);
      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          name: 'Test API Key',
          key: expect.any(String),
          orgId: 'org_123',
          permissions: ['read', 'write'],
        },
      });
    });
  });

  describe('getApiKeys', () => {
    it('should retrieve API keys for organization', async () => {
      const mockApiKeys = [
        {
          id: 'key_123',
          name: 'Test API Key',
          key: 'sk_test_123',
          orgId: 'org_123',
          createdAt: new Date(),
        },
      ];

      mockPrisma.apiKey.findMany.mockResolvedValue(mockApiKeys as any);

      const result = await service.getApiKeys('org_123');

      expect(result).toEqual(mockApiKeys);
      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org_123' },
        select: {
          id: true,
          name: true,
          permissions: true,
          createdAt: true,
          lastUsedAt: true,
        },
      });
    });
  });

  describe('deleteApiKey', () => {
    it('should delete an API key', async () => {
      mockPrisma.apiKey.delete.mockResolvedValue({} as any);

      await service.deleteApiKey('key_123', 'org_123');

      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: {
          id: 'key_123',
          orgId: 'org_123',
        },
      });
    });
  });

  describe('createWeightProfile', () => {
    it('should create a weight profile', async () => {
      const mockProfile = {
        id: 'profile_123',
        name: 'Custom Profile',
        weights: {
          craft: 0.3,
          reliability: 0.25,
          documentation: 0.2,
          security: 0.15,
          impact: 0.1,
        },
        orgId: 'org_123',
      };

      mockPrisma.weightProfile.create.mockResolvedValue(mockProfile as any);

      const result = await service.createWeightProfile({
        orgId: 'org_123',
        name: 'Custom Profile',
        weights: {
          craft: 0.3,
          reliability: 0.25,
          documentation: 0.2,
          security: 0.15,
          impact: 0.1,
        },
      });

      expect(result).toEqual(mockProfile);
      expect(mockPrisma.weightProfile.create).toHaveBeenCalledWith({
        data: {
          name: 'Custom Profile',
          weights: {
            craft: 0.3,
            reliability: 0.25,
            documentation: 0.2,
            security: 0.15,
            impact: 0.1,
          },
          orgId: 'org_123',
        },
      });
    });
  });

  describe('getWeightProfiles', () => {
    it('should retrieve weight profiles for organization', async () => {
      const mockProfiles = [
        {
          id: 'profile_123',
          name: 'Custom Profile',
          weights: {
            craft: 0.3,
            reliability: 0.25,
            documentation: 0.2,
            security: 0.15,
            impact: 0.1,
          },
          orgId: 'org_123',
        },
      ];

      mockPrisma.weightProfile.findMany.mockResolvedValue(mockProfiles as any);

      const result = await service.getWeightProfiles('org_123');

      expect(result).toEqual(mockProfiles);
      expect(mockPrisma.weightProfile.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org_123' },
      });
    });
  });

  describe('createDataRetentionPolicy', () => {
    it('should create a data retention policy', async () => {
      const mockPolicy = {
        id: 'policy_123',
        name: 'Standard Policy',
        retentionDays: 365,
        orgId: 'org_123',
      };

      mockPrisma.dataRetentionPolicy.create.mockResolvedValue(mockPolicy as any);

      const result = await service.createDataRetentionPolicy({
        orgId: 'org_123',
        name: 'Standard Policy',
        retentionDays: 365,
        dataTypes: ['analyses', 'repos'],
      });

      expect(result).toEqual(mockPolicy);
      expect(mockPrisma.dataRetentionPolicy.create).toHaveBeenCalledWith({
        data: {
          name: 'Standard Policy',
          retentionDays: 365,
          dataTypes: ['analyses', 'repos'],
          orgId: 'org_123',
        },
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs', async () => {
      const mockLogs = [
        {
          id: 'log_123',
          action: 'api_key.created',
          userId: 'user_123',
          orgId: 'org_123',
          metadata: { keyId: 'key_123' },
          createdAt: new Date(),
        },
      ];

      mockAuditLogger.getLogs.mockResolvedValue(mockLogs as any);

      const result = await service.getAuditLogs('org_123', {
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockLogs);
      expect(mockAuditLogger.getLogs).toHaveBeenCalledWith('org_123', {
        limit: 10,
        offset: 0,
      });
    });
  });
});
