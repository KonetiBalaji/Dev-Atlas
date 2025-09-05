// DevAtlas Scoring Engine Tests
// Created by Balaji Koneti

import { ScoringEngine } from '../scoring';
import { AnalysisResult } from '../types';

describe('ScoringEngine', () => {
  let scoringEngine: ScoringEngine;

  beforeEach(() => {
    scoringEngine = new ScoringEngine();
  });

  describe('calculateScores', () => {
    it('should calculate scores for a high-quality repository', () => {
      const analysisResult: AnalysisResult = {
        inventory: {
          languages: [
            { language: 'JavaScript', files: 10, lines: 1000, bytes: 50000 },
            { language: 'TypeScript', files: 5, lines: 500, bytes: 25000 },
          ],
          totalFiles: 15,
          totalLines: 1500,
          totalBytes: 75000,
          packageManagers: ['npm'],
        },
        staticAnalysis: {
          lintIssues: [
            { file: 'src/index.js', line: 1, column: 1, severity: 'warning', message: 'Minor issue', rule: 'no-console', source: 'eslint' },
          ],
          complexity: {
            average: 3.5,
            max: 8,
            distribution: { low: 10, medium: 3, high: 1 },
          },
        },
        security: {
          vulnerabilities: [],
          secrets: [],
          dependencyCount: 25,
        },
        documentation: {
          readme: {
            exists: true,
            score: 85,
            hasPurpose: true,
            hasSetup: true,
            hasRun: true,
            hasTest: true,
            hasEnv: true,
            hasLicense: true,
            hasContributing: true,
            hasApiDocs: true,
          },
          apiDocs: {
            exists: true,
            type: 'swagger',
            coverage: 80,
          },
          examples: {
            exists: true,
            count: 3,
          },
        },
        ownership: [
          {
            path: 'src',
            authors: [
              { author: 'developer1@example.com', lines: 800, percentage: 60, commits: 15 },
              { author: 'developer2@example.com', lines: 400, percentage: 30, commits: 10 },
              { author: 'developer3@example.com', lines: 100, percentage: 10, commits: 5 },
            ],
            totalLines: 1300,
            totalCommits: 30,
          },
        ],
        tests: {
          hasTests: true,
          testFiles: ['test/index.test.js', 'test/utils.test.js'],
        },
        ci: {
          hasCI: true,
          providers: ['GitHub Actions'],
          configFiles: ['.github/workflows/ci.yml'],
        },
      };

      const scores = scoringEngine.calculateScores(analysisResult);

      expect(scores.overall).toBeGreaterThan(70);
      expect(scores.craft).toBeGreaterThan(60);
      expect(scores.reliability).toBeGreaterThan(80);
      expect(scores.documentation).toBeGreaterThan(80);
      expect(scores.security).toBeGreaterThan(90);
      expect(scores.impact).toBeGreaterThan(50);
      expect(scores.collaboration).toBeGreaterThan(50);

      expect(scores.details).toHaveProperty('craft');
      expect(scores.details).toHaveProperty('reliability');
      expect(scores.details).toHaveProperty('documentation');
      expect(scores.details).toHaveProperty('security');
      expect(scores.details).toHaveProperty('impact');
      expect(scores.details).toHaveProperty('collaboration');
    });

    it('should calculate scores for a low-quality repository', () => {
      const analysisResult: AnalysisResult = {
        inventory: {
          languages: [
            { language: 'JavaScript', files: 5, lines: 200, bytes: 10000 },
          ],
          totalFiles: 5,
          totalLines: 200,
          totalBytes: 10000,
          packageManagers: ['npm'],
        },
        staticAnalysis: {
          lintIssues: [
            { file: 'src/index.js', line: 1, column: 1, severity: 'error', message: 'Critical issue', rule: 'no-undef', source: 'eslint' },
            { file: 'src/utils.js', line: 5, column: 10, severity: 'error', message: 'Another error', rule: 'no-unused-vars', source: 'eslint' },
            { file: 'src/main.js', line: 10, column: 5, severity: 'warning', message: 'Warning', rule: 'no-console', source: 'eslint' },
          ],
          complexity: {
            average: 12.5,
            max: 25,
            distribution: { low: 1, medium: 2, high: 2 },
          },
        },
        security: {
          vulnerabilities: [
            {
              id: 'vuln-1',
              severity: 'high',
              title: 'High severity vulnerability',
              description: 'A serious security issue',
              package: 'lodash',
              version: '4.17.0',
              source: 'npm-audit',
            },
          ],
          secrets: [
            {
              file: 'config.js',
              line: 5,
              type: 'api_key',
              confidence: 0.9,
              value: 'sk-***',
            },
          ],
          dependencyCount: 5,
        },
        documentation: {
          readme: {
            exists: false,
            score: 0,
            hasPurpose: false,
            hasSetup: false,
            hasRun: false,
            hasTest: false,
            hasEnv: false,
            hasLicense: false,
            hasContributing: false,
            hasApiDocs: false,
          },
          apiDocs: {
            exists: false,
            coverage: 0,
          },
          examples: {
            exists: false,
            count: 0,
          },
        },
        ownership: [
          {
            path: 'src',
            authors: [
              { author: 'developer1@example.com', lines: 200, percentage: 100, commits: 1 },
            ],
            totalLines: 200,
            totalCommits: 1,
          },
        ],
        tests: {
          hasTests: false,
          testFiles: [],
        },
        ci: {
          hasCI: false,
          providers: [],
          configFiles: [],
        },
      };

      const scores = scoringEngine.calculateScores(analysisResult);

      expect(scores.overall).toBeLessThan(40);
      expect(scores.craft).toBeLessThan(40);
      expect(scores.reliability).toBeLessThan(50);
      expect(scores.documentation).toBeLessThan(20);
      expect(scores.security).toBeLessThan(30);
      expect(scores.impact).toBeLessThan(30);
      expect(scores.collaboration).toBeLessThan(30);
    });
  });

  describe('calculateCraftScore', () => {
    it('should penalize high lint issues per KLOC', () => {
      const analysisResult = createMockAnalysisResult({
        staticAnalysis: {
          lintIssues: Array(100).fill(null).map((_, i) => ({
            file: `src/file${i}.js`,
            line: 1,
            column: 1,
            severity: 'error' as const,
            message: 'Error',
            rule: 'no-undef',
            source: 'eslint',
          })),
          complexity: { average: 5, max: 10, distribution: { low: 10, medium: 5, high: 2 } },
        },
        inventory: { totalLines: 1000 },
      });

      const scores = scoringEngine.calculateScores(analysisResult);
      expect(scores.craft).toBeLessThan(50);
    });

    it('should penalize high complexity', () => {
      const analysisResult = createMockAnalysisResult({
        staticAnalysis: {
          lintIssues: [],
          complexity: { average: 15, max: 30, distribution: { low: 1, medium: 2, high: 5 } },
        },
      });

      const scores = scoringEngine.calculateScores(analysisResult);
      expect(scores.craft).toBeLessThan(50);
    });

    it('should give bonus for no lint issues', () => {
      const analysisResult = createMockAnalysisResult({
        staticAnalysis: {
          lintIssues: [],
          complexity: { average: 3, max: 5, distribution: { low: 10, medium: 2, high: 0 } },
        },
      });

      const scores = scoringEngine.calculateScores(analysisResult);
      expect(scores.craft).toBeGreaterThan(90);
    });
  });

  describe('calculateReliabilityScore', () => {
    it('should give high score for tests and CI', () => {
      const analysisResult = createMockAnalysisResult({
        tests: { hasTests: true, testFiles: ['test.js'] },
        ci: { hasCI: true, providers: ['GitHub Actions'], configFiles: ['ci.yml'] },
      });

      const scores = scoringEngine.calculateScores(analysisResult);
      expect(scores.reliability).toBeGreaterThan(90);
    });

    it('should give low score for no tests and CI', () => {
      const analysisResult = createMockAnalysisResult({
        tests: { hasTests: false, testFiles: [] },
        ci: { hasCI: false, providers: [], configFiles: [] },
      });

      const scores = scoringEngine.calculateScores(analysisResult);
      expect(scores.reliability).toBeLessThan(50);
    });
  });

  describe('calculateSecurityScore', () => {
    it('should penalize vulnerabilities', () => {
      const analysisResult = createMockAnalysisResult({
        security: {
          vulnerabilities: Array(10).fill(null).map((_, i) => ({
            id: `vuln-${i}`,
            severity: 'high' as const,
            title: 'Vulnerability',
            description: 'Security issue',
            package: 'package',
            version: '1.0.0',
            source: 'npm-audit',
          })),
          secrets: [],
          dependencyCount: 20,
        },
      });

      const scores = scoringEngine.calculateScores(analysisResult);
      expect(scores.security).toBeLessThan(30);
    });

    it('should penalize secrets', () => {
      const analysisResult = createMockAnalysisResult({
        security: {
          vulnerabilities: [],
          secrets: Array(5).fill(null).map((_, i) => ({
            file: `config${i}.js`,
            line: 1,
            type: 'api_key',
            confidence: 0.9,
            value: 'secret',
          })),
          dependencyCount: 20,
        },
      });

      const scores = scoringEngine.calculateScores(analysisResult);
      expect(scores.security).toBeLessThan(50);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for low scores', () => {
      const scores = {
        craft: 30,
        reliability: 40,
        documentation: 20,
        security: 25,
        impact: 35,
        collaboration: 45,
        details: {
          craft: { score: 30, factors: { lintIssuesPerKLOC: 50, avgComplexity: 15, codeQuality: 30 } },
          reliability: { score: 40, factors: { hasTests: false, hasCI: false, testCoverage: 0 } },
          documentation: { score: 20, factors: { readmeScore: 20, hasApiDocs: false, examplesCount: 0 } },
          security: { score: 25, factors: { vulnCount: 5, secretsFound: 3, dependencyCount: 10 } },
          impact: { score: 35, factors: { totalLines: 500, languageDiversity: 1, repoSize: 10 } },
          collaboration: { score: 45, factors: { ownershipDiversity: 0.2, contributorCount: 1 } },
        },
      };

      const recommendations = scoringEngine.generateRecommendations(scores);

      expect(recommendations).toContain('Improve code quality by fixing lint issues and reducing complexity');
      expect(recommendations).toContain('Add comprehensive test suite');
      expect(recommendations).toContain('Set up continuous integration pipeline');
      expect(recommendations).toContain('Improve documentation with better README and API docs');
      expect(recommendations).toContain('Fix 5 security vulnerabilities');
      expect(recommendations).toContain('Remove hardcoded secrets and use environment variables');
    });
  });
});

// Helper function to create mock analysis results
function createMockAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    inventory: {
      languages: [{ language: 'JavaScript', files: 10, lines: 1000, bytes: 50000 }],
      totalFiles: 10,
      totalLines: 1000,
      totalBytes: 50000,
      packageManagers: ['npm'],
    },
    staticAnalysis: {
      lintIssues: [],
      complexity: { average: 5, max: 10, distribution: { low: 8, medium: 2, high: 0 } },
    },
    security: {
      vulnerabilities: [],
      secrets: [],
      dependencyCount: 20,
    },
    documentation: {
      readme: {
        exists: true,
        score: 70,
        hasPurpose: true,
        hasSetup: true,
        hasRun: true,
        hasTest: true,
        hasEnv: true,
        hasLicense: true,
        hasContributing: true,
        hasApiDocs: true,
      },
      apiDocs: { exists: true, coverage: 60 },
      examples: { exists: true, count: 2 },
    },
    ownership: [
      {
        path: 'src',
        authors: [
          { author: 'dev@example.com', lines: 800, percentage: 80, commits: 10 },
          { author: 'dev2@example.com', lines: 200, percentage: 20, commits: 5 },
        ],
        totalLines: 1000,
        totalCommits: 15,
      },
    ],
    tests: {
      hasTests: true,
      testFiles: ['test.js'],
    },
    ci: {
      hasCI: true,
      providers: ['GitHub Actions'],
      configFiles: ['ci.yml'],
    },
    ...overrides,
  };
}

