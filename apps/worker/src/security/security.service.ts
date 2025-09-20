import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class SecurityService {
  async analyze(repoPath: string): Promise<number> {
    console.log(`Running security analysis on path: ${repoPath}`);

    if (await this.pathExists(path.join(repoPath, 'package-lock.json'))) {
      return this.runNpmAudit(repoPath);
    }
    if (await this.pathExists(path.join(repoPath, 'requirements.txt'))) {
      return this.runPipAudit(repoPath);
    }

    console.log('No supported dependency files found for security scan.');
    return 0;
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  private async runNpmAudit(repoPath: string): Promise<number> {
    try {
      console.log('Running npm install for audit...');
      await execAsync('npm install --omit=dev', { cwd: repoPath });
      console.log('Running npm audit...');
      const { stdout } = await execAsync('npm audit --json', { cwd: repoPath });
      const auditResult = JSON.parse(stdout);
      return auditResult.metadata?.vulnerabilities?.total || 0;
    } catch (error) {
      if (error.stdout) {
        try {
          const auditResult = JSON.parse(error.stdout);
          const vulnerabilityCount = auditResult.metadata?.vulnerabilities?.total || 0;
          console.log(`npm audit found ${vulnerabilityCount} vulnerabilities.`);
          return vulnerabilityCount;
        } catch (parseError) {
          console.error('Failed to parse npm audit JSON output:', parseError);
          return -1;
        }
      }
      console.error('npm audit failed:', error);
      return -1;
    }
  }

  private async runPipAudit(repoPath: string): Promise<number> {
    try {
      console.log('Running pip-audit...');
      const command = `pip-audit -r ${path.join(repoPath, 'requirements.txt')} --json`;
      const { stdout } = await execAsync(command);
      const auditResult = JSON.parse(stdout);
      return auditResult.dependencies?.filter(d => d.vulns.length > 0).length || 0;
    } catch (error) {
      if (error.stdout) {
        try {
          const auditResult = JSON.parse(error.stdout);
          const vulnerabilityCount = auditResult.dependencies?.filter(d => d.vulns.length > 0).length || 0;
          console.log(`pip-audit found ${vulnerabilityCount} vulnerabilities.`);
          return vulnerabilityCount;
        } catch (parseError) {
          console.error('Failed to parse pip-audit JSON output:', parseError);
          return -1;
        }
      }
      console.error('pip-audit failed:', error);
      return -1;
    }
  }
}
