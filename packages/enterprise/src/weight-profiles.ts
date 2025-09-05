// DevAtlas Custom Weight Profiles
// Created by Balaji Koneti

import { WeightProfile, ScoringWeights } from './types';

export class WeightProfileService {
  private profiles: Map<string, WeightProfile> = new Map();

  /**
   * Create a new weight profile
   */
  createProfile(
    orgId: string,
    name: string,
    description: string,
    weights: ScoringWeights,
    createdBy: string
  ): WeightProfile {
    const profile: WeightProfile = {
      id: this.generateId(),
      orgId,
      name,
      description,
      weights,
      isDefault: false,
      createdAt: new Date(),
      createdBy,
      updatedAt: new Date(),
      updatedBy: createdBy,
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  /**
   * Get default weight profile
   */
  getDefaultProfile(): WeightProfile {
    return {
      id: 'default',
      orgId: 'system',
      name: 'Default',
      description: 'Default scoring weights',
      weights: {
        craft: 0.25,
        reliability: 0.25,
        documentation: 0.15,
        security: 0.20,
        impact: 0.10,
        collaboration: 0.05,
      },
      isDefault: true,
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }

  /**
   * Get weight profile by ID
   */
  getProfile(profileId: string): WeightProfile | null {
    if (profileId === 'default') {
      return this.getDefaultProfile();
    }
    return this.profiles.get(profileId) || null;
  }

  /**
   * Get profiles for organization
   */
  getProfilesForOrg(orgId: string): WeightProfile[] {
    const orgProfiles = Array.from(this.profiles.values())
      .filter(profile => profile.orgId === orgId)
      .sort((a, b) => a.name.localeCompare(b.name));

    return [this.getDefaultProfile(), ...orgProfiles];
  }

  /**
   * Update weight profile
   */
  updateProfile(
    profileId: string,
    updates: {
      name?: string;
      description?: string;
      weights?: Partial<ScoringWeights>;
    },
    updatedBy: string
  ): WeightProfile | null {
    const profile = this.getProfile(profileId);
    if (!profile || profile.isDefault) {
      return null;
    }

    const updatedProfile: WeightProfile = {
      ...profile,
      ...updates,
      weights: { ...profile.weights, ...updates.weights },
      updatedAt: new Date(),
      updatedBy,
    };

    this.profiles.set(profileId, updatedProfile);
    return updatedProfile;
  }

  /**
   * Delete weight profile
   */
  deleteProfile(profileId: string): boolean {
    const profile = this.getProfile(profileId);
    if (!profile || profile.isDefault) {
      return false;
    }

    return this.profiles.delete(profileId);
  }

  /**
   * Validate weight profile
   */
  validateProfile(weights: ScoringWeights): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

    // Check if weights sum to 1.0 (within tolerance)
    if (Math.abs(total - 1.0) > 0.001) {
      errors.push(`Weights must sum to 1.0, got ${total.toFixed(3)}`);
    }

    // Check individual weight ranges
    for (const [key, weight] of Object.entries(weights)) {
      if (weight < 0) {
        errors.push(`${key} weight cannot be negative`);
      }
      if (weight > 1) {
        errors.push(`${key} weight cannot be greater than 1`);
      }
    }

    // Check for reasonable weight distribution
    const maxWeight = Math.max(...Object.values(weights));
    if (maxWeight > 0.5) {
      errors.push('No single weight should be greater than 0.5');
    }

    const minWeight = Math.min(...Object.values(weights));
    if (minWeight < 0.01) {
      errors.push('All weights should be at least 0.01');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create preset weight profiles
   */
  createPresetProfiles(orgId: string, createdBy: string): WeightProfile[] {
    const presets = [
      {
        name: 'Security Focused',
        description: 'Emphasizes security and reliability',
        weights: {
          craft: 0.20,
          reliability: 0.30,
          documentation: 0.10,
          security: 0.30,
          impact: 0.05,
          collaboration: 0.05,
        },
      },
      {
        name: 'Documentation Focused',
        description: 'Emphasizes documentation and collaboration',
        weights: {
          craft: 0.20,
          reliability: 0.20,
          documentation: 0.30,
          security: 0.15,
          impact: 0.10,
          collaboration: 0.05,
        },
      },
      {
        name: 'Impact Focused',
        description: 'Emphasizes impact and collaboration',
        weights: {
          craft: 0.15,
          reliability: 0.20,
          documentation: 0.10,
          security: 0.15,
          impact: 0.25,
          collaboration: 0.15,
        },
      },
      {
        name: 'Craft Focused',
        description: 'Emphasizes code quality and craftsmanship',
        weights: {
          craft: 0.40,
          reliability: 0.25,
          documentation: 0.15,
          security: 0.15,
          impact: 0.03,
          collaboration: 0.02,
        },
      },
    ];

    return presets.map(preset => 
      this.createProfile(orgId, preset.name, preset.description, preset.weights, createdBy)
    );
  }

  /**
   * Clone weight profile
   */
  cloneProfile(
    sourceProfileId: string,
    newName: string,
    newDescription: string,
    orgId: string,
    createdBy: string
  ): WeightProfile | null {
    const sourceProfile = this.getProfile(sourceProfileId);
    if (!sourceProfile) {
      return null;
    }

    return this.createProfile(
      orgId,
      newName,
      newDescription,
      sourceProfile.weights,
      createdBy
    );
  }

  /**
   * Get weight profile usage statistics
   */
  getUsageStats(profileId: string): {
    isUsed: boolean;
    usageCount: number;
    lastUsed?: Date;
  } {
    // In a real implementation, this would query the database
    // to find how many repositories are using this profile
    return {
      isUsed: false,
      usageCount: 0,
    };
  }

  /**
   * Migrate repositories to new weight profile
   */
  migrateRepositories(
    fromProfileId: string,
    toProfileId: string,
    repositoryIds: string[]
  ): { success: boolean; migrated: number; errors: string[] } {
    const errors: string[] = [];
    let migrated = 0;

    // Validate profiles exist
    const fromProfile = this.getProfile(fromProfileId);
    const toProfile = this.getProfile(toProfileId);

    if (!fromProfile) {
      errors.push(`Source profile ${fromProfileId} not found`);
    }

    if (!toProfile) {
      errors.push(`Target profile ${toProfileId} not found`);
    }

    if (errors.length > 0) {
      return { success: false, migrated: 0, errors };
    }

    // In a real implementation, this would update the database
    // to change the weight profile for the specified repositories
    for (const repoId of repositoryIds) {
      try {
        // Update repository weight profile
        migrated++;
      } catch (error) {
        errors.push(`Failed to migrate repository ${repoId}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      migrated,
      errors,
    };
  }

  /**
   * Compare weight profiles
   */
  compareProfiles(profileId1: string, profileId2: string): {
    differences: Array<{
      metric: string;
      profile1: number;
      profile2: number;
      difference: number;
    }>;
    similarity: number;
  } {
    const profile1 = this.getProfile(profileId1);
    const profile2 = this.getProfile(profileId2);

    if (!profile1 || !profile2) {
      throw new Error('One or both profiles not found');
    }

    const differences: Array<{
      metric: string;
      profile1: number;
      profile2: number;
      difference: number;
    }> = [];

    let totalDifference = 0;
    const metrics = Object.keys(profile1.weights) as Array<keyof ScoringWeights>;

    for (const metric of metrics) {
      const weight1 = profile1.weights[metric];
      const weight2 = profile2.weights[metric];
      const difference = Math.abs(weight1 - weight2);
      
      differences.push({
        metric,
        profile1: weight1,
        profile2: weight2,
        difference,
      });

      totalDifference += difference;
    }

    // Calculate similarity (0 = identical, 1 = completely different)
    const similarity = 1 - (totalDifference / 2); // Divide by 2 since max difference is 2

    return { differences, similarity };
  }

  /**
   * Generate unique ID for weight profile
   */
  private generateId(): string {
    return `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

