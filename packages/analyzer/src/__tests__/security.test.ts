// DevAtlas Security Analysis Tests
// Created by Balaji Koneti

import { SecurityAnalyzer } from '../security';
import * as fs from 'fs-extra';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('SecurityAnalyzer', () => {
  let analyzer: SecurityAnalyzer;
  const mockRepoPath = '/tmp/test-repo';

  beforeEach(() => {
    analyzer = new SecurityAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyzeSecurity', () => {
    it('should analyze npm security vulnerabilities', async () => {
      // Mock package.json
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === '/tmp/test-repo/package.json';
      });

      mockedFs.readJSON.mockResolvedValue({
        dependencies: { 'lodash': '^4.17.0' },
        devDependencies: { 'eslint': '^8.0.0' },
      });

      // Mock npm audit output
      const mockNpmAuditOutput = JSON.stringify({
        vulnerabilities: {
          'lodash': {
            id: 'lodash-123',
            severity: 'high',
            title: 'Prototype Pollution in lodash',
            overview: 'A vulnerability in lodash allows prototype pollution',
            range: '>=4.17.0 <4.17.12',
            fixAvailable: { version: '4.17.12' },
            cves: ['CVE-2021-23337'],
          },
        },
      });

      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        if (command.includes('npm audit')) {
          callback(null, { stdout: mockNpmAuditOutput, stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await analyzer.analyzeSecurity(mockRepoPath);

      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0]).toMatchObject({
        id: 'lodash-123',
        severity: 'high',
        title: 'Prototype Pollution in lodash',
        description: 'A vulnerability in lodash allows prototype pollution',
        package: 'lodash',
        version: '>=4.17.0 <4.17.12',
        fixedIn: '4.17.12',
        cve: 'CVE-2021-23337',
        source: 'npm-audit',
      });
      expect(result.dependencyCount).toBe(2);
    });

    it('should analyze pip security vulnerabilities', async () => {
      // Mock requirements.txt
      mockedFs.existsSync.mockImplementation((filePath) => {
        return filePath === '/tmp/test-repo/requirements.txt';
      });

      mockedFs.readFile.mockResolvedValue('requests==2.25.0\nflask==1.1.0');

      // Mock pip-audit output
      const mockPipAuditOutput = JSON.stringify({
        vulnerabilities: [
          {
            id: 'requests-456',
            severity: 'medium',
            summary: 'Insecure SSL verification in requests',
            description: 'Requests library has insecure SSL verification',
            package: 'requests',
            installed_version: '2.25.0',
            fixed_version: '2.25.1',
          },
        ],
      });

      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        if (command.includes('pip_audit')) {
          callback(null, { stdout: mockPipAuditOutput, stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await analyzer.analyzeSecurity(mockRepoPath);

      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0]).toMatchObject({
        id: 'requests-456',
        severity: 'medium',
        title: 'Insecure SSL verification in requests',
        description: 'Requests library has insecure SSL verification',
        package: 'requests',
        version: '2.25.0',
        fixedIn: '2.25.1',
        cve: 'requests-456',
        source: 'pip-audit',
      });
      expect(result.dependencyCount).toBe(2);
    });

    it('should detect secrets in files', async () => {
      // Mock file system
      mockedFs.existsSync.mockImplementation(() => true);

      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        if (command.includes('file')) {
          callback(null, { 
            stdout: '/tmp/test-repo/config.js: ASCII text\n/tmp/test-repo/README.md: ASCII text', 
            stderr: '' 
          });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      // Mock file content with secrets
      mockedFs.readFile.mockImplementation((filePath) => {
        if (filePath === '/tmp/test-repo/config.js') {
          return Promise.resolve(`
            const config = {
              apiKey: 'AKIA1234567890ABCDEF',
              secret: 'ghp_1234567890abcdef1234567890abcdef12345678',
              database: 'mongodb://user:password@localhost:27017/db'
            };
          `);
        }
        return Promise.resolve('No secrets here');
      });

      const result = await analyzer.analyzeSecurity(mockRepoPath);

      expect(result.secrets.length).toBeGreaterThan(0);
      
      const awsKey = result.secrets.find(s => s.type === 'aws_key');
      expect(awsKey).toBeDefined();
      expect(awsKey?.value).toContain('***');

      const githubToken = result.secrets.find(s => s.type === 'github_token');
      expect(githubToken).toBeDefined();
      expect(githubToken?.value).toContain('***');

      const dbUrl = result.secrets.find(s => s.type === 'database_url');
      expect(dbUrl).toBeDefined();
      expect(dbUrl?.value).toContain('***');
    });

    it('should handle analysis errors gracefully', async () => {
      const { exec } = require('child_process');
      exec.mockImplementation((command, callback) => {
        callback(new Error('Security analysis failed'), { stdout: '', stderr: 'Error' });
      });

      const result = await analyzer.analyzeSecurity(mockRepoPath);

      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.secrets).toHaveLength(0);
      expect(result.dependencyCount).toBe(0);
    });
  });

  describe('detectSecrets', () => {
    it('should detect AWS keys', async () => {
      const content = 'const key = "AKIA1234567890ABCDEF";';
      const secrets = await (analyzer as any).scanForSecrets(content, 'test.js');

      expect(secrets).toHaveLength(1);
      expect(secrets[0]).toMatchObject({
        file: 'test.js',
        line: 1,
        type: 'aws_key',
        confidence: expect.any(Number),
        value: expect.stringContaining('***'),
      });
    });

    it('should detect GitHub tokens', async () => {
      const content = 'const token = "ghp_1234567890abcdef1234567890abcdef12345678";';
      const secrets = await (analyzer as any).scanForSecrets(content, 'test.js');

      expect(secrets).toHaveLength(1);
      expect(secrets[0]).toMatchObject({
        file: 'test.js',
        line: 1,
        type: 'github_token',
        confidence: expect.any(Number),
        value: expect.stringContaining('***'),
      });
    });

    it('should detect API keys', async () => {
      const content = 'const apiKey = "sk-1234567890abcdef1234567890abcdef";';
      const secrets = await (analyzer as any).scanForSecrets(content, 'test.js');

      expect(secrets).toHaveLength(1);
      expect(secrets[0]).toMatchObject({
        file: 'test.js',
        line: 1,
        type: 'api_key',
        confidence: expect.any(Number),
        value: expect.stringContaining('***'),
      });
    });

    it('should detect database URLs', async () => {
      const content = 'const dbUrl = "postgresql://user:password@localhost:5432/db";';
      const secrets = await (analyzer as any).scanForSecrets(content, 'test.js');

      expect(secrets).toHaveLength(1);
      expect(secrets[0]).toMatchObject({
        file: 'test.js',
        line: 1,
        type: 'database_url',
        confidence: expect.any(Number),
        value: expect.stringContaining('***'),
      });
    });
  });

  describe('calculateEntropy', () => {
    it('should calculate entropy for random strings', () => {
      const highEntropy = (analyzer as any).calculateEntropy('abcdefghijklmnopqrstuvwxyz1234567890');
      const lowEntropy = (analyzer as any).calculateEntropy('aaaaaaaaaa');

      expect(highEntropy).toBeGreaterThan(lowEntropy);
      expect(highEntropy).toBeGreaterThan(4); // High entropy
      expect(lowEntropy).toBeLessThan(1); // Low entropy
    });
  });

  describe('redactSecret', () => {
    it('should redact secrets properly', () => {
      const shortSecret = (analyzer as any).redactSecret('abc');
      const longSecret = (analyzer as any).redactSecret('abcdefghijklmnopqrstuvwxyz1234567890');

      expect(shortSecret).toBe('***');
      expect(longSecret).toBe('abcd***7890');
    });
  });
});

