import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

const README_CHECKLIST = [
  { key: 'quick-start', pattern: /quick start|getting started|setup|installation/i },
  { key: 'environment', pattern: /environment variables|configuration/i },
  { key: 'contributing', pattern: /contributing|contribution guide/i },
  { key: 'license', pattern: /license/i },
  { key: 'api-docs', pattern: /api reference|api documentation/i },
  { key: 'examples', pattern: /examples|usage/i },
];

@Injectable()
export class DocsService {
  async analyzeReadme(repoPath: string): Promise<number> {
    console.log('Analyzing README...');
    const readmePath = await this.findReadme(repoPath);

    if (!readmePath) {
      console.log('No README file found.');
      return 0;
    }

    const content = await fs.readFile(readmePath, 'utf-8');
    let score = 0;
    const maxScore = README_CHECKLIST.length;

    for (const item of README_CHECKLIST) {
      if (item.pattern.test(content)) {
        score++;
      }
    }

    const finalScore = Math.round((score / maxScore) * 100);
    console.log(`README analysis complete. Score: ${finalScore}`);
    return finalScore;
  }

  private async findReadme(repoPath: string): Promise<string | null> {
    try {
      const files = await fs.readdir(repoPath);
      const readmeFile = files.find(file => file.toLowerCase() === 'readme.md');
      return readmeFile ? path.join(repoPath, readmeFile) : null;
    } catch (error) {
      console.error('Failed to read directory for README', error);
      return null;
    }
  }
}
