// DevAtlas Audit Logging
// Created by Balaji Koneti

import { AuditLog, AuditLogLevel, AuditLogCategory } from './types';

export class AuditLogger {
  private logs: AuditLog[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  /**
   * Log an audit event
   */
  log(
    level: AuditLogLevel,
    category: AuditLogCategory,
    action: string,
    details: {
      orgId?: string;
      userId?: string;
      resourceId?: string;
      resourceType?: string;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): void {
    const log: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      action,
      orgId: details.orgId,
      userId: details.userId,
      resourceId: details.resourceId,
      resourceType: details.resourceType,
      metadata: details.metadata || {},
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
    };

    this.logs.push(log);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, this would also write to persistent storage
    console.log(`[AUDIT] ${level.toUpperCase()} ${category}: ${action}`, {
      orgId: details.orgId,
      userId: details.userId,
      resourceId: details.resourceId,
    });
  }

  /**
   * Log authentication events
   */
  logAuth(
    action: string,
    details: {
      orgId?: string;
      userId?: string;
      success: boolean;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.log(
      details.success ? 'info' : 'warn',
      'authentication',
      action,
      {
        ...details,
        metadata: {
          ...details.metadata,
          success: details.success,
        },
      }
    );
  }

  /**
   * Log data access events
   */
  logDataAccess(
    action: string,
    details: {
      orgId: string;
      userId?: string;
      resourceId: string;
      resourceType: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.log('info', 'data_access', action, details);
  }

  /**
   * Log configuration changes
   */
  logConfigChange(
    action: string,
    details: {
      orgId: string;
      userId: string;
      resourceId: string;
      resourceType: string;
      oldValue?: any;
      newValue?: any;
      ipAddress?: string;
      userAgent?: string;
    }
  ): void {
    this.log('info', 'configuration', action, {
      ...details,
      metadata: {
        oldValue: details.oldValue,
        newValue: details.newValue,
      },
    });
  }

  /**
   * Log security events
   */
  logSecurity(
    action: string,
    details: {
      orgId?: string;
      userId?: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    const level: AuditLogLevel = 
      details.severity === 'critical' || details.severity === 'high' 
        ? 'error' 
        : details.severity === 'medium' 
        ? 'warn' 
        : 'info';

    this.log(level, 'security', action, {
      ...details,
      metadata: {
        ...details.metadata,
        severity: details.severity,
      },
    });
  }

  /**
   * Log system events
   */
  logSystem(
    action: string,
    details: {
      level: AuditLogLevel;
      metadata?: Record<string, any>;
    }
  ): void {
    this.log(details.level, 'system', action, {
      metadata: details.metadata,
    });
  }

  /**
   * Get audit logs with filtering
   */
  getLogs(filters: {
    orgId?: string;
    userId?: string;
    category?: AuditLogCategory;
    level?: AuditLogLevel;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): AuditLog[] {
    let filteredLogs = [...this.logs];

    if (filters.orgId) {
      filteredLogs = filteredLogs.filter(log => log.orgId === filters.orgId);
    }

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }

    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;

    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Get audit log statistics
   */
  getStats(orgId?: string, startDate?: Date, endDate?: Date): {
    total: number;
    byLevel: Record<AuditLogLevel, number>;
    byCategory: Record<AuditLogCategory, number>;
    byAction: Record<string, number>;
    recentActivity: number;
  } {
    let logs = this.logs;

    if (orgId) {
      logs = logs.filter(log => log.orgId === orgId);
    }

    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }

    if (endDate) {
      logs = logs.filter(log => log.timestamp <= endDate);
    }

    const byLevel: Record<AuditLogLevel, number> = {
      info: 0,
      warn: 0,
      error: 0,
    };

    const byCategory: Record<AuditLogCategory, number> = {
      authentication: 0,
      data_access: 0,
      configuration: 0,
      security: 0,
      system: 0,
    };

    const byAction: Record<string, number> = {};

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let recentActivity = 0;

    for (const log of logs) {
      byLevel[log.level]++;
      byCategory[log.category]++;
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      if (log.timestamp > oneHourAgo) {
        recentActivity++;
      }
    }

    return {
      total: logs.length,
      byLevel,
      byCategory,
      byAction,
      recentActivity,
    };
  }

  /**
   * Search audit logs
   */
  searchLogs(query: string, filters?: {
    orgId?: string;
    category?: AuditLogCategory;
    level?: AuditLogLevel;
    startDate?: Date;
    endDate?: Date;
  }): AuditLog[] {
    let logs = this.getLogs(filters || {});

    if (!query.trim()) {
      return logs;
    }

    const searchTerm = query.toLowerCase();
    return logs.filter(log => 
      log.action.toLowerCase().includes(searchTerm) ||
      log.resourceType?.toLowerCase().includes(searchTerm) ||
      log.userId?.toLowerCase().includes(searchTerm) ||
      JSON.stringify(log.metadata).toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Export audit logs
   */
  exportLogs(filters: {
    orgId?: string;
    startDate?: Date;
    endDate?: Date;
    format: 'json' | 'csv';
  }): string {
    const logs = this.getLogs(filters);

    if (filters.format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = [
      'timestamp',
      'level',
      'category',
      'action',
      'orgId',
      'userId',
      'resourceId',
      'resourceType',
      'ipAddress',
      'userAgent',
      'metadata',
    ];

    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      log.category,
      log.action,
      log.orgId || '',
      log.userId || '',
      log.resourceId || '',
      log.resourceType || '',
      log.ipAddress || '',
      log.userAgent || '',
      JSON.stringify(log.metadata),
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  /**
   * Clear old audit logs
   */
  clearOldLogs(olderThan: Date): number {
    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > olderThan);
    return initialCount - this.logs.length;
  }

  /**
   * Generate unique ID for audit log
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

