// DevAtlas Security Analysis Tools
// Created by Balaji Koneti

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Vulnerability, SecretMatch, VulnerabilityType, SecretMatchType } from './types';

const execAsync = promisify(exec);

export class SecurityAnalyzer {
  private readonly tempDir: string;
  private readonly secretPatterns: RegExp[];

  constructor(tempDir: string = '/tmp/devatlas') {
    this.tempDir = tempDir;
    this.secretPatterns = this.initializeSecretPatterns();
  }

  /**
   * Run comprehensive security analysis on a repository
   */
  async analyzeSecurity(repoPath: string): Promise<{
    vulnerabilities: Vulnerability[];
    secrets: SecretMatch[];
    dependencyCount: number;
  }> {
    console.log(`🔒 Running security analysis on: ${repoPath}`);

    const vulnerabilities: Vulnerability[] = [];
    const secrets: SecretMatch[] = [];
    let dependencyCount = 0;

    // Detect package managers and run appropriate security scans
    const packageManagers = await this.detectPackageManagers(repoPath);

    for (const manager of packageManagers) {
      try {
        switch (manager) {
          case 'npm':
          case 'yarn':
          case 'pnpm':
            const npmResults = await this.analyzeNpmSecurity(repoPath);
            vulnerabilities.push(...npmResults.vulnerabilities);
            dependencyCount += npmResults.dependencyCount;
            break;
          case 'pip':
          case 'poetry':
            const pipResults = await this.analyzePipSecurity(repoPath);
            vulnerabilities.push(...pipResults.vulnerabilities);
            dependencyCount += pipResults.dependencyCount;
            break;
          case 'cargo':
            const cargoResults = await this.analyzeCargoSecurity(repoPath);
            vulnerabilities.push(...cargoResults.vulnerabilities);
            dependencyCount += cargoResults.dependencyCount;
            break;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${manager} security:`, error);
      }
    }

    // Run secret detection
    const detectedSecrets = await this.detectSecrets(repoPath);
    secrets.push(...detectedSecrets);

    return {
      vulnerabilities,
      secrets,
      dependencyCount,
    };
  }

  /**
   * Analyze npm/yarn/pnpm security vulnerabilities
   */
  private async analyzeNpmSecurity(repoPath: string): Promise<{
    vulnerabilities: Vulnerability[];
    dependencyCount: number;
  }> {
    const vulnerabilities: Vulnerability[] = [];
    let dependencyCount = 0;

    try {
      // Check if package.json exists
      const packageJsonPath = path.join(repoPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return { vulnerabilities, dependencyCount };
      }

      // Count dependencies
      const packageJson = await fs.readJSON(packageJsonPath);
      dependencyCount = Object.keys(packageJson.dependencies || {}).length +
                      Object.keys(packageJson.devDependencies || {}).length;

      // Run npm audit
      const { stdout: auditOutput } = await execAsync(
        `cd "${repoPath}" && npm audit --json || true`,
        { timeout: 60000 }
      );

      const auditResults = JSON.parse(auditOutput || '{}');
      
      if (auditResults.vulnerabilities) {
        for (const [packageName, vulnData] of Object.entries(auditResults.vulnerabilities)) {
          const vuln = vulnData as any;
          vulnerabilities.push({
            id: vuln.id || `${packageName}-${vuln.severity}`,
            severity: this.mapNpmSeverity(vuln.severity),
            title: vuln.title || `Vulnerability in ${packageName}`,
            description: vuln.overview || vuln.description || 'No description available',
            package: packageName,
            version: vuln.range || 'unknown',
            fixedIn: vuln.fixAvailable ? vuln.fixAvailable.version : undefined,
            cve: vuln.cves?.[0] || undefined,
            source: 'npm-audit',
          });
        }
      }
    } catch (error) {
      console.warn('npm audit failed:', error);
    }

    return { vulnerabilities, dependencyCount };
  }

  /**
   * Analyze pip/poetry security vulnerabilities
   */
  private async analyzePipSecurity(repoPath: string): Promise<{
    vulnerabilities: Vulnerability[];
    dependencyCount: number;
  }> {
    const vulnerabilities: Vulnerability[] = [];
    let dependencyCount = 0;

    try {
      // Count dependencies from requirements.txt or pyproject.toml
      const requirementsPath = path.join(repoPath, 'requirements.txt');
      const pyprojectPath = path.join(repoPath, 'pyproject.toml');

      if (fs.existsSync(requirementsPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf8');
        dependencyCount = requirements.split('\n').filter(line => 
          line.trim() && !line.startsWith('#')
        ).length;
      } else if (fs.existsSync(pyprojectPath)) {
        const pyproject = await fs.readJSON(pyprojectPath);
        const deps = pyproject.tool?.poetry?.dependencies || {};
        dependencyCount = Object.keys(deps).length;
      }

      // Run pip-audit
      const { stdout: auditOutput } = await execAsync(
        `cd "${repoPath}" && python -m pip_audit --format json || true`,
        { timeout: 60000 }
      );

      const auditResults = JSON.parse(auditOutput || '{"vulnerabilities": []}');
      
      for (const vuln of auditResults.vulnerabilities || []) {
        vulnerabilities.push({
          id: vuln.id || `${vuln.package}-${vuln.severity}`,
          severity: this.mapPipSeverity(vuln.severity),
          title: vuln.summary || `Vulnerability in ${vuln.package}`,
          description: vuln.description || 'No description available',
          package: vuln.package,
          version: vuln.installed_version || 'unknown',
          fixedIn: vuln.fixed_version || undefined,
          cve: vuln.id,
          source: 'pip-audit',
        });
      }
    } catch (error) {
      console.warn('pip-audit failed:', error);
    }

    return { vulnerabilities, dependencyCount };
  }

  /**
   * Analyze Cargo security vulnerabilities
   */
  private async analyzeCargoSecurity(repoPath: string): Promise<{
    vulnerabilities: Vulnerability[];
    dependencyCount: number;
  }> {
    const vulnerabilities: Vulnerability[] = [];
    let dependencyCount = 0;

    try {
      const cargoTomlPath = path.join(repoPath, 'Cargo.toml');
      if (!fs.existsSync(cargoTomlPath)) {
        return { vulnerabilities, dependencyCount };
      }

      // Count dependencies
      const cargoToml = await fs.readFile(cargoTomlPath, 'utf8');
      const depMatches = cargoToml.match(/\[dependencies\]/g);
      dependencyCount = depMatches ? depMatches.length : 0;

      // Run cargo audit
      const { stdout: auditOutput } = await execAsync(
        `cd "${repoPath}" && cargo audit --json || true`,
        { timeout: 60000 }
      );

      const auditResults = JSON.parse(auditOutput || '{"vulnerabilities": []}');
      
      for (const vuln of auditResults.vulnerabilities || []) {
        vulnerabilities.push({
          id: vuln.id || `${vuln.package}-${vuln.severity}`,
          severity: this.mapCargoSeverity(vuln.severity),
          title: vuln.title || `Vulnerability in ${vuln.package}`,
          description: vuln.description || 'No description available',
          package: vuln.package,
          version: vuln.installed_version || 'unknown',
          fixedIn: vuln.fixed_version || undefined,
          cve: vuln.id,
          source: 'cargo-audit',
        });
      }
    } catch (error) {
      console.warn('cargo audit failed:', error);
    }

    return { vulnerabilities, dependencyCount };
  }

  /**
   * Detect secrets in the repository
   */
  private async detectSecrets(repoPath: string): Promise<SecretMatch[]> {
    const secrets: SecretMatch[] = [];

    try {
      // Get all text files
      const textFiles = await this.getTextFiles(repoPath);

      for (const filePath of textFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const fileSecrets = this.scanForSecrets(content, filePath);
          secrets.push(...fileSecrets);
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      console.warn('Secret detection failed:', error);
    }

    return secrets;
  }

  /**
   * Get all text files in the repository
   */
  private async getTextFiles(repoPath: string): Promise<string[]> {
    const textFiles: string[] = [];
    
    try {
      const { stdout } = await execAsync(
        `find "${repoPath}" -type f -exec file {} \\; | grep -E "(text|script)" | cut -d: -f1 | head -1000`
      );
      textFiles.push(...stdout.trim().split('\n').filter(Boolean));
    } catch (error) {
      // Fallback to common text file extensions
      const extensions = ['.js', '.ts', '.py', '.java', '.go', '.rs', '.md', '.txt', '.json', '.yml', '.yaml'];
      for (const ext of extensions) {
        try {
          const { stdout } = await execAsync(`find "${repoPath}" -name "*${ext}" -type f | head -100`);
          textFiles.push(...stdout.trim().split('\n').filter(Boolean));
        } catch (error) {
          // Ignore errors
        }
      }
    }

    return textFiles;
  }

  /**
   * Scan file content for secrets
   */
  private scanForSecrets(content: string, filePath: string): SecretMatch[] {
    const secrets: SecretMatch[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of this.secretPatterns) {
        const matches = line.match(pattern);
        if (matches) {
          secrets.push({
            file: filePath,
            line: i + 1,
            type: this.getSecretType(pattern),
            confidence: this.calculateConfidence(matches[0]),
            value: this.redactSecret(matches[0]),
          });
        }
      }
    }

    return secrets;
  }

  /**
   * Initialize secret detection patterns
   */
  private initializeSecretPatterns(): RegExp[] {
    return [
      // AWS Keys
      /AKIA[0-9A-Z]{16}/g,
      /aws_access_key_id\s*=\s*['"]?([A-Za-z0-9+/]{20,})['"]?/gi,
      /aws_secret_access_key\s*=\s*['"]?([A-Za-z0-9+/]{40,})['"]?/gi,
      
      // GitHub Tokens
      /ghp_[A-Za-z0-9]{36}/g,
      /gho_[A-Za-z0-9]{36}/g,
      /ghu_[A-Za-z0-9]{36}/g,
      /ghs_[A-Za-z0-9]{36}/g,
      /ghr_[A-Za-z0-9]{36}/g,
      
      // API Keys (generic)
      /api[_-]?key\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/gi,
      /secret[_-]?key\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/gi,
      
      // Database URLs
      /(mongodb|postgresql|mysql):\/\/[^:\s]+:[^@\s]+@[^\/\s]+\/[^\s]+/gi,
      
      // JWT Tokens
      /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
      
      // Slack Webhooks
      /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+/g,
      
      // High entropy strings (potential secrets)
      /[A-Za-z0-9+/]{32,}={0,2}/g,
    ];
  }

  /**
   * Get secret type from pattern
   */
  private getSecretType(pattern: RegExp): string {
    const patternStr = pattern.toString();
    if (patternStr.includes('AKIA') || patternStr.includes('aws')) return 'aws_key';
    if (patternStr.includes('ghp_') || patternStr.includes('gho_')) return 'github_token';
    if (patternStr.includes('api') || patternStr.includes('secret')) return 'api_key';
    if (patternStr.includes('mongodb') || patternStr.includes('postgresql')) return 'database_url';
    if (patternStr.includes('eyJ')) return 'jwt_token';
    if (patternStr.includes('slack')) return 'slack_webhook';
    return 'generic_secret';
  }

  /**
   * Calculate confidence score for detected secret
   */
  private calculateConfidence(secret: string): number {
    // Higher entropy = higher confidence
    const entropy = this.calculateEntropy(secret);
    return Math.min(entropy / 4, 1); // Normalize to 0-1
  }

  /**
   * Calculate Shannon entropy of a string
   */
  private calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Redact secret for logging
   */
  private redactSecret(secret: string): string {
    if (secret.length <= 8) return '***';
    return secret.substring(0, 4) + '***' + secret.substring(secret.length - 4);
  }

  /**
   * Detect package managers in the repository
   */
  private async detectPackageManagers(repoPath: string): Promise<string[]> {
    const managers: string[] = [];
    
    const managerFiles = {
      npm: ['package.json'],
      yarn: ['yarn.lock'],
      pnpm: ['pnpm-lock.yaml'],
      pip: ['requirements.txt'],
      poetry: ['pyproject.toml'],
      cargo: ['Cargo.toml'],
    };

    for (const [manager, files] of Object.entries(managerFiles)) {
      for (const file of files) {
        if (fs.existsSync(path.join(repoPath, file))) {
          managers.push(manager);
          break;
        }
      }
    }

    return managers;
  }

  /**
   * Map npm audit severity to our severity enum
   */
  private mapNpmSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'moderate': return 'medium';
      case 'low': return 'low';
      default: return 'low';
    }
  }

  /**
   * Map pip audit severity to our severity enum
   */
  private mapPipSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'low';
    }
  }

  /**
   * Map cargo audit severity to our severity enum
   */
  private mapCargoSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'low';
    }
  }
}