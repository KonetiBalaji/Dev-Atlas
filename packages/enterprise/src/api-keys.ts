// DevAtlas API Keys Management
// Created by Balaji Koneti

import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { ApiKey, ApiKeyPermissions } from './types';

export class ApiKeyService {
  private readonly keyPrefix = 'da_';
  private readonly keyLength = 32;

  /**
   * Generate a new API key
   */
  generateApiKey(): string {
    const randomBytes = crypto.randomBytes(this.keyLength);
    const key = randomBytes.toString('hex');
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Hash API key for storage
   */
  async hashApiKey(key: string): Promise<string> {
    return bcrypt.hash(key, 12);
  }

  /**
   * Verify API key
   */
  async verifyApiKey(key: string, hashedKey: string): Promise<boolean> {
    return bcrypt.compare(key, hashedKey);
  }

  /**
   * Create API key permissions
   */
  createPermissions(permissions: Partial<ApiKeyPermissions>): ApiKeyPermissions {
    return {
      read: permissions.read ?? true,
      write: permissions.write ?? false,
      admin: permissions.admin ?? false,
      scopes: permissions.scopes ?? ['read'],
    };
  }

  /**
   * Validate API key permissions
   */
  validatePermissions(permissions: ApiKeyPermissions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (permissions.admin && !permissions.write) {
      errors.push('Admin permissions require write permissions');
    }

    if (permissions.write && !permissions.read) {
      errors.push('Write permissions require read permissions');
    }

    if (permissions.scopes.length === 0) {
      errors.push('At least one scope must be specified');
    }

    // Validate scope names
    const validScopes = ['read', 'write', 'admin', 'analyses', 'projects', 'repos', 'search'];
    for (const scope of permissions.scopes) {
      if (!validScopes.includes(scope)) {
        errors.push(`Invalid scope: ${scope}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check if API key has permission
   */
  hasPermission(permissions: ApiKeyPermissions, requiredPermission: string): boolean {
    switch (requiredPermission) {
      case 'read':
        return permissions.read;
      case 'write':
        return permissions.write;
      case 'admin':
        return permissions.admin;
      default:
        return permissions.scopes.includes(requiredPermission);
    }
  }

  /**
   * Check if API key has scope
   */
  hasScope(permissions: ApiKeyPermissions, scope: string): boolean {
    return permissions.scopes.includes(scope);
  }

  /**
   * Create API key object
   */
  createApiKey(
    orgId: string,
    name: string,
    permissions: ApiKeyPermissions,
    createdBy: string,
    expiresAt?: Date
  ): { apiKey: ApiKey; plainKey: string } {
    const plainKey = this.generateApiKey();
    const id = crypto.randomUUID();

    const apiKey: ApiKey = {
      id,
      orgId,
      name,
      key: plainKey, // This will be hashed before storage
      permissions: permissions.scopes,
      expiresAt,
      createdAt: new Date(),
      createdBy,
    };

    return { apiKey, plainKey };
  }

  /**
   * Mask API key for display
   */
  maskApiKey(key: string): string {
    if (key.length < 8) return '***';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Validate API key format
   */
  validateApiKeyFormat(key: string): { valid: boolean; error?: string } {
    if (!key.startsWith(this.keyPrefix)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    if (key.length !== this.keyPrefix.length + this.keyLength * 2) {
      return { valid: false, error: 'Invalid API key length' };
    }

    const keyPart = key.substring(this.keyPrefix.length);
    if (!/^[a-f0-9]+$/.test(keyPart)) {
      return { valid: false, error: 'Invalid API key characters' };
    }

    return { valid: true };
  }

  /**
   * Check if API key is expired
   */
  isExpired(apiKey: ApiKey): boolean {
    if (!apiKey.expiresAt) return false;
    return new Date() > apiKey.expiresAt;
  }

  /**
   * Get API key usage statistics
   */
  getUsageStats(apiKey: ApiKey): {
    daysSinceCreation: number;
    daysSinceLastUse: number;
    isExpired: boolean;
    expiresInDays?: number;
  } {
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - apiKey.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysSinceLastUse = apiKey.lastUsedAt
      ? Math.floor((now.getTime() - apiKey.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceCreation;

    const isExpired = this.isExpired(apiKey);

    const expiresInDays = apiKey.expiresAt
      ? Math.floor((apiKey.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      daysSinceCreation,
      daysSinceLastUse,
      isExpired,
      expiresInDays,
    };
  }

  /**
   * Generate API key report
   */
  generateReport(apiKeys: ApiKey[]): {
    total: number;
    active: number;
    expired: number;
    unused: number;
    byPermission: Record<string, number>;
    byScope: Record<string, number>;
  } {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const active = apiKeys.filter(key => !this.isExpired(key)).length;
    const expired = apiKeys.filter(key => this.isExpired(key)).length;
    const unused = apiKeys.filter(key => 
      !key.lastUsedAt || key.lastUsedAt < thirtyDaysAgo
    ).length;

    const byPermission: Record<string, number> = {};
    const byScope: Record<string, number> = {};

    for (const key of apiKeys) {
      // Count permissions
      if (key.permissions.includes('read')) {
        byPermission.read = (byPermission.read || 0) + 1;
      }
      if (key.permissions.includes('write')) {
        byPermission.write = (byPermission.write || 0) + 1;
      }
      if (key.permissions.includes('admin')) {
        byPermission.admin = (byPermission.admin || 0) + 1;
      }

      // Count scopes
      for (const scope of key.permissions) {
        byScope[scope] = (byScope[scope] || 0) + 1;
      }
    }

    return {
      total: apiKeys.length,
      active,
      expired,
      unused,
      byPermission,
      byScope,
    };
  }
}

