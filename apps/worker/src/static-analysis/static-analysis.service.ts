import { Injectable } from '@nestjs/common';
import { ESLint } from 'eslint';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class StaticAnalysisService {
  async analyze(path: string, language: string): Promise<number> {
    console.log(`Running static analysis for ${language} at ${path}`);
    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        return this.runEsLint(path);
      case 'python':
        return this.runRuff(path);
      default:
        console.log(`No static analysis tool for language: ${language}`);
        return 0;
    }
  }

  private async runEsLint(path: string): Promise<number> {
    try {
      const eslint = new ESLint({ cwd: path, overrideConfigFile: './.eslintrc.js' });
      const results = await eslint.lintFiles(['**/*.ts', '**/*.js']);
      const problemCount = results.reduce((acc, result) => acc + result.errorCount + result.warningCount, 0);
      console.log(`ESLint found ${problemCount} issues.`);
      return problemCount;
    } catch (error) {
      console.error('ESLint analysis failed:', error);
      return -1; // Indicate error
    }
  }

  private async runRuff(path: string): Promise<number> {
    try {
      // This assumes 'ruff' is in the system's PATH.
      const command = `ruff check ${path}`;
      const { stdout } = await execAsync(command);
      // Ruff prints one issue per line. Counting lines gives the issue count.
      const issueCount = stdout.split('\n').filter(line => line.trim() !== '').length;
      console.log(`Ruff found ${issueCount} issues.`);
      return issueCount;
    } catch (error) {
      // If ruff exits with a non-zero code but still prints to stdout, it means it found issues.
      if (error.stdout) {
         const issueCount = error.stdout.split('\n').filter(line => line.trim() !== '').length;
         console.log(`Ruff found ${issueCount} issues.`);
         return issueCount;
      }
      console.error('Ruff analysis failed:', error);
      return -1; // Indicate error
    }
  }
}
