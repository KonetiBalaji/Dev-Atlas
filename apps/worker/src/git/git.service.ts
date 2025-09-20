import { Injectable } from '@nestjs/common';
import simpleGit, { SimpleGit, BlameResult } from 'simple-git';
import * as fs from 'fs/promises';

@Injectable()
export class GitService {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  async clone(repoUrl: string, localPath: string): Promise<void> {
    console.log(`Cloning ${repoUrl} into ${localPath}...`);
    // Ensure the directory is clean before cloning
    await fs.rm(localPath, { recursive: true, force: true });
    await this.git.clone(repoUrl, localPath, { '--depth': 1 });
    console.log('Clone successful.');
  }

  async getBlameSummary(repoPath: string): Promise<Map<string, number>> {
    console.log('Analyzing git blame...');
    const git = simpleGit(repoPath);
    const files = await git.raw(['ls-files']);
    const fileList = files.split('\n').filter(f => f);

    const blameSummary = new Map<string, number>();

    for (const file of fileList) {
        try {
            const blameResult: BlameResult = await git.blame(['--', file]);
            for (const line of blameResult.lines) {
                const author = line.author.trim();
                blameSummary.set(author, (blameSummary.get(author) || 0) + 1);
            }
        } catch (error) {
            // Ignoring errors for binary files or files that can't be blamed
            console.warn(`Could not blame file: ${file}. Skipping.`);
        }
    }
    console.log('Blame analysis complete.');
    return blameSummary;
  }
}
