// DevAtlas Data Retention Management
// Created by Balaji Koneti

import { DataRetentionPolicy, RetentionRule } from './types';

export class DataRetentionService {
  private policies: Map<string, DataRetentionPolicy> = new Map();

  /**
   * Create a new data retention policy
   */
  createPolicy(
    orgId: string,
    name: string,
    description: string,
    rules: RetentionRule[],
    createdBy: string
  ): DataRetentionPolicy {
    const policy: DataRetentionPolicy = {
      id: this.generateId(),
      orgId,
      name,
      description,
      rules,
      isActive: true,
      createdAt: new Date(),
      createdBy,
      updatedAt: new Date(),
      updatedBy: createdBy,
    };

    this.policies.set(policy.id, policy);
    return policy;
  }

  /**
   * Get default data retention policy
   */
  getDefaultPolicy(): DataRetentionPolicy {
    return {
      id: 'default',
      orgId: 'system',
      name: 'Default Retention',
      description: 'Default data retention policy',
      rules: [
        {
          dataType: 'analysis_results',
          retentionPeriod: 365, // 1 year
          action: 'delete',
        },
        {
          dataType: 'audit_logs',
          retentionPeriod: 90, // 3 months
          action: 'archive',
        },
        {
          dataType: 'user_sessions',
          retentionPeriod: 30, // 1 month
          action: 'delete',
        },
        {
          dataType: 'temp_files',
          retentionPeriod: 7, // 1 week
          action: 'delete',
        },
      ],
      isActive: true,
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }

  /**
   * Get data retention policy by ID
   */
  getPolicy(policyId: string): DataRetentionPolicy | null {
    if (policyId === 'default') {
      return this.getDefaultPolicy();
    }
    return this.policies.get(policyId) || null;
  }

  /**
   * Get policies for organization
   */
  getPoliciesForOrg(orgId: string): DataRetentionPolicy[] {
    return Array.from(this.policies.values())
      .filter(policy => policy.orgId === orgId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update data retention policy
   */
  updatePolicy(
    policyId: string,
    updates: {
      name?: string;
      description?: string;
      rules?: RetentionRule[];
      isActive?: boolean;
    },
    updatedBy: string
  ): DataRetentionPolicy | null {
    const policy = this.getPolicy(policyId);
    if (!policy || policy.id === 'default') {
      return null;
    }

    const updatedPolicy: DataRetentionPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
      updatedBy,
    };

    this.policies.set(policyId, updatedPolicy);
    return updatedPolicy;
  }

  /**
   * Delete data retention policy
   */
  deletePolicy(policyId: string): boolean {
    const policy = this.getPolicy(policyId);
    if (!policy || policy.id === 'default') {
      return false;
    }

    return this.policies.delete(policyId);
  }

  /**
   * Validate retention policy
   */
  validatePolicy(policy: DataRetentionPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!policy.name.trim()) {
      errors.push('Policy name is required');
    }

    if (!policy.description.trim()) {
      errors.push('Policy description is required');
    }

    if (policy.rules.length === 0) {
      errors.push('At least one retention rule is required');
    }

    // Validate rules
    for (const rule of policy.rules) {
      if (!rule.dataType.trim()) {
        errors.push('Data type is required for all rules');
      }

      if (rule.retentionPeriod <= 0) {
        errors.push('Retention period must be positive');
      }

      if (rule.retentionPeriod > 3650) { // 10 years
        errors.push('Retention period cannot exceed 10 years');
      }

      if (!['delete', 'archive', 'anonymize'].includes(rule.action)) {
        errors.push('Invalid action. Must be delete, archive, or anonymize');
      }
    }

    // Check for duplicate data types
    const dataTypes = policy.rules.map(rule => rule.dataType);
    const uniqueDataTypes = new Set(dataTypes);
    if (dataTypes.length !== uniqueDataTypes.size) {
      errors.push('Duplicate data types are not allowed');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Apply retention policy to data
   */
  async applyRetentionPolicy(
    policyId: string,
    dataType: string,
    dryRun: boolean = false
  ): Promise<{
    success: boolean;
    processed: number;
    deleted: number;
    archived: number;
    anonymized: number;
    errors: string[];
  }> {
    const policy = this.getPolicy(policyId);
    if (!policy) {
      return {
        success: false,
        processed: 0,
        deleted: 0,
        archived: 0,
        anonymized: 0,
        errors: ['Policy not found'],
      };
    }

    const rule = policy.rules.find(r => r.dataType === dataType);
    if (!rule) {
      return {
        success: false,
        processed: 0,
        deleted: 0,
        archived: 0,
        anonymized: 0,
        errors: [`No rule found for data type: ${dataType}`],
      };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - rule.retentionPeriod);

    const errors: string[] = [];
    let processed = 0;
    let deleted = 0;
    let archived = 0;
    let anonymized = 0;

    try {
      // In a real implementation, this would query the database
      // to find records older than the cutoff date
      const oldRecords = await this.findOldRecords(dataType, cutoffDate);

      for (const record of oldRecords) {
        processed++;

        if (dryRun) {
          // Just count what would be affected
          switch (rule.action) {
            case 'delete':
              deleted++;
              break;
            case 'archive':
              archived++;
              break;
            case 'anonymize':
              anonymized++;
              break;
          }
        } else {
          // Actually perform the action
          try {
            switch (rule.action) {
              case 'delete':
                await this.deleteRecord(record);
                deleted++;
                break;
              case 'archive':
                await this.archiveRecord(record);
                archived++;
                break;
              case 'anonymize':
                await this.anonymizeRecord(record);
                anonymized++;
                break;
            }
          } catch (error) {
            errors.push(`Failed to process record ${record.id}: ${error}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to find old records: ${error}`);
    }

    return {
      success: errors.length === 0,
      processed,
      deleted,
      archived,
      anonymized,
      errors,
    };
  }

  /**
   * Get retention policy statistics
   */
  getRetentionStats(policyId: string): {
    totalRules: number;
    dataTypes: string[];
    oldestRetention: number;
    newestRetention: number;
    averageRetention: number;
  } {
    const policy = this.getPolicy(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    const retentionPeriods = policy.rules.map(rule => rule.retentionPeriod);
    const dataTypes = policy.rules.map(rule => rule.dataType);

    return {
      totalRules: policy.rules.length,
      dataTypes,
      oldestRetention: Math.max(...retentionPeriods),
      newestRetention: Math.min(...retentionPeriods),
      averageRetention: retentionPeriods.reduce((sum, period) => sum + period, 0) / retentionPeriods.length,
    };
  }

  /**
   * Schedule retention policy execution
   */
  scheduleRetentionExecution(
    policyId: string,
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string; // HH:MM format
      timezone: string;
    }
  ): { success: boolean; jobId?: string; error?: string } {
    try {
      // In a real implementation, this would create a scheduled job
      // using a job queue system like BullMQ
      const jobId = `retention_${policyId}_${Date.now()}`;
      
      // Schedule the job
      console.log(`Scheduled retention policy ${policyId} to run ${schedule.frequency} at ${schedule.time} ${schedule.timezone}`);
      
      return { success: true, jobId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get retention policy execution history
   */
  getExecutionHistory(policyId: string, limit: number = 50): Array<{
    id: string;
    executedAt: Date;
    dataType: string;
    processed: number;
    deleted: number;
    archived: number;
    anonymized: number;
    success: boolean;
    errors: string[];
  }> {
    // In a real implementation, this would query the database
    // for execution history records
    return [];
  }

  /**
   * Find old records for retention processing
   */
  private async findOldRecords(dataType: string, cutoffDate: Date): Promise<any[]> {
    // In a real implementation, this would query the database
    // based on the data type and cutoff date
    return [];
  }

  /**
   * Delete a record
   */
  private async deleteRecord(record: any): Promise<void> {
    // In a real implementation, this would delete the record from the database
    console.log(`Deleting record ${record.id}`);
  }

  /**
   * Archive a record
   */
  private async archiveRecord(record: any): Promise<void> {
    // In a real implementation, this would move the record to an archive table
    console.log(`Archiving record ${record.id}`);
  }

  /**
   * Anonymize a record
   */
  private async anonymizeRecord(record: any): Promise<void> {
    // In a real implementation, this would anonymize sensitive data
    console.log(`Anonymizing record ${record.id}`);
  }

  /**
   * Generate unique ID for retention policy
   */
  private generateId(): string {
    return `dr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

