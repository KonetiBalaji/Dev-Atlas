// DevAtlas Static Analysis Tools
// Created by Balaji Koneti

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import { LintIssue, LintIssueType } from './types';

const execAsync = promisify(exec);

export class StaticAnalyzer {
  private readonly tempDir: string;

  constructor(tempDir: string = '/tmp/devatlas') {
    this.tempDir = tempDir;
  }

  /**
   * Run static analysis on a repository
   */
  async analyzeRepository(repoPath: string): Promise<{
    lintIssues: LintIssue[];
    complexity: {
      average: number;
      max: number;
      distribution: Record<string, number>;
    };
  }> {
    console.log(`🔍 Running static analysis on: ${repoPath}`);

    const lintIssues: LintIssue[] = [];
    const complexityData: Record<string, number> = {};

    // Detect languages and run appropriate analyzers
    const languages = await this.detectLanguages(repoPath);

    for (const language of languages) {
      try {
        switch (language) {
          case 'javascript':
          case 'typescript':
            const jsIssues = await this.analyzeJavaScript(repoPath);
            lintIssues.push(...jsIssues);
            break;
          case 'python':
            const pyIssues = await this.analyzePython(repoPath);
            lintIssues.push(...pyIssues);
            break;
          case 'java':
            const javaIssues = await this.analyzeJava(repoPath);
            lintIssues.push(...javaIssues);
            break;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${language}:`, error);
      }
    }

    // Calculate complexity metrics
    const complexity = this.calculateComplexity(lintIssues, complexityData);

    return {
      lintIssues,
      complexity,
    };
  }

  /**
   * Analyze JavaScript/TypeScript files with ESLint
   */
  private async analyzeJavaScript(repoPath: string): Promise<LintIssue[]> {
    const issues: LintIssue[] = [];
    
    try {
      // Check if ESLint config exists
      const eslintConfigs = ['eslint.config.js', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml'];
      const hasConfig = eslintConfigs.some(config => 
        fs.existsSync(path.join(repoPath, config))
      );

      if (!hasConfig) {
        // Create a basic ESLint config
        await this.createBasicESLintConfig(repoPath);
      }

      // Run ESLint
      const { stdout, stderr } = await execAsync(
        `cd "${repoPath}" && npx eslint . --format json --ext .js,.jsx,.ts,.tsx || true`,
        { timeout: 30000 }
      );

      if (stderr && !stderr.includes('warning')) {
        console.warn('ESLint stderr:', stderr);
      }

      // Parse ESLint output
      const eslintResults = JSON.parse(stdout || '[]');
      
      for (const result of eslintResults) {
        for (const message of result.messages) {
          issues.push({
            file: path.relative(repoPath, result.filePath),
            line: message.line,
            column: message.column,
            severity: this.mapESLintSeverity(message.severity),
            message: message.message,
            rule: message.ruleId || 'unknown',
            source: 'eslint',
          });
        }
      }
    } catch (error) {
      console.warn('ESLint analysis failed:', error);
    }

    return issues;
  }

  /**
   * Analyze Python files with Ruff and Bandit
   */
  private async analyzePython(repoPath: string): Promise<LintIssue[]> {
    const issues: LintIssue[] = [];

    try {
      // Run Ruff for linting
      const { stdout: ruffOutput } = await execAsync(
        `cd "${repoPath}" && python -m ruff check --output-format json . || true`,
        { timeout: 30000 }
      );

      const ruffResults = JSON.parse(ruffOutput || '[]');
      for (const result of ruffResults) {
        issues.push({
          file: path.relative(repoPath, result.filename),
          line: result.location.row,
          column: result.location.column,
          severity: this.mapRuffSeverity(result.code),
          message: result.message,
          rule: result.code,
          source: 'ruff',
        });
      }

      // Run Bandit for security issues
      const { stdout: banditOutput } = await execAsync(
        `cd "${repoPath}" && python -m bandit -r . -f json || true`,
        { timeout: 30000 }
      );

      const banditResults = JSON.parse(banditOutput || '{"results": []}');
      for (const result of banditResults.results) {
        issues.push({
          file: path.relative(repoPath, result.filename),
          line: result.line_number,
          column: 0,
          severity: this.mapBanditSeverity(result.issue_severity),
          message: result.issue_text,
          rule: result.test_id,
          source: 'bandit',
        });
      }
    } catch (error) {
      console.warn('Python analysis failed:', error);
    }

    return issues;
  }

  /**
   * Analyze Java files with SpotBugs
   */
  private async analyzeJava(repoPath: string): Promise<LintIssue[]> {
    const issues: LintIssue[] = [];

    try {
      // Check if Maven or Gradle project
      const isMaven = fs.existsSync(path.join(repoPath, 'pom.xml'));
      const isGradle = fs.existsSync(path.join(repoPath, 'build.gradle'));

      if (isMaven) {
        // Run SpotBugs with Maven
        const { stdout } = await execAsync(
          `cd "${repoPath}" && mvn spotbugs:check -Dspotbugs.failOnError=false || true`,
          { timeout: 60000 }
        );

        // Parse SpotBugs output (simplified)
        const spotbugsIssues = this.parseSpotBugsOutput(stdout);
        issues.push(...spotbugsIssues);
      }
    } catch (error) {
      console.warn('Java analysis failed:', error);
    }

    return issues;
  }

  /**
   * Detect programming languages in the repository
   */
  private async detectLanguages(repoPath: string): Promise<string[]> {
    const languages = new Set<string>();
    
    const languageFiles = {
      javascript: ['package.json', '*.js', '*.jsx'],
      typescript: ['tsconfig.json', '*.ts', '*.tsx'],
      python: ['requirements.txt', 'pyproject.toml', '*.py'],
      java: ['pom.xml', 'build.gradle', '*.java'],
      go: ['go.mod', '*.go'],
      rust: ['Cargo.toml', '*.rs'],
    };

    for (const [lang, patterns] of Object.entries(languageFiles)) {
      for (const pattern of patterns) {
        if (pattern.startsWith('*')) {
          // Check for file extensions
          const files = await this.findFiles(repoPath, pattern);
          if (files.length > 0) {
            languages.add(lang);
          }
        } else {
          // Check for specific files
          if (fs.existsSync(path.join(repoPath, pattern))) {
            languages.add(lang);
          }
        }
      }
    }

    return Array.from(languages);
  }

  /**
   * Find files matching a pattern
   */
  private async findFiles(dir: string, pattern: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const { stdout } = await execAsync(`find "${dir}" -name "${pattern}" -type f | head -10`);
      files.push(...stdout.trim().split('\n').filter(Boolean));
    } catch (error) {
      // Ignore errors
    }

    return files;
  }

  /**
   * Create a basic ESLint configuration
   */
  private async createBasicESLintConfig(repoPath: string): Promise<void> {
    const config = {
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      env: {
        browser: true,
        node: true,
        es2022: true,
      },
      rules: {
        'no-unused-vars': 'warn',
        'no-console': 'warn',
        'no-debugger': 'error',
      },
    };

    await fs.writeJSON(path.join(repoPath, '.eslintrc.json'), config, { spaces: 2 });
  }

  /**
   * Map ESLint severity to our severity enum
   */
  private mapESLintSeverity(severity: number): 'error' | 'warning' | 'info' {
    switch (severity) {
      case 2: return 'error';
      case 1: return 'warning';
      default: return 'info';
    }
  }

  /**
   * Map Ruff severity to our severity enum
   */
  private mapRuffSeverity(code: string): 'error' | 'warning' | 'info' {
    if (code.startsWith('E')) return 'error';
    if (code.startsWith('W')) return 'warning';
    return 'info';
  }

  /**
   * Map Bandit severity to our severity enum
   */
  private mapBanditSeverity(severity: string): 'error' | 'warning' | 'info' {
    switch (severity.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  /**
   * Parse SpotBugs output (simplified)
   */
  private parseSpotBugsOutput(output: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('Bug:') && line.includes(':')) {
        const parts = line.split(':');
        if (parts.length >= 4) {
          issues.push({
            file: parts[0].trim(),
            line: parseInt(parts[1]) || 0,
            column: 0,
            severity: 'warning',
            message: parts.slice(3).join(':').trim(),
            rule: 'spotbugs',
            source: 'spotbugs',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Calculate complexity metrics from lint issues
   */
  private calculateComplexity(
    issues: LintIssue[],
    complexityData: Record<string, number>
  ): { average: number; max: number; distribution: Record<string, number> } {
    const complexityIssues = issues.filter(issue => 
      issue.rule.includes('complexity') || 
      issue.message.toLowerCase().includes('complex')
    );

    const complexityScores = complexityIssues.map(issue => {
      // Extract complexity score from message or rule
      const match = issue.message.match(/(\d+)/);
      return match ? parseInt(match[1]) : 1;
    });

    const average = complexityScores.length > 0 
      ? complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length 
      : 0;

    const max = complexityScores.length > 0 ? Math.max(...complexityScores) : 0;

    const distribution = {
      low: complexityScores.filter(score => score <= 5).length,
      medium: complexityScores.filter(score => score > 5 && score <= 10).length,
      high: complexityScores.filter(score => score > 10).length,
    };

    return { average, max, distribution };
  }
}