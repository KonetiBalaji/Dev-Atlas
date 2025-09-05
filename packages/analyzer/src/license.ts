// DevAtlas License Analysis
// Created by Balaji Koneti

import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface LicenseInfo {
  name: string;
  version?: string;
  text?: string;
  spdxId?: string;
  isOsiApproved?: boolean;
  isFsfApproved?: boolean;
  isDeprecated?: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  restrictions: string[];
}

export interface DependencyLicense {
  package: string;
  version: string;
  license: LicenseInfo;
  isDirect: boolean;
}

export interface LicenseReport {
  projectLicense?: LicenseInfo;
  dependencies: DependencyLicense[];
  summary: {
    totalDependencies: number;
    directDependencies: number;
    indirectDependencies: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
    };
    licenseDistribution: Record<string, number>;
    complianceIssues: string[];
  };
}

export class LicenseAnalyzer {
  private readonly licenseDatabase: Map<string, LicenseInfo> = new Map();

  constructor() {
    this.initializeLicenseDatabase();
  }

  /**
   * Analyze licenses for a repository
   */
  async analyzeLicenses(repoPath: string): Promise<LicenseReport | null> {
    console.log(`📄 Analyzing licenses for: ${repoPath}`);

    try {
      const projectLicense = await this.analyzeProjectLicense(repoPath);
      const dependencies = await this.analyzeDependencyLicenses(repoPath);
      
      const summary = this.generateSummary(projectLicense, dependencies);
      
      return {
        projectLicense,
        dependencies,
        summary,
      };
    } catch (error) {
      console.warn('License analysis failed:', error);
      return null;
    }
  }

  /**
   * Analyze project license
   */
  private async analyzeProjectLicense(repoPath: string): Promise<LicenseInfo | undefined> {
    const licenseFiles = [
      'LICENSE',
      'LICENSE.txt',
      'LICENSE.md',
      'LICENSE-MIT',
      'LICENSE-APACHE',
      'COPYING',
      'COPYING.txt',
    ];

    // Check for license files
    for (const file of licenseFiles) {
      const filePath = path.join(repoPath, file);
      if (fs.existsSync(filePath)) {
        const content = await fs.readFile(filePath, 'utf8');
        return this.identifyLicense(content);
      }
    }

    // Check package.json for license field
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = await fs.readJSON(packageJsonPath);
        if (packageJson.license) {
          return this.identifyLicenseFromString(packageJson.license);
        }
      } catch (error) {
        // Ignore errors
      }
    }

    // Check pyproject.toml for license
    const pyprojectPath = path.join(repoPath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      try {
        const content = await fs.readFile(pyprojectPath, 'utf8');
        const licenseMatch = content.match(/license\s*=\s*["']([^"']+)["']/);
        if (licenseMatch) {
          return this.identifyLicenseFromString(licenseMatch[1]);
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return undefined;
  }

  /**
   * Analyze dependency licenses
   */
  private async analyzeDependencyLicenses(repoPath: string): Promise<DependencyLicense[]> {
    const dependencies: DependencyLicense[] = [];

    // Analyze npm dependencies
    const npmDeps = await this.analyzeNpmDependencies(repoPath);
    dependencies.push(...npmDeps);

    // Analyze pip dependencies
    const pipDeps = await this.analyzePipDependencies(repoPath);
    dependencies.push(...pipDeps);

    // Analyze cargo dependencies
    const cargoDeps = await this.analyzeCargoDependencies(repoPath);
    dependencies.push(...cargoDeps);

    return dependencies;
  }

  /**
   * Analyze npm dependencies
   */
  private async analyzeNpmDependencies(repoPath: string): Promise<DependencyLicense[]> {
    const dependencies: DependencyLicense[] = [];
    
    try {
      const packageJsonPath = path.join(repoPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) return dependencies;

      const packageJson = await fs.readJSON(packageJsonPath);
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };

      for (const [packageName, version] of Object.entries(allDeps)) {
        try {
          // Try to get license from package.json
          const { stdout } = await execAsync(
            `cd "${repoPath}" && npm view "${packageName}@${version}" license`,
            { timeout: 5000 }
          );

          const licenseString = stdout.trim();
          if (licenseString && licenseString !== 'undefined') {
            const licenseInfo = this.identifyLicenseFromString(licenseString);
            dependencies.push({
              package: packageName,
              version: version as string,
              license: licenseInfo,
              isDirect: true,
            });
          }
        } catch (error) {
          // If we can't get license info, mark as unknown
          dependencies.push({
            package: packageName,
            version: version as string,
            license: {
              name: 'Unknown',
              riskLevel: 'high',
              restrictions: ['Unknown license'],
            },
            isDirect: true,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to analyze npm dependencies:', error);
    }

    return dependencies;
  }

  /**
   * Analyze pip dependencies
   */
  private async analyzePipDependencies(repoPath: string): Promise<DependencyLicense[]> {
    const dependencies: DependencyLicense[] = [];
    
    try {
      const requirementsPath = path.join(repoPath, 'requirements.txt');
      if (!fs.existsSync(requirementsPath)) return dependencies;

      const requirements = await fs.readFile(requirementsPath, 'utf8');
      const lines = requirements.split('\n').filter(line => 
        line.trim() && !line.startsWith('#')
      );

      for (const line of lines) {
        const packageName = line.split(/[>=<!=]/)[0].trim();
        const version = line.split(/[>=<!=]/)[1]?.trim() || 'latest';

        try {
          // Try to get license from PyPI
          const { stdout } = await execAsync(
            `python -c "import pkg_resources; print(pkg_resources.get_distribution('${packageName}').metadata.get('License', 'Unknown'))"`,
            { timeout: 5000 }
          );

          const licenseString = stdout.trim();
          const licenseInfo = this.identifyLicenseFromString(licenseString);
          dependencies.push({
            package: packageName,
            version,
            license: licenseInfo,
            isDirect: true,
          });
        } catch (error) {
          dependencies.push({
            package: packageName,
            version,
            license: {
              name: 'Unknown',
              riskLevel: 'high',
              restrictions: ['Unknown license'],
            },
            isDirect: true,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to analyze pip dependencies:', error);
    }

    return dependencies;
  }

  /**
   * Analyze cargo dependencies
   */
  private async analyzeCargoDependencies(repoPath: string): Promise<DependencyLicense[]> {
    const dependencies: DependencyLicense[] = [];
    
    try {
      const cargoTomlPath = path.join(repoPath, 'Cargo.toml');
      if (!fs.existsSync(cargoTomlPath)) return dependencies;

      const cargoToml = await fs.readFile(cargoTomlPath, 'utf8');
      const lines = cargoToml.split('\n');
      let inDependencies = false;

      for (const line of lines) {
        if (line.trim() === '[dependencies]') {
          inDependencies = true;
          continue;
        }
        if (line.startsWith('[') && line !== '[dependencies]') {
          inDependencies = false;
          continue;
        }

        if (inDependencies && line.trim() && !line.startsWith('#')) {
          const packageName = line.split('=')[0].trim();
          const version = line.split('=')[1]?.trim().replace(/"/g, '') || 'latest';

          try {
            // Try to get license from crates.io
            const { stdout } = await execAsync(
              `curl -s "https://crates.io/api/v1/crates/${packageName}" | jq -r '.crate.license'`,
              { timeout: 5000 }
            );

            const licenseString = stdout.trim();
            if (licenseString && licenseString !== 'null') {
              const licenseInfo = this.identifyLicenseFromString(licenseString);
              dependencies.push({
                package: packageName,
                version,
                license: licenseInfo,
                isDirect: true,
              });
            }
          } catch (error) {
            dependencies.push({
              package: packageName,
              version,
              license: {
                name: 'Unknown',
                riskLevel: 'high',
                restrictions: ['Unknown license'],
              },
              isDirect: true,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to analyze cargo dependencies:', error);
    }

    return dependencies;
  }

  /**
   * Identify license from text content
   */
  private identifyLicense(content: string): LicenseInfo {
    const lowerContent = content.toLowerCase();

    // Check for common license patterns
    if (lowerContent.includes('mit license') || lowerContent.includes('permission is hereby granted')) {
      return this.licenseDatabase.get('MIT') || this.createUnknownLicense();
    }
    if (lowerContent.includes('apache license') || lowerContent.includes('apache software foundation')) {
      return this.licenseDatabase.get('Apache-2.0') || this.createUnknownLicense();
    }
    if (lowerContent.includes('gnu general public license') || lowerContent.includes('gpl')) {
      return this.licenseDatabase.get('GPL-3.0') || this.createUnknownLicense();
    }
    if (lowerContent.includes('bsd license') || lowerContent.includes('berkeley software distribution')) {
      return this.licenseDatabase.get('BSD-3-Clause') || this.createUnknownLicense();
    }
    if (lowerContent.includes('mozilla public license') || lowerContent.includes('mpl')) {
      return this.licenseDatabase.get('MPL-2.0') || this.createUnknownLicense();
    }

    return this.createUnknownLicense();
  }

  /**
   * Identify license from string
   */
  private identifyLicenseFromString(licenseString: string): LicenseInfo {
    const normalized = licenseString.toLowerCase().trim();
    
    // Check if it's a known license
    for (const [spdxId, licenseInfo] of this.licenseDatabase.entries()) {
      if (normalized.includes(spdxId.toLowerCase()) || 
          normalized.includes(licenseInfo.name.toLowerCase())) {
        return licenseInfo;
      }
    }

    // Check for common license strings
    if (normalized.includes('mit')) {
      return this.licenseDatabase.get('MIT') || this.createUnknownLicense();
    }
    if (normalized.includes('apache')) {
      return this.licenseDatabase.get('Apache-2.0') || this.createUnknownLicense();
    }
    if (normalized.includes('gpl')) {
      return this.licenseDatabase.get('GPL-3.0') || this.createUnknownLicense();
    }
    if (normalized.includes('bsd')) {
      return this.licenseDatabase.get('BSD-3-Clause') || this.createUnknownLicense();
    }

    return this.createUnknownLicense();
  }

  /**
   * Generate summary
   */
  private generateSummary(projectLicense: LicenseInfo | undefined, dependencies: DependencyLicense[]): any {
    const totalDependencies = dependencies.length;
    const directDependencies = dependencies.filter(d => d.isDirect).length;
    const indirectDependencies = totalDependencies - directDependencies;

    const riskDistribution = {
      low: dependencies.filter(d => d.license.riskLevel === 'low').length,
      medium: dependencies.filter(d => d.license.riskLevel === 'medium').length,
      high: dependencies.filter(d => d.license.riskLevel === 'high').length,
    };

    const licenseDistribution: Record<string, number> = {};
    dependencies.forEach(dep => {
      const licenseName = dep.license.name;
      licenseDistribution[licenseName] = (licenseDistribution[licenseName] || 0) + 1;
    });

    const complianceIssues: string[] = [];
    
    // Check for high-risk licenses
    const highRiskDeps = dependencies.filter(d => d.license.riskLevel === 'high');
    if (highRiskDeps.length > 0) {
      complianceIssues.push(`${highRiskDeps.length} dependencies with high-risk licenses`);
    }

    // Check for GPL dependencies
    const gplDeps = dependencies.filter(d => d.license.name.includes('GPL'));
    if (gplDeps.length > 0) {
      complianceIssues.push(`${gplDeps.length} GPL-licensed dependencies (copyleft)`);
    }

    // Check for unknown licenses
    const unknownDeps = dependencies.filter(d => d.license.name === 'Unknown');
    if (unknownDeps.length > 0) {
      complianceIssues.push(`${unknownDeps.length} dependencies with unknown licenses`);
    }

    return {
      totalDependencies,
      directDependencies,
      indirectDependencies,
      riskDistribution,
      licenseDistribution,
      complianceIssues,
    };
  }

  /**
   * Initialize license database
   */
  private initializeLicenseDatabase(): void {
    const licenses: Array<[string, LicenseInfo]> = [
      ['MIT', {
        name: 'MIT License',
        spdxId: 'MIT',
        isOsiApproved: true,
        isFsfApproved: true,
        riskLevel: 'low',
        restrictions: [],
      }],
      ['Apache-2.0', {
        name: 'Apache License 2.0',
        spdxId: 'Apache-2.0',
        isOsiApproved: true,
        isFsfApproved: true,
        riskLevel: 'low',
        restrictions: [],
      }],
      ['BSD-3-Clause', {
        name: 'BSD 3-Clause License',
        spdxId: 'BSD-3-Clause',
        isOsiApproved: true,
        isFsfApproved: true,
        riskLevel: 'low',
        restrictions: [],
      }],
      ['GPL-3.0', {
        name: 'GNU General Public License v3.0',
        spdxId: 'GPL-3.0',
        isOsiApproved: true,
        isFsfApproved: true,
        riskLevel: 'high',
        restrictions: ['Copyleft', 'Must distribute source code'],
      }],
      ['GPL-2.0', {
        name: 'GNU General Public License v2.0',
        spdxId: 'GPL-2.0',
        isOsiApproved: true,
        isFsfApproved: true,
        riskLevel: 'high',
        restrictions: ['Copyleft', 'Must distribute source code'],
      }],
      ['LGPL-3.0', {
        name: 'GNU Lesser General Public License v3.0',
        spdxId: 'LGPL-3.0',
        isOsiApproved: true,
        isFsfApproved: true,
        riskLevel: 'medium',
        restrictions: ['Copyleft for library modifications'],
      }],
      ['MPL-2.0', {
        name: 'Mozilla Public License 2.0',
        spdxId: 'MPL-2.0',
        isOsiApproved: true,
        isFsfApproved: true,
        riskLevel: 'medium',
        restrictions: ['File-level copyleft'],
      }],
      ['ISC', {
        name: 'ISC License',
        spdxId: 'ISC',
        isOsiApproved: true,
        isFsfApproved: true,
        riskLevel: 'low',
        restrictions: [],
      }],
      ['Unlicense', {
        name: 'The Unlicense',
        spdxId: 'Unlicense',
        isOsiApproved: true,
        isFsfApproved: false,
        riskLevel: 'low',
        restrictions: [],
      }],
    ];

    licenses.forEach(([spdxId, licenseInfo]) => {
      this.licenseDatabase.set(spdxId, licenseInfo);
    });
  }

  /**
   * Create unknown license
   */
  private createUnknownLicense(): LicenseInfo {
    return {
      name: 'Unknown',
      riskLevel: 'high',
      restrictions: ['Unknown license'],
    };
  }
}

