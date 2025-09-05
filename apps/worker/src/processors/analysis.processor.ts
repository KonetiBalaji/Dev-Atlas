// DevAtlas Analysis Processor
// Created by Balaji Koneti

import { PrismaClient } from '@devatlas/db';
import { 
  InventoryAnalyzer, 
  StaticAnalyzer, 
  SecurityAnalyzer, 
  DocumentationAnalyzer, 
  OwnershipAnalyzer, 
  ScoringEngine,
  CoverageAnalyzer,
  LicenseAnalyzer,
  SarifParser
} from '@devatlas/analyzer';
import { LLMService, EmbeddingService } from '@devatlas/ai';
import { simpleGit, SimpleGit } from 'simple-git';
import { Octokit } from 'octokit';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../utils/logger';

export class AnalysisProcessor {
  private git: SimpleGit;
  private octokit: Octokit;
  private llmService: LLMService;
  private embeddingService: EmbeddingService;
  private inventoryAnalyzer: InventoryAnalyzer;
  private staticAnalyzer: StaticAnalyzer;
  private securityAnalyzer: SecurityAnalyzer;
  private documentationAnalyzer: DocumentationAnalyzer;
  private ownershipAnalyzer: OwnershipAnalyzer;
  private scoringEngine: ScoringEngine;
  private coverageAnalyzer: CoverageAnalyzer;
  private licenseAnalyzer: LicenseAnalyzer;
  private sarifParser: SarifParser;

  constructor(private prisma: PrismaClient) {
    this.git = simpleGit();
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
    
    this.llmService = new LLMService({
      openaiApiKey: process.env.OPENAI_API_KEY,
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
      maxTokensPerRepo: parseInt(process.env.MAX_TOKENS_PER_REPO || '40000'),
    });

    this.embeddingService = new EmbeddingService({
      openaiApiKey: process.env.OPENAI_API_KEY,
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    });

    this.inventoryAnalyzer = new InventoryAnalyzer();
    this.staticAnalyzer = new StaticAnalyzer();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.documentationAnalyzer = new DocumentationAnalyzer();
    this.ownershipAnalyzer = new OwnershipAnalyzer();
    this.scoringEngine = new ScoringEngine();
    this.coverageAnalyzer = new CoverageAnalyzer();
    this.licenseAnalyzer = new LicenseAnalyzer();
    this.sarifParser = new SarifParser();
  }

  /**
   * Main analysis pipeline for a project
   */
  async analyzeProject(data: { analysisId: string; projectId: string; handle: string; type: string }) {
    const { analysisId, projectId, handle, type } = data;

    try {
      // Update analysis status to running
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: { status: 'running' },
      });

      logger.info(`Starting analysis for ${type}: ${handle}`);

      // Step 1: Discover repositories
      const repos = await this.discoverRepositories(handle, type);
      logger.info(`Discovered ${repos.length} repositories`);

      // Step 2: Clone and analyze each repository
      const analysisResults = [];
      for (const repo of repos) {
        try {
          const result = await this.analyzeRepository(repo, analysisId);
          analysisResults.push(result);
        } catch (error) {
          logger.error(`Failed to analyze repository ${repo.name}:`, error);
        }
      }

      // Step 3: Calculate overall score
      const score = await this.calculateScore(analysisId, analysisResults);

      // Step 4: Generate summary
      const summary = await this.generateSummary(analysisResults);

      // Update analysis as complete
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'complete',
          summary,
          scoreId: score.id,
          finishedAt: new Date(),
        },
      });

      logger.info(`Analysis completed for ${handle}`);

    } catch (error) {
      logger.error(`Analysis failed for ${handle}:`, error);
      
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'failed',
          finishedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Discover repositories for a GitHub user/org
   */
  private async discoverRepositories(handle: string, type: string) {
    try {
      const { data: repos } = await this.octokit.rest.repos.listForUser({
        username: handle,
        per_page: 100,
        sort: 'updated',
      });

      // Filter out forks and archived repos (configurable)
      const filteredRepos = repos.filter(repo => 
        !repo.fork && !repo.archived && repo.size > 0
      );

      return filteredRepos.slice(0, 20); // Limit to top 20 repos
    } catch (error) {
      logger.error(`Failed to discover repositories for ${handle}:`, error);
      return [];
    }
  }

  /**
   * Analyze a single repository
   */
  private async analyzeRepository(repo: any, analysisId: string) {
    const repoPath = path.join('/tmp', 'devatlas', repo.name);
    
    try {
      // Clone repository
      await this.cloneRepository(repo.clone_url, repoPath);

      // Run comprehensive analysis
      const inventory = await this.inventoryAnalyzer.analyzeInventory(repoPath);
      const staticAnalysis = await this.staticAnalyzer.analyzeRepository(repoPath);
      const security = await this.securityAnalyzer.analyzeSecurity(repoPath);
      const documentation = await this.documentationAnalyzer.analyzeDocumentation(repoPath);
      const ownership = await this.ownershipAnalyzer.analyzeOwnership(repoPath);
      const coverage = await this.coverageAnalyzer.analyzeCoverage(repoPath);
      const licenses = await this.licenseAnalyzer.analyzeLicenses(repoPath);

      // Create comprehensive analysis result
      const analysisResult = {
        inventory,
        staticAnalysis,
        security,
        documentation,
        ownership,
        tests: {
          hasTests: this.detectTests(repoPath),
          testFiles: this.getTestFiles(repoPath),
          coverage: coverage?.overall,
        },
        ci: {
          hasCI: this.detectCI(repoPath),
          providers: this.detectCIProviders(repoPath),
          configFiles: this.getCIConfigFiles(repoPath),
        },
        licenses,
      };

      // Calculate scores
      const scores = this.scoringEngine.calculateScores(analysisResult);

      // Create repo record with comprehensive data
      const repoRecord = await this.prisma.repo.create({
        data: {
          analysisId,
          name: repo.name,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          loc: inventory.totalLines,
          hasTests: analysisResult.tests.hasTests,
          hasCI: analysisResult.ci.hasCI,
          readmeScore: documentation.readme.score,
          lintIssues: staticAnalysis.lintIssues.length,
          complexity: staticAnalysis.complexity.average,
          vulnCount: security.vulnerabilities.length,
          secretsFound: security.secrets.length,
        },
      });

      // Store ownership data
      for (const ownershipData of ownership) {
        for (const author of ownershipData.authors) {
          await this.prisma.ownership.create({
            data: {
              repoId: repoRecord.id,
              path: ownershipData.path,
              author: author.author,
              share: author.percentage / 100,
            },
          });
        }
      }

      // Generate summary using LLM
      const summary = await this.generateRepoSummary(repo, analysisResult);
      await this.prisma.repo.update({
        where: { id: repoRecord.id },
        data: { summary },
      });

      // Generate embeddings
      await this.generateEmbeddings(repoRecord.id, summary);

      // Clean up cloned repository
      await fs.remove(repoPath);

      return { repoRecord, scores };

    } catch (error) {
      logger.error(`Failed to analyze repository ${repo.name}:`, error);
      throw error;
    }
  }

  /**
   * Clone repository to local path
   */
  private async cloneRepository(url: string, path: string) {
    await fs.ensureDir(path);
    await this.git.clone(url, path, ['--depth', '1']);
  }

  /**
   * Detect if repository has tests
   */
  private detectTests(repoPath: string): boolean {
    const testPatterns = [
      'test/**',
      'tests/**',
      '__tests__/**',
      'spec/**',
      '*.test.*',
      '*.spec.*',
    ];

    // Simple check for test directories/files
    return testPatterns.some(pattern => {
      try {
        return fs.existsSync(path.join(repoPath, pattern.replace('**', '')));
      } catch {
        return false;
      }
    });
  }

  /**
   * Detect if repository has CI configuration
   */
  private detectCI(repoPath: string): boolean {
    const ciFiles = [
      '.github/workflows',
      '.gitlab-ci.yml',
      'Jenkinsfile',
      'azure-pipelines.yml',
      'circle.yml',
      'travis.yml',
    ];

    return ciFiles.some(file => fs.existsSync(path.join(repoPath, file)));
  }

  /**
   * Analyze README quality
   */
  private analyzeReadme(repoPath: string): number {
    const readmeFiles = ['README.md', 'README.rst', 'README.txt'];
    
    for (const readme of readmeFiles) {
      const readmePath = path.join(repoPath, readme);
      if (fs.existsSync(readmePath)) {
        // Simple scoring based on file size and content
        const content = fs.readFileSync(readmePath, 'utf8');
        let score = 0;
        
        if (content.includes('## Installation') || content.includes('## Setup')) score += 20;
        if (content.includes('## Usage') || content.includes('## Examples')) score += 20;
        if (content.includes('## Testing') || content.includes('## Tests')) score += 20;
        if (content.includes('## Contributing')) score += 20;
        if (content.includes('## License')) score += 20;
        
        return Math.min(score, 100);
      }
    }
    
    return 0;
  }

  /**
   * Generate repository summary using LLM
   */
  private async generateRepoSummary(repo: any, analysisResult: any): Promise<string> {
    try {
      const prompt = `Analyze this repository and provide a concise summary:

Repository: ${repo.name}
Description: ${repo.description || 'No description'}
Language: ${repo.language || 'Unknown'}
Stars: ${repo.stargazers_count}
Size: ${analysisResult.inventory.totalFiles} files, ${analysisResult.inventory.totalLines} lines
Languages: ${analysisResult.inventory.languages.map((l: any) => l.language).join(', ')}
Has Tests: ${analysisResult.tests.hasTests}
Has CI: ${analysisResult.ci.hasCI}
Documentation Score: ${analysisResult.documentation.readme.score}/100
Security Issues: ${analysisResult.security.vulnerabilities.length} vulnerabilities, ${analysisResult.security.secrets.length} secrets

In 100 words or less, describe:
1. What this repository does
2. Main technologies used
3. Key features or components
4. Quality indicators

Be concise and informative.`;

      const response = await this.llmService.generateCompletion({
        prompt,
        maxTokens: 150,
      });

      return response.content;
    } catch (error) {
      logger.error('Failed to generate repo summary:', error);
      return `Repository: ${repo.name}. ${repo.description || 'No description available.'}`;
    }
  }

  /**
   * Get test files in the repository
   */
  private getTestFiles(repoPath: string): string[] {
    const testFiles: string[] = [];
    const testPatterns = [
      '**/*.test.*',
      '**/*.spec.*',
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**',
    ];

    for (const pattern of testPatterns) {
      try {
        const { stdout } = require('child_process').execSync(
          `find "${repoPath}" -name "${pattern.replace('**/', '').replace('/**', '')}" -type f | head -20`,
          { encoding: 'utf8', timeout: 5000 }
        );
        testFiles.push(...stdout.trim().split('\n').filter(Boolean));
      } catch (error) {
        // Ignore errors
      }
    }

    return testFiles;
  }

  /**
   * Detect CI providers
   */
  private detectCIProviders(repoPath: string): string[] {
    const providers: string[] = [];
    
    const ciFiles = {
      'GitHub Actions': '.github/workflows',
      'GitLab CI': '.gitlab-ci.yml',
      'Jenkins': 'Jenkinsfile',
      'Azure DevOps': 'azure-pipelines.yml',
      'CircleCI': 'circle.yml',
      'Travis CI': 'travis.yml',
      'Bitbucket Pipelines': 'bitbucket-pipelines.yml',
    };

    for (const [provider, file] of Object.entries(ciFiles)) {
      if (fs.existsSync(path.join(repoPath, file))) {
        providers.push(provider);
      }
    }

    return providers;
  }

  /**
   * Get CI configuration files
   */
  private getCIConfigFiles(repoPath: string): string[] {
    const configFiles: string[] = [];
    
    const ciFiles = [
      '.github/workflows',
      '.gitlab-ci.yml',
      'Jenkinsfile',
      'azure-pipelines.yml',
      'circle.yml',
      'travis.yml',
      'bitbucket-pipelines.yml',
    ];

    for (const file of ciFiles) {
      const fullPath = path.join(repoPath, file);
      if (fs.existsSync(fullPath)) {
        if (file === '.github/workflows') {
          try {
            const files = fs.readdirSync(fullPath);
            configFiles.push(...files.map(f => `.github/workflows/${f}`));
          } catch (error) {
            // Ignore errors
          }
        } else {
          configFiles.push(file);
        }
      }
    }

    return configFiles;
  }

  /**
   * Generate embeddings for semantic search
   */
  private async generateEmbeddings(repoId: string, summary: string) {
    try {
      const embedding = await this.embeddingService.generateEmbedding({
        text: summary,
      });

      await this.prisma.embedding.create({
        data: {
          repoId,
          path: '/',
          kind: 'repo',
          vector: embedding.embedding,
          text: summary,
        },
      });
    } catch (error) {
      logger.error('Failed to generate embeddings:', error);
    }
  }

  /**
   * Calculate overall score for the analysis
   */
  private async calculateScore(analysisId: string, repoResults: any[]) {
    // Aggregate scores from all repositories
    const totalRepos = repoResults.length;
    let totalCraft = 0;
    let totalReliability = 0;
    let totalDocumentation = 0;
    let totalSecurity = 0;
    let totalImpact = 0;
    let totalCollaboration = 0;

    for (const result of repoResults) {
      if (result.scores) {
        totalCraft += result.scores.craft;
        totalReliability += result.scores.reliability;
        totalDocumentation += result.scores.documentation;
        totalSecurity += result.scores.security;
        totalImpact += result.scores.impact;
        totalCollaboration += result.scores.collaboration;
      }
    }

    const overall = Math.round(
      (totalCraft / totalRepos) * 0.25 +
      (totalReliability / totalRepos) * 0.15 +
      (totalDocumentation / totalRepos) * 0.15 +
      (totalSecurity / totalRepos) * 0.15 +
      (totalImpact / totalRepos) * 0.20 +
      (totalCollaboration / totalRepos) * 0.10
    );

    return this.prisma.score.create({
      data: {
        analysisId,
        overall,
        craft: Math.round(totalCraft / totalRepos),
        reliability: Math.round(totalReliability / totalRepos),
        documentation: Math.round(totalDocumentation / totalRepos),
        security: Math.round(totalSecurity / totalRepos),
        impact: Math.round(totalImpact / totalRepos),
        collaboration: Math.round(totalCollaboration / totalRepos),
        details: {
          totalRepos,
          avgCraft: totalCraft / totalRepos,
          avgReliability: totalReliability / totalRepos,
          avgDocumentation: totalDocumentation / totalRepos,
          avgSecurity: totalSecurity / totalRepos,
          avgImpact: totalImpact / totalRepos,
          avgCollaboration: totalCollaboration / totalRepos,
        },
      },
    });
  }

  /**
   * Generate analysis summary
   */
  private async generateSummary(repos: any[]): Promise<string> {
    const totalRepos = repos.length;
    const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0);
    const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
    
    return `Analysis completed for ${totalRepos} repositories with ${totalStars} total stars. 
    Main languages: ${languages.join(', ')}. 
    Average repository quality score: ${Math.round(repos.reduce((sum, r) => sum + r.readmeScore, 0) / totalRepos)}/100.`;
  }
}
