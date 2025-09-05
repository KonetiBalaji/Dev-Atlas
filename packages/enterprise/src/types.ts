// DevAtlas Enterprise Types
// Created by Balaji Koneti

import { z } from 'zod';

export const SSOConfigSchema = z.object({
  provider: z.enum(['saml', 'oidc', 'oauth2']),
  name: z.string(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.any()),
});

export const ApiKeySchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  key: z.string(),
  permissions: z.array(z.string()),
  expiresAt: z.date().optional(),
  lastUsedAt: z.date().optional(),
  createdAt: z.date(),
  createdBy: z.string(),
});

export const AuditLogSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string().optional(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  metadata: z.record(z.string(), z.any()),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.date(),
});

export const DataRetentionPolicySchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string(),
  rules: z.array(z.object({
    resourceType: z.string(),
    ttl: z.number(), // in days
    conditions: z.record(z.string(), z.any()).optional(),
  })),
  enabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CustomWeightProfileSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  description: z.string(),
  weights: z.object({
    craft: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    documentation: z.number().min(0).max(1),
    security: z.number().min(0).max(1),
    impact: z.number().min(0).max(1),
    collaboration: z.number().min(0).max(1),
  }),
  enabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SSOConfig = z.infer<typeof SSOConfigSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type DataRetentionPolicy = z.infer<typeof DataRetentionPolicySchema>;
export type CustomWeightProfile = z.infer<typeof CustomWeightProfileSchema>;

export interface SSOProvider {
  name: string;
  type: 'saml' | 'oidc' | 'oauth2';
  config: Record<string, any>;
  enabled: boolean;
}

export interface ApiKeyPermissions {
  read: boolean;
  write: boolean;
  admin: boolean;
  scopes: string[];
}

export interface AuditLogFilter {
  orgId: string;
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface DataRetentionRule {
  resourceType: string;
  ttl: number; // in days
  conditions?: Record<string, any>;
}

export interface ScoringWeights {
  craft: number;
  reliability: number;
  documentation: number;
  security: number;
  impact: number;
  collaboration: number;
}

