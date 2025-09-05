// DevAtlas License Analyzer Tests
// Created by Balaji Koneti

import { LicenseAnalyzer } from '../license';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('LicenseAnalyzer', () => {
  let analyzer: LicenseAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new LicenseAnalyzer();
    tempDir = path.join(__dirname, 'temp');
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('analyzeLicenses', () => {
    it('should return null when no package files are found', async () => {
      const result = await analyzer.analyzeLicenses(tempDir);
      expect(result).toBeNull();
    });

    it('should analyze npm package.json', async () => {
      const packageJson = {
        name: 'test-package',
        version: '1.0.0',
        license: 'MIT',
        dependencies: {
          'lodash': '^4.17.21',
          'react': '^18.0.0',
        },
      };

      await fs.writeJSON(path.join(tempDir, 'package.json'), packageJson);

      const result = await analyzer.analyzeLicenses(tempDir);
      
      expect(result).not.toBeNull();
      expect(result?.projectLicense?.name).toBe('MIT');
      expect(result?.projectLicense?.spdxId).toBe('MIT');
      expect(result?.projectLicense?.riskLevel).toBe('low');
    });

    it('should analyze Python requirements.txt', async () => {
      const requirements = `
requests==2.28.1
numpy==1.21.0
pandas==1.3.0
`;

      await fs.writeFile(path.join(tempDir, 'requirements.txt'), requirements);

      const result = await analyzer.analyzeLicenses(tempDir);
      
      expect(result).not.toBeNull();
      expect(result?.dependencies.length).toBeGreaterThan(0);
    });

    it('should analyze Rust Cargo.toml', async () => {
      const cargoToml = `
[package]
name = "test-crate"
version = "0.1.0"
license = "MIT"

[dependencies]
serde = "1.0"
tokio = "1.0"
`;

      await fs.writeFile(path.join(tempDir, 'Cargo.toml'), cargoToml);

      const result = await analyzer.analyzeLicenses(tempDir);
      
      expect(result).not.toBeNull();
      expect(result?.projectLicense?.name).toBe('MIT');
    });
  });

  describe('identifyLicense', () => {
    it('should identify MIT license', () => {
      const license = analyzer.identifyLicense('MIT');
      expect(license.name).toBe('MIT');
      expect(license.spdxId).toBe('MIT');
      expect(license.riskLevel).toBe('low');
    });

    it('should identify GPL license as high risk', () => {
      const license = analyzer.identifyLicense('GPL-3.0');
      expect(license.name).toBe('GPL-3.0');
      expect(license.riskLevel).toBe('high');
      expect(license.restrictions).toContain('copyleft');
    });

    it('should identify unknown license', () => {
      const license = analyzer.identifyLicense('UNKNOWN');
      expect(license.name).toBe('UNKNOWN');
      expect(license.riskLevel).toBe('high');
    });
  });

  describe('generateSummary', () => {
    it('should generate license summary', () => {
      const dependencies = [
        {
          package: 'lodash',
          version: '4.17.21',
          license: analyzer.identifyLicense('MIT'),
          isDirect: true,
        },
        {
          package: 'react',
          version: '18.0.0',
          license: analyzer.identifyLicense('MIT'),
          isDirect: true,
        },
        {
          package: 'gpl-package',
          version: '1.0.0',
          license: analyzer.identifyLicense('GPL-3.0'),
          isDirect: false,
        },
      ];

      const summary = analyzer.generateSummary(dependencies);
      
      expect(summary.total).toBe(3);
      expect(summary.byRisk.low).toBe(2);
      expect(summary.byRisk.high).toBe(1);
      expect(summary.byLicense['MIT']).toBe(2);
      expect(summary.byLicense['GPL-3.0']).toBe(1);
    });
  });
});
