// DevAtlas Coverage Analysis
// Created by Balaji Koneti

import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CoverageInfo {
  total: number;
  covered: number;
  percentage: number;
  branches?: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions?: {
    total: number;
    covered: number;
    percentage: number;
  };
  lines?: {
    total: number;
    covered: number;
    percentage: number;
  };
}

export interface CoverageReport {
  overall: CoverageInfo;
  byFile: Array<{
    file: string;
    coverage: CoverageInfo;
  }>;
  summary: {
    totalFiles: number;
    coveredFiles: number;
    averageCoverage: number;
  };
}

export class CoverageAnalyzer {
  /**
   * Analyze test coverage for a repository
   */
  async analyzeCoverage(repoPath: string): Promise<CoverageReport | null> {
    console.log(`📊 Analyzing test coverage for: ${repoPath}`);

    try {
      // Try different coverage tools in order of preference
      const coverageReport = await this.tryJestCoverage(repoPath) ||
                           await this.tryCoberturaCoverage(repoPath) ||
                           await this.tryLcovCoverage(repoPath) ||
                           await this.tryCoverageBadge(repoPath);

      return coverageReport;
    } catch (error) {
      console.warn('Coverage analysis failed:', error);
      return null;
    }
  }

  /**
   * Try to get coverage from Jest
   */
  private async tryJestCoverage(repoPath: string): Promise<CoverageReport | null> {
    try {
      // Check if Jest is configured
      const packageJsonPath = path.join(repoPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) return null;

      const packageJson = await fs.readJSON(packageJsonPath);
      const jestConfig = packageJson.jest || {};
      
      if (!jestConfig.collectCoverage && !packageJson.scripts?.test?.includes('coverage')) {
        return null;
      }

      // Run Jest with coverage
      const { stdout } = await execAsync(
        `cd "${repoPath}" && npm test -- --coverage --coverageReporters=json --coverageReporters=text-summary --passWithNoTests`,
        { timeout: 60000 }
      );

      // Look for coverage-summary.json
      const coverageSummaryPath = path.join(repoPath, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coverageSummaryPath)) {
        const coverageData = await fs.readJSON(coverageSummaryPath);
        return this.parseJestCoverage(coverageData);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Try to get coverage from Cobertura XML
   */
  private async tryCoberturaCoverage(repoPath: string): Promise<CoverageReport | null> {
    try {
      const coberturaFiles = await this.findFiles(repoPath, 'cobertura-coverage.xml');
      
      for (const file of coberturaFiles) {
        const content = await fs.readFile(file, 'utf8');
        return this.parseCoberturaCoverage(content);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Try to get coverage from LCOV
   */
  private async tryLcovCoverage(repoPath: string): Promise<CoverageReport | null> {
    try {
      const lcovFiles = await this.findFiles(repoPath, 'lcov.info');
      
      for (const file of lcovFiles) {
        const content = await fs.readFile(file, 'utf8');
        return this.parseLcovCoverage(content);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Try to get coverage from coverage badges
   */
  private async tryCoverageBadge(repoPath: string): Promise<CoverageReport | null> {
    try {
      const readmeFiles = ['README.md', 'README.rst', 'README.txt'];
      
      for (const readme of readmeFiles) {
        const readmePath = path.join(repoPath, readme);
        if (fs.existsSync(readmePath)) {
          const content = await fs.readFile(readmePath, 'utf8');
          const coverage = this.parseCoverageBadge(content);
          if (coverage) {
            return {
              overall: coverage,
              byFile: [],
              summary: {
                totalFiles: 1,
                coveredFiles: 1,
                averageCoverage: coverage.percentage,
              },
            };
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse Jest coverage data
   */
  private parseJestCoverage(data: any): CoverageReport {
    const total = data.total;
    const overall: CoverageInfo = {
      total: total.lines.total,
      covered: total.lines.covered,
      percentage: total.lines.pct,
      branches: {
        total: total.branches.total,
        covered: total.branches.covered,
        percentage: total.branches.pct,
      },
      functions: {
        total: total.functions.total,
        covered: total.functions.covered,
        percentage: total.functions.pct,
      },
      lines: {
        total: total.lines.total,
        covered: total.lines.covered,
        percentage: total.lines.pct,
      },
    };

    const byFile = Object.entries(data).filter(([key]) => key !== 'total').map(([file, coverage]: [string, any]) => ({
      file,
      coverage: {
        total: coverage.lines.total,
        covered: coverage.lines.covered,
        percentage: coverage.lines.pct,
        branches: coverage.branches ? {
          total: coverage.branches.total,
          covered: coverage.branches.covered,
          percentage: coverage.branches.pct,
        } : undefined,
        functions: coverage.functions ? {
          total: coverage.functions.total,
          covered: coverage.functions.covered,
          percentage: coverage.functions.pct,
        } : undefined,
        lines: {
          total: coverage.lines.total,
          covered: coverage.lines.covered,
          percentage: coverage.lines.pct,
        },
      },
    }));

    const summary = {
      totalFiles: byFile.length,
      coveredFiles: byFile.filter(f => f.coverage.percentage > 0).length,
      averageCoverage: overall.percentage,
    };

    return { overall, byFile, summary };
  }

  /**
   * Parse Cobertura XML coverage data
   */
  private parseCoberturaCoverage(xmlContent: string): CoverageReport {
    // Simple XML parsing for Cobertura
    const lineRateMatch = xmlContent.match(/line-rate="([^"]+)"/);
    const branchRateMatch = xmlContent.match(/branch-rate="([^"]+)"/);
    const linesCoveredMatch = xmlContent.match(/lines-covered="([^"]+)"/);
    const linesValidMatch = xmlContent.match(/lines-valid="([^"]+)"/);
    const branchesCoveredMatch = xmlContent.match(/branches-covered="([^"]+)"/);
    const branchesValidMatch = xmlContent.match(/branches-valid="([^"]+)"/);

    const lineRate = parseFloat(lineRateMatch?.[1] || '0') * 100;
    const branchRate = parseFloat(branchRateMatch?.[1] || '0') * 100;
    const linesCovered = parseInt(linesCoveredMatch?.[1] || '0');
    const linesValid = parseInt(linesValidMatch?.[1] || '0');
    const branchesCovered = parseInt(branchesCoveredMatch?.[1] || '0');
    const branchesValid = parseInt(branchesValidMatch?.[1] || '0');

    const overall: CoverageInfo = {
      total: linesValid,
      covered: linesCovered,
      percentage: lineRate,
      branches: {
        total: branchesValid,
        covered: branchesCovered,
        percentage: branchRate,
      },
    };

    return {
      overall,
      byFile: [],
      summary: {
        totalFiles: 1,
        coveredFiles: 1,
        averageCoverage: lineRate,
      },
    };
  }

  /**
   * Parse LCOV coverage data
   */
  private parseLcovCoverage(lcovContent: string): CoverageReport {
    const lines = lcovContent.split('\n');
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;

    for (const line of lines) {
      if (line.startsWith('LF:')) {
        totalLines += parseInt(line.substring(3));
      } else if (line.startsWith('LH:')) {
        coveredLines += parseInt(line.substring(3));
      } else if (line.startsWith('BRF:')) {
        totalBranches += parseInt(line.substring(4));
      } else if (line.startsWith('BRH:')) {
        coveredBranches += parseInt(line.substring(4));
      } else if (line.startsWith('FNF:')) {
        totalFunctions += parseInt(line.substring(4));
      } else if (line.startsWith('FNH:')) {
        coveredFunctions += parseInt(line.substring(4));
      }
    }

    const linePercentage = totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
    const branchPercentage = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;
    const functionPercentage = totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0;

    const overall: CoverageInfo = {
      total: totalLines,
      covered: coveredLines,
      percentage: linePercentage,
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percentage: branchPercentage,
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: functionPercentage,
      },
    };

    return {
      overall,
      byFile: [],
      summary: {
        totalFiles: 1,
        coveredFiles: 1,
        averageCoverage: linePercentage,
      },
    };
  }

  /**
   * Parse coverage from badges in README
   */
  private parseCoverageBadge(content: string): CoverageInfo | null {
    // Look for coverage badges
    const badgePatterns = [
      /coverage[^>]*>(\d+(?:\.\d+)?)%/i,
      /coverage[^>]*>(\d+(?:\.\d+)?)%/i,
      /coverage[^>]*>(\d+(?:\.\d+)?)%/i,
    ];

    for (const pattern of badgePatterns) {
      const match = content.match(pattern);
      if (match) {
        const percentage = parseFloat(match[1]);
        return {
          total: 100,
          covered: Math.round(percentage),
          percentage,
        };
      }
    }

    return null;
  }

  /**
   * Find files matching a pattern
   */
  private async findFiles(dir: string, pattern: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`find "${dir}" -name "${pattern}" -type f`);
      return stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get coverage quality score
   */
  getCoverageQualityScore(coverage: CoverageInfo): number {
    if (coverage.percentage >= 90) return 100;
    if (coverage.percentage >= 80) return 90;
    if (coverage.percentage >= 70) return 80;
    if (coverage.percentage >= 60) return 70;
    if (coverage.percentage >= 50) return 60;
    if (coverage.percentage >= 40) return 50;
    if (coverage.percentage >= 30) return 40;
    if (coverage.percentage >= 20) return 30;
    if (coverage.percentage >= 10) return 20;
    return 10;
  }
}

