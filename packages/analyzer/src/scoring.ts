// DevAtlas Scoring Engine
// Created by Balaji Koneti

import { AnalysisResult } from './types';

export class ScoringEngine {
  /**
   * Calculate comprehensive scores based on analysis results
   */
  calculateScores(analysisResult: AnalysisResult): {
    overall: number;
    craft: number;
    reliability: number;
    documentation: number;
    security: number;
    impact: number;
    collaboration: number;
    details: any;
  } {
    console.log('📊 Calculating scores...');

    const craft = this.calculateCraftScore(analysisResult);
    const reliability = this.calculateReliabilityScore(analysisResult);
    const documentation = this.calculateDocumentationScore(analysisResult);
    const security = this.calculateSecurityScore(analysisResult);
    const impact = this.calculateImpactScore(analysisResult);
    const collaboration = this.calculateCollaborationScore(analysisResult);

    // Calculate overall score with weights
    const overall = Math.round(
      craft * 0.25 +
      reliability * 0.15 +
      documentation * 0.15 +
      security * 0.15 +
      impact * 0.20 +
      collaboration * 0.10
    );

    const details = {
      craft: {
        score: craft,
        factors: {
          lintIssuesPerKLOC: this.calculateLintIssuesPerKLOC(analysisResult),
          avgComplexity: analysisResult.staticAnalysis.complexity.average,
          codeQuality: this.assessCodeQuality(analysisResult),
        },
      },
      reliability: {
        score: reliability,
        factors: {
          hasTests: analysisResult.tests.hasTests,
          hasCI: analysisResult.ci.hasCI,
          testCoverage: analysisResult.tests.coverage?.percentage || 0,
        },
      },
      documentation: {
        score: documentation,
        factors: {
          readmeScore: analysisResult.documentation.readme.score,
          hasApiDocs: analysisResult.documentation.apiDocs.exists,
          examplesCount: analysisResult.documentation.examples.count,
        },
      },
      security: {
        score: security,
        factors: {
          vulnCount: analysisResult.security.vulnerabilities.length,
          secretsFound: analysisResult.security.secrets.length,
          dependencyCount: analysisResult.security.dependencyCount,
        },
      },
      impact: {
        score: impact,
        factors: {
          totalLines: analysisResult.inventory.totalLines,
          languageDiversity: analysisResult.inventory.languages.length,
          repoSize: analysisResult.inventory.totalFiles,
        },
      },
      collaboration: {
        score: collaboration,
        factors: {
          ownershipDiversity: this.calculateOwnershipDiversity(analysisResult),
          contributorCount: this.getContributorCount(analysisResult),
        },
      },
    };

    return {
      overall,
      craft,
      reliability,
      documentation,
      security,
      impact,
      collaboration,
      details,
    };
  }

  /**
   * Calculate craft score (25% weight)
   */
  private calculateCraftScore(analysis: AnalysisResult): number {
    const lintIssuesPerKLOC = this.calculateLintIssuesPerKLOC(analysis);
    const avgComplexity = analysis.staticAnalysis.complexity.average;
    
    // Base score
    let score = 100;
    
    // Deduct for lint issues (max 50 points)
    const lintPenalty = Math.min(lintIssuesPerKLOC / 50, 1) * 50;
    score -= lintPenalty;
    
    // Deduct for complexity (max 20 points)
    const complexityPenalty = Math.min(avgComplexity / 10, 1) * 20;
    score -= complexityPenalty;
    
    // Bonus for good practices
    if (analysis.staticAnalysis.lintIssues.length === 0) {
      score += 10; // Bonus for no lint issues
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate reliability score (15% weight)
   */
  private calculateReliabilityScore(analysis: AnalysisResult): number {
    let score = 40; // Base score
    
    // Tests present (30 points)
    if (analysis.tests.hasTests) {
      score += 30;
    }
    
    // CI present (30 points)
    if (analysis.ci.hasCI) {
      score += 30;
    }
    
    // Test coverage bonus
    if (analysis.tests.coverage) {
      const coverageBonus = (analysis.tests.coverage.percentage / 100) * 20;
      score += coverageBonus;
    }
    
    return Math.min(100, score);
  }

  /**
   * Calculate documentation score (15% weight)
   */
  private calculateDocumentationScore(analysis: AnalysisResult): number {
    let score = analysis.documentation.readme.score;
    
    // API docs bonus
    if (analysis.documentation.apiDocs.exists) {
      score += 10;
    }
    
    // Examples bonus
    if (analysis.documentation.examples.exists) {
      score += Math.min(analysis.documentation.examples.count * 2, 10);
    }
    
    return Math.min(100, score);
  }

  /**
   * Calculate security score (15% weight)
   */
  private calculateSecurityScore(analysis: AnalysisResult): number {
    let score = 100;
    
    // Vulnerability penalty
    const vulnPenalty = Math.min(analysis.security.vulnerabilities.length / 5, 1) * 60;
    score -= vulnPenalty;
    
    // Secret penalty
    const secretPenalty = Math.min(analysis.security.secrets.length, 3) * 10;
    score -= secretPenalty;
    
    // Dependency freshness bonus
    if (analysis.security.dependencyCount > 0) {
      const depBonus = Math.min(analysis.security.dependencyCount / 10, 1) * 10;
      score += depBonus;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate impact score (20% weight)
   */
  private calculateImpactScore(analysis: AnalysisResult): number {
    let score = 0;
    
    // Lines of code impact
    const locScore = Math.min(analysis.inventory.totalLines / 10000, 1) * 40;
    score += locScore;
    
    // Language diversity
    const langScore = Math.min(analysis.inventory.languages.length / 5, 1) * 30;
    score += langScore;
    
    // File count impact
    const fileScore = Math.min(analysis.inventory.totalFiles / 100, 1) * 30;
    score += fileScore;
    
    return Math.min(100, score);
  }

  /**
   * Calculate collaboration score (10% weight)
   */
  private calculateCollaborationScore(analysis: AnalysisResult): number {
    const ownershipDiversity = this.calculateOwnershipDiversity(analysis);
    const contributorCount = this.getContributorCount(analysis);
    
    let score = 0;
    
    // Ownership diversity (50 points)
    score += ownershipDiversity * 50;
    
    // Contributor count (50 points)
    const contributorScore = Math.min(contributorCount / 5, 1) * 50;
    score += contributorScore;
    
    return Math.min(100, score);
  }

  /**
   * Calculate lint issues per KLOC
   */
  private calculateLintIssuesPerKLOC(analysis: AnalysisResult): number {
    const totalLines = analysis.inventory.totalLines;
    const lintIssues = analysis.staticAnalysis.lintIssues.length;
    
    if (totalLines === 0) return 0;
    
    return (lintIssues / totalLines) * 1000;
  }

  /**
   * Assess code quality based on various factors
   */
  private assessCodeQuality(analysis: AnalysisResult): number {
    let quality = 100;
    
    // Deduct for errors
    const errors = analysis.staticAnalysis.lintIssues.filter(issue => issue.severity === 'error');
    quality -= errors.length * 5;
    
    // Deduct for warnings
    const warnings = analysis.staticAnalysis.lintIssues.filter(issue => issue.severity === 'warning');
    quality -= warnings.length * 2;
    
    // Bonus for no issues
    if (analysis.staticAnalysis.lintIssues.length === 0) {
      quality += 20;
    }
    
    return Math.max(0, Math.min(100, quality));
  }

  /**
   * Calculate ownership diversity
   */
  private calculateOwnershipDiversity(analysis: AnalysisResult): number {
    if (analysis.ownership.length === 0) return 0;
    
    const allAuthors = new Set<string>();
    let totalContributions = 0;
    
    for (const ownership of analysis.ownership) {
      for (const author of ownership.authors) {
        allAuthors.add(author.author);
        totalContributions += author.percentage;
      }
    }
    
    if (allAuthors.size === 0) return 0;
    
    // Calculate Gini coefficient for ownership distribution
    const contributions = Array.from(allAuthors).map(author => {
      let total = 0;
      for (const ownership of analysis.ownership) {
        const authorData = ownership.authors.find(a => a.author === author);
        if (authorData) {
          total += authorData.percentage;
        }
      }
      return total;
    });
    
    return this.calculateGiniCoefficient(contributions);
  }

  /**
   * Get contributor count
   */
  private getContributorCount(analysis: AnalysisResult): number {
    const allAuthors = new Set<string>();
    
    for (const ownership of analysis.ownership) {
      for (const author of ownership.authors) {
        allAuthors.add(author.author);
      }
    }
    
    return allAuthors.size;
  }

  /**
   * Calculate Gini coefficient for distribution analysis
   */
  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    if (sum === 0) return 0;
    
    let gini = 0;
    for (let i = 0; i < n; i++) {
      gini += (2 * (i + 1) - n - 1) * sorted[i];
    }
    
    return gini / (n * sum);
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(scores: any): string[] {
    const recommendations: string[] = [];
    
    // Craft recommendations
    if (scores.craft < 70) {
      recommendations.push('Improve code quality by fixing lint issues and reducing complexity');
    }
    
    // Reliability recommendations
    if (scores.reliability < 70) {
      if (!scores.details.reliability.factors.hasTests) {
        recommendations.push('Add comprehensive test suite');
      }
      if (!scores.details.reliability.factors.hasCI) {
        recommendations.push('Set up continuous integration pipeline');
      }
    }
    
    // Documentation recommendations
    if (scores.documentation < 70) {
      recommendations.push('Improve documentation with better README and API docs');
    }
    
    // Security recommendations
    if (scores.security < 70) {
      if (scores.details.security.factors.vulnCount > 0) {
        recommendations.push(`Fix ${scores.details.security.factors.vulnCount} security vulnerabilities`);
      }
      if (scores.details.security.factors.secretsFound > 0) {
        recommendations.push('Remove hardcoded secrets and use environment variables');
      }
    }
    
    // Impact recommendations
    if (scores.impact < 50) {
      recommendations.push('Increase project scope and add more features');
    }
    
    // Collaboration recommendations
    if (scores.collaboration < 50) {
      recommendations.push('Encourage more contributors and improve code review process');
    }
    
    return recommendations;
  }
}