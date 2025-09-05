// DevAtlas Repository Inventory Analyzer
// Created by Balaji Koneti

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { FileInfo, LanguageStats, PackageInfo } from './types';

export class InventoryAnalyzer {
  private readonly languageExtensions: Record<string, string[]> = {
    javascript: ['.js', '.jsx', '.mjs', '.cjs'],
    typescript: ['.ts', '.tsx', '.mts', '.cts'],
    python: ['.py', '.pyi', '.pyw'],
    java: ['.java'],
    csharp: ['.cs'],
    go: ['.go'],
    rust: ['.rs'],
    php: ['.php', '.phtml'],
    ruby: ['.rb'],
    swift: ['.swift'],
    kotlin: ['.kt', '.kts'],
    cpp: ['.cpp', '.cc', '.cxx', '.c++'],
    c: ['.c', '.h'],
    html: ['.html', '.htm'],
    css: ['.css', '.scss', '.sass', '.less'],
    json: ['.json'],
    yaml: ['.yml', '.yaml'],
    xml: ['.xml'],
    markdown: ['.md', '.markdown'],
    shell: ['.sh', '.bash', '.zsh', '.fish'],
    powershell: ['.ps1', '.psm1'],
  };

  private readonly binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.mp4', '.mp3', '.wav', '.avi', '.mov',
    '.woff', '.woff2', '.ttf', '.eot',
  ];

  private readonly ignorePatterns = [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    'target/**',
    '__pycache__/**',
    '.pytest_cache/**',
    'venv/**',
    '.venv/**',
    'env/**',
    '.env/**',
    'coverage/**',
    '.nyc_output/**',
    '.next/**',
    '.nuxt/**',
    'vendor/**',
    '.gradle/**',
    '.mvn/**',
  ];

  /**
   * Analyze repository inventory
   */
  async analyzeInventory(repoPath: string): Promise<{
    files: FileInfo[];
    languages: LanguageStats[];
    packageManagers: string[];
    totalFiles: number;
    totalLines: number;
    totalBytes: number;
  }> {
    console.log(`📁 Analyzing inventory for: ${repoPath}`);

    // Get all files in the repository
    const files = await this.getAllFiles(repoPath);
    
    // Analyze file information
    const fileInfos = await this.analyzeFiles(files, repoPath);
    
    // Calculate language statistics
    const languages = this.calculateLanguageStats(fileInfos);
    
    // Detect package managers
    const packageManagers = this.detectPackageManagers(repoPath);
    
    // Calculate totals
    const totalFiles = fileInfos.length;
    const totalLines = fileInfos.reduce((sum, file) => sum + this.countLines(file), 0);
    const totalBytes = fileInfos.reduce((sum, file) => sum + file.size, 0);

    return {
      files: fileInfos,
      languages,
      packageManagers,
      totalFiles,
      totalLines,
      totalBytes,
    };
  }

  /**
   * Get all files in the repository, respecting ignore patterns
   */
  private async getAllFiles(repoPath: string): Promise<string[]> {
    const allFiles: string[] = [];
    
    // Get all files, excluding ignored patterns
    const patterns = ['**/*'];
    const ignorePatterns = this.ignorePatterns.map(pattern => `!${pattern}`);
    
    const files = await glob(patterns, {
      cwd: repoPath,
      ignore: ignorePatterns,
      nodir: true,
    });

    return files.map(file => path.join(repoPath, file));
  }

  /**
   * Analyze individual files
   */
  private async analyzeFiles(files: string[], repoPath: string): Promise<FileInfo[]> {
    const fileInfos: FileInfo[] = [];

    for (const filePath of files) {
      try {
        const stats = await fs.stat(filePath);
        const relativePath = path.relative(repoPath, filePath);
        const ext = path.extname(filePath).toLowerCase();
        
        const fileInfo: FileInfo = {
          path: relativePath,
          size: stats.size,
          language: this.detectLanguage(filePath),
          isBinary: this.isBinaryFile(filePath, ext),
          lastModified: stats.mtime,
        };

        fileInfos.push(fileInfo);
      } catch (error) {
        console.warn(`⚠️  Could not analyze file: ${filePath}`, error);
      }
    }

    return fileInfos;
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): string | undefined {
    const ext = path.extname(filePath).toLowerCase();
    
    for (const [language, extensions] of Object.entries(this.languageExtensions)) {
      if (extensions.includes(ext)) {
        return language;
      }
    }

    // Special cases
    if (path.basename(filePath) === 'Dockerfile') return 'dockerfile';
    if (path.basename(filePath) === 'Makefile') return 'makefile';
    if (path.basename(filePath) === 'Rakefile') return 'ruby';
    if (path.basename(filePath) === 'Gemfile') return 'ruby';
    if (path.basename(filePath) === 'Cargo.toml') return 'rust';
    if (path.basename(filePath) === 'go.mod') return 'go';
    if (path.basename(filePath) === 'pom.xml') return 'java';
    if (path.basename(filePath) === 'build.gradle') return 'java';

    return undefined;
  }

  /**
   * Check if file is binary
   */
  private isBinaryFile(filePath: string, ext: string): boolean {
    // Check by extension
    if (this.binaryExtensions.includes(ext)) {
      return true;
    }

    // Check by filename
    const filename = path.basename(filePath).toLowerCase();
    if (filename.includes('lock') || filename.includes('package-lock')) {
      return true;
    }

    return false;
  }

  /**
   * Count lines in a file (rough approximation for binary files)
   */
  private countLines(file: FileInfo): number {
    if (file.isBinary) {
      return 0;
    }

    // For text files, we'll do a rough estimation
    // In a real implementation, you'd read the file and count newlines
    return Math.ceil(file.size / 50); // Rough estimate: 50 chars per line
  }

  /**
   * Calculate language statistics
   */
  private calculateLanguageStats(files: FileInfo[]): LanguageStats[] {
    const languageMap = new Map<string, { files: number; lines: number; bytes: number }>();

    for (const file of files) {
      if (!file.language) continue;

      const current = languageMap.get(file.language) || { files: 0, lines: 0, bytes: 0 };
      current.files += 1;
      current.lines += this.countLines(file);
      current.bytes += file.size;
      languageMap.set(file.language, current);
    }

    return Array.from(languageMap.entries())
      .map(([language, stats]) => ({
        language,
        files: stats.files,
        lines: stats.lines,
        bytes: stats.bytes,
      }))
      .sort((a, b) => b.lines - a.lines);
  }

  /**
   * Detect package managers used in the repository
   */
  private detectPackageManagers(repoPath: string): string[] {
    const packageManagers: string[] = [];
    const packageFiles = [
      'package.json', // npm/yarn/pnpm
      'yarn.lock', // yarn
      'pnpm-lock.yaml', // pnpm
      'requirements.txt', // pip
      'pyproject.toml', // poetry
      'Pipfile', // pipenv
      'Cargo.toml', // cargo
      'go.mod', // go modules
      'pom.xml', // maven
      'build.gradle', // gradle
      'composer.json', // composer
      'Gemfile', // bundler
    ];

    for (const file of packageFiles) {
      const filePath = path.join(repoPath, file);
      if (fs.existsSync(filePath)) {
        if (file === 'package.json') {
          packageManagers.push('npm');
        } else if (file === 'yarn.lock') {
          packageManagers.push('yarn');
        } else if (file === 'pnpm-lock.yaml') {
          packageManagers.push('pnpm');
        } else if (file === 'requirements.txt' || file === 'pyproject.toml' || file === 'Pipfile') {
          packageManagers.push('pip');
        } else if (file === 'Cargo.toml') {
          packageManagers.push('cargo');
        } else if (file === 'go.mod') {
          packageManagers.push('go');
        } else if (file === 'pom.xml') {
          packageManagers.push('maven');
        } else if (file === 'build.gradle') {
          packageManagers.push('gradle');
        } else if (file === 'composer.json') {
          packageManagers.push('composer');
        } else if (file === 'Gemfile') {
          packageManagers.push('bundler');
        }
      }
    }

    return [...new Set(packageManagers)]; // Remove duplicates
  }
}
