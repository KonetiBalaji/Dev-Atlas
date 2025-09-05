// DevAtlas Analyzer Types
// Created by Balaji Koneti

import { z } from 'zod';

// File system types
export interface FileInfo {
  path: string;
  size: number;
  language?: string;
  isBinary: boolean;
  lastModified: Date;
}

// Language detection types
export interface LanguageStats {
  language: string;
  files: number;
  lines: number;
  bytes: number;
}

// Package manager types
export interface PackageInfo {
  name: string;
  version: string;
  manager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'cargo' | 'go' | 'maven' | 'gradle';
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// Lint result types
export interface LintIssue {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule: string;
  source: string; // eslint, ruff, etc.
}

// Security vulnerability types
export interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  package: string;
  version: string;
  fixedIn?: string;
  cve?: string;
  source: string; // npm audit, pip-audit, etc.
}

// Secret detection types
export interface SecretMatch {
  file: string;
  line: number;
  type: string; // aws_key, github_token, etc.
  confidence: number;
  value: string; // redacted
}

// Test coverage types
export interface CoverageInfo {
  total: number;
  covered: number;
  percentage: number;
  files: Record<string, { covered: number; total: number; percentage: number }>;
}

// Documentation analysis types
export interface DocumentationScore {
  readme: {
    exists: boolean;
    score: number;
    hasPurpose: boolean;
    hasSetup: boolean;
    hasRun: boolean;
    hasTest: boolean;
    hasEnv: boolean;
    hasLicense: boolean;
    hasContributing: boolean;
    hasApiDocs: boolean;
  };
  apiDocs: {
    exists: boolean;
    type?: 'swagger' | 'jsdoc' | 'tsdoc' | 'sphinx' | 'other';
    coverage: number;
  };
  examples: {
    exists: boolean;
    count: number;
  };
}

// Ownership analysis types
export interface OwnershipInfo {
  path: string;
  authors: Array<{
    author: string;
    lines: number;
    percentage: number;
    commits: number;
  }>;
  totalLines: number;
  totalCommits: number;
}

// Analysis result types
export interface AnalysisResult {
  inventory: {
    languages: LanguageStats[];
    totalFiles: number;
    totalLines: number;
    totalBytes: number;
    packageManagers: string[];
  };
  staticAnalysis: {
    lintIssues: LintIssue[];
    complexity: {
      average: number;
      max: number;
      distribution: Record<string, number>;
    };
  };
  security: {
    vulnerabilities: Vulnerability[];
    secrets: SecretMatch[];
    dependencyCount: number;
  };
  documentation: DocumentationScore;
  ownership: OwnershipInfo[];
  tests: {
    hasTests: boolean;
    testFiles: string[];
    coverage?: CoverageInfo;
  };
  ci: {
    hasCI: boolean;
    providers: string[];
    configFiles: string[];
  };
}

// Validation schemas
export const FileInfoSchema = z.object({
  path: z.string(),
  size: z.number(),
  language: z.string().optional(),
  isBinary: z.boolean(),
  lastModified: z.date(),
});

export const LanguageStatsSchema = z.object({
  language: z.string(),
  files: z.number(),
  lines: z.number(),
  bytes: z.number(),
});

export const LintIssueSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string(),
  rule: z.string(),
  source: z.string(),
});

export const VulnerabilitySchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string(),
  description: z.string(),
  package: z.string(),
  version: z.string(),
  fixedIn: z.string().optional(),
  cve: z.string().optional(),
  source: z.string(),
});

export const SecretMatchSchema = z.object({
  file: z.string(),
  line: z.number(),
  type: z.string(),
  confidence: z.number().min(0).max(1),
  value: z.string(),
});

export const DocumentationScoreSchema = z.object({
  readme: z.object({
    exists: z.boolean(),
    score: z.number(),
    hasPurpose: z.boolean(),
    hasSetup: z.boolean(),
    hasRun: z.boolean(),
    hasTest: z.boolean(),
    hasEnv: z.boolean(),
    hasLicense: z.boolean(),
    hasContributing: z.boolean(),
    hasApiDocs: z.boolean(),
  }),
  apiDocs: z.object({
    exists: z.boolean(),
    type: z.enum(['swagger', 'jsdoc', 'tsdoc', 'sphinx', 'other']).optional(),
    coverage: z.number(),
  }),
  examples: z.object({
    exists: z.boolean(),
    count: z.number(),
  }),
});

export const OwnershipInfoSchema = z.object({
  path: z.string(),
  authors: z.array(z.object({
    author: z.string(),
    lines: z.number(),
    percentage: z.number(),
    commits: z.number(),
  })),
  totalLines: z.number(),
  totalCommits: z.number(),
});

export const CoverageInfoSchema = z.object({
  total: z.number(),
  covered: z.number(),
  percentage: z.number(),
  branches: z.object({
    total: z.number(),
    covered: z.number(),
    percentage: z.number(),
  }).optional(),
  functions: z.object({
    total: z.number(),
    covered: z.number(),
    percentage: z.number(),
  }).optional(),
  lines: z.object({
    total: z.number(),
    covered: z.number(),
    percentage: z.number(),
  }).optional(),
});

export const LicenseInfoSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  text: z.string().optional(),
  spdxId: z.string().optional(),
  isOsiApproved: z.boolean().optional(),
  isFsfApproved: z.boolean().optional(),
  isDeprecated: z.boolean().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  restrictions: z.array(z.string()),
});

export const AnalysisResultSchema = z.object({
  inventory: z.object({
    languages: z.array(LanguageStatsSchema),
    totalFiles: z.number(),
    totalLines: z.number(),
    totalBytes: z.number(),
    packageManagers: z.array(z.string()),
  }),
  staticAnalysis: z.object({
    lintIssues: z.array(LintIssueSchema),
    complexity: z.object({
      average: z.number(),
      max: z.number(),
      distribution: z.record(z.string(), z.number()),
    }),
  }),
  security: z.object({
    vulnerabilities: z.array(VulnerabilitySchema),
    secrets: z.array(SecretMatchSchema),
    dependencyCount: z.number(),
  }),
  documentation: DocumentationScoreSchema,
  ownership: z.array(OwnershipInfoSchema),
  tests: z.object({
    hasTests: z.boolean(),
    testFiles: z.array(z.string()),
    coverage: CoverageInfoSchema.optional(),
  }),
  ci: z.object({
    hasCI: z.boolean(),
    providers: z.array(z.string()),
    configFiles: z.array(z.string()),
  }),
  licenses: z.object({
    projectLicense: LicenseInfoSchema.optional(),
    dependencies: z.array(z.object({
      package: z.string(),
      version: z.string(),
      license: LicenseInfoSchema,
      isDirect: z.boolean(),
    })),
    summary: z.object({
      totalDependencies: z.number(),
      directDependencies: z.number(),
      indirectDependencies: z.number(),
      riskDistribution: z.object({
        low: z.number(),
        medium: z.number(),
        high: z.number(),
      }),
      licenseDistribution: z.record(z.string(), z.number()),
      complianceIssues: z.array(z.string()),
    }),
  }).optional(),
});

export type FileInfoType = z.infer<typeof FileInfoSchema>;
export type LanguageStatsType = z.infer<typeof LanguageStatsSchema>;
export type LintIssueType = z.infer<typeof LintIssueSchema>;
export type VulnerabilityType = z.infer<typeof VulnerabilitySchema>;
export type SecretMatchType = z.infer<typeof SecretMatchSchema>;
export type DocumentationScoreType = z.infer<typeof DocumentationScoreSchema>;
export type OwnershipInfoType = z.infer<typeof OwnershipInfoSchema>;
export type CoverageInfoType = z.infer<typeof CoverageInfoSchema>;
export type LicenseInfoType = z.infer<typeof LicenseInfoSchema>;
export type AnalysisResultType = z.infer<typeof AnalysisResultSchema>;
