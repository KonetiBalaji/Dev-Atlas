// DevAtlas Documentation Analysis
// Created by Balaji Koneti

import * as fs from 'fs-extra';
import * as path from 'path';
import { DocumentationScore } from './types';

export class DocumentationAnalyzer {
  /**
   * Analyze documentation quality
   */
  async analyzeDocumentation(repoPath: string): Promise<DocumentationScore> {
    console.log(`📚 Analyzing documentation for: ${repoPath}`);

    const readmeScore = await this.analyzeReadme(repoPath);
    const apiDocs = await this.analyzeApiDocs(repoPath);
    const examples = await this.analyzeExamples(repoPath);

    return {
      readme: readmeScore,
      apiDocs,
      examples,
    };
  }

  /**
   * Analyze README quality
   */
  private async analyzeReadme(repoPath: string): Promise<{
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
  }> {
    const readmeFiles = ['README.md', 'README.rst', 'README.txt', 'README.adoc'];
    let readmePath = '';
    let content = '';

    // Find README file
    for (const readme of readmeFiles) {
      const fullPath = path.join(repoPath, readme);
      if (fs.existsSync(fullPath)) {
        readmePath = fullPath;
        try {
          content = await fs.readFile(fullPath, 'utf8');
          break;
        } catch (error) {
          console.warn(`Failed to read ${readme}:`, error);
        }
      }
    }

    if (!content) {
      return {
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
      };
    }

    // Analyze README content
    const analysis = this.analyzeReadmeContent(content);

    return {
      exists: true,
      score: analysis.score,
      hasPurpose: analysis.hasPurpose,
      hasSetup: analysis.hasSetup,
      hasRun: analysis.hasRun,
      hasTest: analysis.hasTest,
      hasEnv: analysis.hasEnv,
      hasLicense: analysis.hasLicense,
      hasContributing: analysis.hasContributing,
      hasApiDocs: analysis.hasApiDocs,
    };
  }

  /**
   * Analyze README content for quality indicators
   */
  private analyzeReadmeContent(content: string): {
    score: number;
    hasPurpose: boolean;
    hasSetup: boolean;
    hasRun: boolean;
    hasTest: boolean;
    hasEnv: boolean;
    hasLicense: boolean;
    hasContributing: boolean;
    hasApiDocs: boolean;
  } {
    const lowerContent = content.toLowerCase();
    let score = 0;

    // Check for purpose/description
    const hasPurpose = this.hasSection(lowerContent, [
      'description', 'about', 'overview', 'what is', 'purpose',
      '## ', '# ', 'introduction'
    ]);
    if (hasPurpose) score += 15;

    // Check for setup/installation
    const hasSetup = this.hasSection(lowerContent, [
      'installation', 'setup', 'install', 'getting started',
      'prerequisites', 'requirements'
    ]);
    if (hasSetup) score += 15;

    // Check for run/usage instructions
    const hasRun = this.hasSection(lowerContent, [
      'usage', 'how to use', 'running', 'start', 'run',
      'examples', 'quick start'
    ]);
    if (hasRun) score += 15;

    // Check for testing instructions
    const hasTest = this.hasSection(lowerContent, [
      'testing', 'tests', 'test', 'run tests', 'test suite'
    ]);
    if (hasTest) score += 10;

    // Check for environment variables
    const hasEnv = this.hasSection(lowerContent, [
      'environment', 'env', 'configuration', 'config',
      'environment variables', 'env vars'
    ]);
    if (hasEnv) score += 10;

    // Check for license information
    const hasLicense = this.hasSection(lowerContent, [
      'license', 'licensing', 'copyright', 'legal'
    ]);
    if (hasLicense) score += 10;

    // Check for contributing guidelines
    const hasContributing = this.hasSection(lowerContent, [
      'contributing', 'contribute', 'development', 'dev',
      'pull request', 'issues', 'bug report'
    ]);
    if (hasContributing) score += 10;

    // Check for API documentation
    const hasApiDocs = this.hasSection(lowerContent, [
      'api', 'documentation', 'docs', 'reference',
      'endpoints', 'swagger', 'openapi'
    });
    if (hasApiDocs) score += 15;

    // Bonus points for good structure
    if (content.includes('##') || content.includes('#')) score += 5;
    if (content.includes('```')) score += 5; // Code blocks
    if (content.includes('![')) score += 5; // Images/screenshots

    return {
      score: Math.min(score, 100),
      hasPurpose,
      hasSetup,
      hasRun,
      hasTest,
      hasEnv,
      hasLicense,
      hasContributing,
      hasApiDocs,
    };
  }

  /**
   * Check if content has a specific section
   */
  private hasSection(content: string, keywords: string[]): boolean {
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Analyze API documentation
   */
  private async analyzeApiDocs(repoPath: string): Promise<{
    exists: boolean;
    type?: 'swagger' | 'jsdoc' | 'tsdoc' | 'sphinx' | 'other';
    coverage: number;
  }> {
    const apiDocFiles = [
      'swagger.json', 'swagger.yaml', 'openapi.json', 'openapi.yaml',
      'api-docs.json', 'api-docs.yaml', 'docs/api/', 'api/',
      'sphinx/', 'docs/', 'doc/'
    ];

    let exists = false;
    let type: 'swagger' | 'jsdoc' | 'tsdoc' | 'sphinx' | 'other' | undefined;
    let coverage = 0;

    // Check for Swagger/OpenAPI docs
    for (const file of apiDocFiles) {
      const fullPath = path.join(repoPath, file);
      if (fs.existsSync(fullPath)) {
        exists = true;
        if (file.includes('swagger') || file.includes('openapi')) {
          type = 'swagger';
          coverage = await this.analyzeSwaggerCoverage(fullPath);
        } else if (file.includes('sphinx')) {
          type = 'sphinx';
          coverage = await this.analyzeSphinxCoverage(fullPath);
        } else {
          type = 'other';
          coverage = 50; // Default coverage for other types
        }
        break;
      }
    }

    // Check for JSDoc/TSDoc in source files
    if (!exists) {
      const jsDocCoverage = await this.analyzeJsDocCoverage(repoPath);
      if (jsDocCoverage > 0) {
        exists = true;
        type = 'jsdoc';
        coverage = jsDocCoverage;
      }
    }

    return { exists, type, coverage };
  }

  /**
   * Analyze Swagger/OpenAPI documentation coverage
   */
  private async analyzeSwaggerCoverage(swaggerPath: string): Promise<number> {
    try {
      const content = await fs.readFile(swaggerPath, 'utf8');
      const swagger = JSON.parse(content);

      let coverage = 0;
      const paths = swagger.paths || {};
      const pathCount = Object.keys(paths).length;

      if (pathCount > 0) {
        coverage += 30; // Base coverage for having paths
      }

      // Check for detailed descriptions
      let detailedPaths = 0;
      for (const path of Object.values(paths)) {
        const pathObj = path as any;
        for (const method of Object.values(pathObj)) {
          const methodObj = method as any;
          if (methodObj.description && methodObj.description.length > 20) {
            detailedPaths++;
          }
        }
      }

      if (pathCount > 0) {
        coverage += (detailedPaths / pathCount) * 70;
      }

      return Math.min(coverage, 100);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Analyze Sphinx documentation coverage
   */
  private async analyzeSphinxCoverage(sphinxPath: string): Promise<number> {
    try {
      const files = await this.getFilesRecursively(sphinxPath, ['.rst', '.md']);
      return Math.min(files.length * 10, 100); // Simple coverage based on file count
    } catch (error) {
      return 0;
    }
  }

  /**
   * Analyze JSDoc/TSDoc coverage in source files
   */
  private async analyzeJsDocCoverage(repoPath: string): Promise<number> {
    try {
      const jsFiles = await this.getFilesRecursively(repoPath, ['.js', '.ts', '.jsx', '.tsx']);
      let documentedFunctions = 0;
      let totalFunctions = 0;

      for (const file of jsFiles.slice(0, 50)) { // Limit to first 50 files
        try {
          const content = await fs.readFile(file, 'utf8');
          const analysis = this.analyzeJsDocInFile(content);
          documentedFunctions += analysis.documented;
          totalFunctions += analysis.total;
        } catch (error) {
          // Skip files that can't be read
        }
      }

      return totalFunctions > 0 ? (documentedFunctions / totalFunctions) * 100 : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Analyze JSDoc coverage in a single file
   */
  private analyzeJsDocInFile(content: string): { documented: number; total: number } {
    const lines = content.split('\n');
    let documented = 0;
    let total = 0;
    let inJsDoc = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for JSDoc start
      if (line.startsWith('/**')) {
        inJsDoc = true;
        continue;
      }

      // Check for JSDoc end
      if (inJsDoc && line.endsWith('*/')) {
        inJsDoc = false;
        continue;
      }

      // Check for function declarations
      if (line.match(/^(export\s+)?(function|const|let|var)\s+\w+.*[=\(]/)) {
        total++;
        if (inJsDoc) {
          documented++;
        }
      }
    }

    return { documented, total };
  }

  /**
   * Analyze examples in the repository
   */
  private async analyzeExamples(repoPath: string): Promise<{
    exists: boolean;
    count: number;
  }> {
    const exampleDirs = ['examples/', 'example/', 'samples/', 'sample/', 'demos/', 'demo/'];
    const exampleFiles = ['example.js', 'example.py', 'example.java', 'example.go', 'example.rs'];

    let exists = false;
    let count = 0;

    // Check for example directories
    for (const dir of exampleDirs) {
      const fullPath = path.join(repoPath, dir);
      if (fs.existsSync(fullPath)) {
        exists = true;
        try {
          const files = await this.getFilesRecursively(fullPath, ['.js', '.py', '.java', '.go', '.rs', '.md']);
          count += files.length;
        } catch (error) {
          // Ignore errors
        }
      }
    }

    // Check for example files
    for (const file of exampleFiles) {
      const fullPath = path.join(repoPath, file);
      if (fs.existsSync(fullPath)) {
        exists = true;
        count++;
      }
    }

    return { exists, count };
  }

  /**
   * Get files recursively with specific extensions
   */
  private async getFilesRecursively(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];

    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath, extensions);
          files.push(...subFiles);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return files;
  }
}