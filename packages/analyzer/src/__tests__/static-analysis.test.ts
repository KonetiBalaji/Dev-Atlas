// DevAtlas Static Analysis Tests
// Created by Balaji Koneti

import { StaticAnalyzer } from '../static-analysis';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('StaticAnalyzer', () => {
  let analyzer: StaticAnalyzer;
  const mockRepoPath = '/tmp/test-repo';

  beforeEach(() => {
    analyzer = new StaticAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyzeRepository', () => {
    it('should analyze JavaScript repository', async () => {
      // Mock file system
      mockedFs.existsSync.mockImplementation((filePath) => {
        if (filePath === path.join(mockRepoPath, 'package.json')) return true;
        if (filePath === path.join(mockRepoPath, '.eslintrc.json')) return true;
        return false;
      });

      mockedFs.readJSON.mockResolvedValue({
        dependencies: { 'react': '^18.0.0' },
        devDependencies: { 'eslint': '^8.0.0' },
      });

      // Mock ESLint output
      const mockESLintOutput = JSON.stringify([
        {
          filePath: 'src/index.js',
          messages: [
            {
              line: 1,
              column: 1,
              severity: 2,
              message: 'Unexpected console statement',
              ruleId: 'no-console',
            },
          ],
        },
      ]);

      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        if (command.includes('eslint')) {
          callback(null, { stdout: mockESLintOutput, stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await analyzer.analyzeRepository(mockRepoPath);

      expect(result.lintIssues).toHaveLength(1);
      expect(result.lintIssues[0]).toMatchObject({
        file: 'src/index.js',
        line: 1,
        column: 1,
        severity: 'error',
        message: 'Unexpected console statement',
        rule: 'no-console',
        source: 'eslint',
      });
    });

    it('should analyze Python repository', async () => {
      // Mock file system
      mockedFs.existsSync.mockImplementation((filePath) => {
        if (filePath === path.join(mockRepoPath, 'requirements.txt')) return true;
        if (filePath === path.join(mockRepoPath, 'main.py')) return true;
        return false;
      });

      // Mock Ruff output
      const mockRuffOutput = JSON.stringify([
        {
          filename: 'main.py',
          location: { row: 1, column: 1 },
          code: 'E501',
          message: 'Line too long',
        },
      ]);

      // Mock Bandit output
      const mockBanditOutput = JSON.stringify({
        results: [
          {
            filename: 'main.py',
            line_number: 5,
            issue_severity: 'HIGH',
            issue_text: 'Use of hardcoded password',
            test_id: 'B105',
          },
        ],
      });

      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        if (command.includes('ruff')) {
          callback(null, { stdout: mockRuffOutput, stderr: '' });
        } else if (command.includes('bandit')) {
          callback(null, { stdout: mockBanditOutput, stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await analyzer.analyzeRepository(mockRepoPath);

      expect(result.lintIssues).toHaveLength(2);
      expect(result.lintIssues[0]).toMatchObject({
        file: 'main.py',
        line: 1,
        column: 1,
        severity: 'error',
        message: 'Line too long',
        rule: 'E501',
        source: 'ruff',
      });
      expect(result.lintIssues[1]).toMatchObject({
        file: 'main.py',
        line: 5,
        column: 0,
        severity: 'error',
        message: 'Use of hardcoded password',
        rule: 'B105',
        source: 'bandit',
      });
    });

    it('should handle analysis errors gracefully', async () => {
      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        callback(new Error('Analysis failed'), { stdout: '', stderr: 'Error' });
      });

      const result = await analyzer.analyzeRepository(mockRepoPath);

      expect(result.lintIssues).toHaveLength(0);
      expect(result.complexity).toMatchObject({
        average: 0,
        max: 0,
        distribution: { low: 0, medium: 0, high: 0 },
      });
    });
  });

  describe('detectLanguages', () => {
    it('should detect JavaScript from package.json', async () => {
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === path.join(mockRepoPath, 'package.json');
      });

      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        if (command.includes('find')) {
          callback(null, { stdout: 'src/index.js\nsrc/app.js', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const languages = await (analyzer as any).detectLanguages(mockRepoPath);

      expect(languages).toContain('javascript');
    });

    it('should detect TypeScript from tsconfig.json', async () => {
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === path.join(mockRepoPath, 'tsconfig.json');
      });

      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        if (command.includes('find')) {
          callback(null, { stdout: 'src/index.ts\nsrc/app.tsx', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const languages = await (analyzer as any).detectLanguages(mockRepoPath);

      expect(languages).toContain('typescript');
    });

    it('should detect Python from requirements.txt', async () => {
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === path.join(mockRepoPath, 'requirements.txt');
      });

      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        if (command.includes('find')) {
          callback(null, { stdout: 'main.py\nutils.py', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const languages = await (analyzer as any).detectLanguages(mockRepoPath);

      expect(languages).toContain('python');
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity metrics from lint issues', () => {
      const mockIssues = [
        {
          rule: 'complexity',
          message: 'Function complexity is 15',
        },
        {
          rule: 'complexity',
          message: 'Function complexity is 8',
        },
        {
          rule: 'other',
          message: 'Some other issue',
        },
      ];

      const complexity = (analyzer as any).calculateComplexity(mockIssues, {});

      expect(complexity.average).toBe(11.5); // (15 + 8) / 2
      expect(complexity.max).toBe(15);
      expect(complexity.distribution).toMatchObject({
        low: 0,
        medium: 1, // 8 is medium
        high: 1,   // 15 is high
      });
    });
  });
});

