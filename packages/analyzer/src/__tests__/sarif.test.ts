// DevAtlas SARIF Parser Tests
// Created by Balaji Koneti

import { SarifParser } from '../sarif';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('SarifParser', () => {
  let parser: SarifParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new SarifParser();
    tempDir = path.join(__dirname, 'temp');
  });

  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('parseSarifFile', () => {
    it('should return null when file does not exist', async () => {
      const result = await parser.parseSarifFile(path.join(tempDir, 'nonexistent.sarif'));
      expect(result).toBeNull();
    });

    it('should parse valid SARIF file', async () => {
      const sarifContent = {
        version: '2.1.0',
        runs: [
          {
            tool: {
              driver: {
                name: 'ESLint',
                version: '8.0.0',
              },
            },
            results: [
              {
                ruleId: 'no-unused-vars',
                level: 'warning',
                message: {
                  text: 'Unused variable',
                },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: {
                        uri: 'src/index.ts',
                      },
                      region: {
                        startLine: 10,
                        startColumn: 5,
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const sarifFile = path.join(tempDir, 'eslint.sarif');
      await fs.writeJSON(sarifFile, sarifContent);

      const result = await parser.parseSarifFile(sarifFile);
      
      expect(result).not.toBeNull();
      expect(result?.runs).toHaveLength(1);
      expect(result?.runs[0].results).toHaveLength(1);
      expect(result?.runs[0].results[0].ruleId).toBe('no-unused-vars');
    });
  });

  describe('parseSarifContent', () => {
    it('should parse SARIF content string', () => {
      const sarifContent = JSON.stringify({
        version: '2.1.0',
        runs: [
          {
            tool: {
              driver: {
                name: 'Bandit',
                version: '1.7.0',
              },
            },
            results: [
              {
                ruleId: 'B101',
                level: 'error',
                message: {
                  text: 'Use of assert detected',
                },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: {
                        uri: 'src/test.py',
                      },
                      region: {
                        startLine: 5,
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = parser.parseSarifContent(sarifContent);
      
      expect(result).not.toBeNull();
      expect(result?.runs).toHaveLength(1);
      expect(result?.runs[0].results).toHaveLength(1);
      expect(result?.runs[0].results[0].ruleId).toBe('B101');
    });

    it('should return null for invalid JSON', () => {
      const result = parser.parseSarifContent('invalid json');
      expect(result).toBeNull();
    });
  });

  describe('mapLevelToSeverity', () => {
    it('should map error to high severity', () => {
      const severity = parser.mapLevelToSeverity('error');
      expect(severity).toBe('high');
    });

    it('should map warning to medium severity', () => {
      const severity = parser.mapLevelToSeverity('warning');
      expect(severity).toBe('medium');
    });

    it('should map note to low severity', () => {
      const severity = parser.mapLevelToSeverity('note');
      expect(severity).toBe('low');
    });

    it('should default to medium severity', () => {
      const severity = parser.mapLevelToSeverity('unknown');
      expect(severity).toBe('medium');
    });
  });

  describe('convertToLintIssues', () => {
    it('should convert SARIF results to lint issues', () => {
      const sarifResults = [
        {
          ruleId: 'no-console',
          level: 'warning',
          message: { text: 'Console statement' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'src/index.ts' },
                region: { startLine: 10, startColumn: 5 },
              },
            },
          ],
        },
      ];

      const issues = parser.convertToLintIssues(sarifResults);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe('no-console');
      expect(issues[0].severity).toBe('medium');
      expect(issues[0].file).toBe('src/index.ts');
      expect(issues[0].line).toBe(10);
      expect(issues[0].column).toBe(5);
    });
  });

  describe('groupByTool', () => {
    it('should group results by tool', () => {
      const results = [
        { tool: 'ESLint', ruleId: 'no-unused-vars' },
        { tool: 'ESLint', ruleId: 'no-console' },
        { tool: 'Bandit', ruleId: 'B101' },
      ];

      const grouped = parser.groupByTool(results);
      
      expect(grouped['ESLint']).toHaveLength(2);
      expect(grouped['Bandit']).toHaveLength(1);
    });
  });

  describe('getSummary', () => {
    it('should generate summary statistics', () => {
      const results = [
        { level: 'error', ruleId: 'B101' },
        { level: 'warning', ruleId: 'no-unused-vars' },
        { level: 'warning', ruleId: 'no-console' },
        { level: 'note', ruleId: 'prefer-const' },
      ];

      const summary = parser.getSummary(results);
      
      expect(summary.total).toBe(4);
      expect(summary.bySeverity.high).toBe(1);
      expect(summary.bySeverity.medium).toBe(2);
      expect(summary.bySeverity.low).toBe(1);
    });
  });
});
