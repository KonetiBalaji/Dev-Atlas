// DevAtlas Coverage Analyzer Tests
// Created by Balaji Koneti

import { CoverageAnalyzer } from '../coverage';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('CoverageAnalyzer', () => {
  let analyzer: CoverageAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new CoverageAnalyzer();
    tempDir = path.join(__dirname, 'temp');
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('analyzeCoverage', () => {
    it('should return null when no coverage files are found', async () => {
      const result = await analyzer.analyzeCoverage(tempDir);
      expect(result).toBeNull();
    });

    it('should parse Jest coverage summary', async () => {
      // Create mock Jest coverage summary
      const coverageDir = path.join(tempDir, 'coverage');
      await fs.ensureDir(coverageDir);
      
      const coverageSummary = {
        total: {
          lines: { total: 100, covered: 80, pct: 80 },
          branches: { total: 50, covered: 40, pct: 80 },
          functions: { total: 20, covered: 18, pct: 90 },
        },
        'src/index.ts': {
          lines: { total: 50, covered: 40, pct: 80 },
          branches: { total: 25, covered: 20, pct: 80 },
          functions: { total: 10, covered: 9, pct: 90 },
        },
      };

      await fs.writeJSON(path.join(coverageDir, 'coverage-summary.json'), coverageSummary);

      const result = await analyzer.analyzeCoverage(tempDir);
      
      expect(result).not.toBeNull();
      expect(result?.overall.percentage).toBe(80);
      expect(result?.overall.total).toBe(100);
      expect(result?.overall.covered).toBe(80);
    });

    it('should parse LCOV coverage file', async () => {
      const lcovContent = `
SF:src/index.ts
LF:50
LH:40
BRF:25
BRH:20
end_of_record
SF:src/utils.ts
LF:30
LH:25
BRF:15
BRH:12
end_of_record
`;

      await fs.writeFile(path.join(tempDir, 'lcov.info'), lcovContent);

      const result = await analyzer.analyzeCoverage(tempDir);
      
      expect(result).not.toBeNull();
      expect(result?.overall.percentage).toBeCloseTo(81.25, 2); // (40+25)/(50+30) * 100
      expect(result?.overall.total).toBe(80);
      expect(result?.overall.covered).toBe(65);
    });

    it('should parse XML coverage file', async () => {
      const xmlContent = `
<?xml version="1.0" encoding="UTF-8"?>
<coverage line-rate="0.85" branch-rate="0.75">
  <packages>
    <package name="src" line-rate="0.85" branch-rate="0.75">
    </package>
  </packages>
</coverage>
`;

      await fs.writeFile(path.join(tempDir, 'coverage.xml'), xmlContent);

      const result = await analyzer.analyzeCoverage(tempDir);
      
      expect(result).not.toBeNull();
      expect(result?.overall.percentage).toBe(85);
    });
  });

  describe('getCoverageQualityScore', () => {
    it('should return 100 for 90%+ coverage', () => {
      const score = analyzer.getCoverageQualityScore({
        total: 100,
        covered: 95,
        percentage: 95,
      });
      expect(score).toBe(100);
    });

    it('should return 90 for 80-89% coverage', () => {
      const score = analyzer.getCoverageQualityScore({
        total: 100,
        covered: 85,
        percentage: 85,
      });
      expect(score).toBe(90);
    });

    it('should return 10 for <10% coverage', () => {
      const score = analyzer.getCoverageQualityScore({
        total: 100,
        covered: 5,
        percentage: 5,
      });
      expect(score).toBe(10);
    });
  });
});
