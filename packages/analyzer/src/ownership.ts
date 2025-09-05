// DevAtlas Ownership Analysis
// Created by Balaji Koneti

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import { OwnershipInfo } from './types';

const execAsync = promisify(exec);

export class OwnershipAnalyzer {
  private readonly tempDir: string;

  constructor(tempDir: string = '/tmp/devatlas') {
    this.tempDir = tempDir;
  }

  /**
   * Analyze code ownership using git blame
   */
  async analyzeOwnership(repoPath: string): Promise<OwnershipInfo[]> {
    console.log(`👥 Analyzing code ownership for: ${repoPath}`);

    const ownershipData: OwnershipInfo[] = [];

    try {
      // Get all tracked files
      const files = await this.getTrackedFiles(repoPath);
      
      // Group files by directory
      const directoryGroups = this.groupFilesByDirectory(files);
      
      // Analyze ownership for each directory
      for (const [dirPath, dirFiles] of Object.entries(directoryGroups)) {
        const ownership = await this.analyzeDirectoryOwnership(repoPath, dirPath, dirFiles);
        if (ownership) {
          ownershipData.push(ownership);
        }
      }
    } catch (error) {
      console.warn('Ownership analysis failed:', error);
    }

    return ownershipData;
  }

  /**
   * Get all tracked files in the repository
   */
  private async getTrackedFiles(repoPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `cd "${repoPath}" && git ls-files`,
        { timeout: 30000 }
      );

      return stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      console.warn('Failed to get tracked files:', error);
      return [];
    }
  }

  /**
   * Group files by directory
   */
  private groupFilesByDirectory(files: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};

    for (const file of files) {
      const dir = path.dirname(file);
      if (!groups[dir]) {
        groups[dir] = [];
      }
      groups[dir].push(file);
    }

    return groups;
  }

  /**
   * Analyze ownership for a specific directory
   */
  private async analyzeDirectoryOwnership(
    repoPath: string,
    dirPath: string,
    files: string[]
  ): Promise<OwnershipInfo | null> {
    try {
      const authorStats = new Map<string, { lines: number; commits: number }>();
      let totalLines = 0;
      let totalCommits = 0;

      // Analyze each file in the directory
      for (const file of files) {
        const fileStats = await this.analyzeFileOwnership(repoPath, file);
        if (fileStats) {
          totalLines += fileStats.totalLines;
          totalCommits += fileStats.totalCommits;

          for (const [author, stats] of Object.entries(fileStats.authors)) {
            const existing = authorStats.get(author) || { lines: 0, commits: 0 };
            authorStats.set(author, {
              lines: existing.lines + stats.lines,
              commits: existing.commits + stats.commits,
            });
          }
        }
      }

      if (authorStats.size === 0) {
        return null;
      }

      // Convert to array and calculate percentages
      const authors = Array.from(authorStats.entries()).map(([author, stats]) => ({
        author: this.normalizeAuthor(author),
        lines: stats.lines,
        percentage: (stats.lines / totalLines) * 100,
        commits: stats.commits,
      }));

      // Sort by lines contributed
      authors.sort((a, b) => b.lines - a.lines);

      return {
        path: dirPath,
        authors,
        totalLines,
        totalCommits,
      };
    } catch (error) {
      console.warn(`Failed to analyze ownership for ${dirPath}:`, error);
      return null;
    }
  }

  /**
   * Analyze ownership for a specific file
   */
  private async analyzeFileOwnership(
    repoPath: string,
    filePath: string
  ): Promise<{ authors: Record<string, { lines: number; commits: number }>; totalLines: number; totalCommits: number } | null> {
    try {
      // Get git blame output
      const { stdout } = await execAsync(
        `cd "${repoPath}" && git blame --line-porcelain "${filePath}"`,
        { timeout: 10000 }
      );

      const authorStats: Record<string, { lines: number; commits: number }> = {};
      const commitSet = new Set<string>();
      let totalLines = 0;

      const lines = stdout.split('\n');
      let currentCommit = '';
      let currentAuthor = '';

      for (const line of lines) {
        if (line.startsWith('commit ')) {
          currentCommit = line.substring(7);
        } else if (line.startsWith('author ')) {
          currentAuthor = line.substring(7);
        } else if (line.startsWith('\t')) {
          // This is the actual line content
          totalLines++;
          commitSet.add(currentCommit);

          if (!authorStats[currentAuthor]) {
            authorStats[currentAuthor] = { lines: 0, commits: 0 };
          }
          authorStats[currentAuthor].lines++;
        }
      }

      // Count commits per author
      for (const [author, stats] of Object.entries(authorStats)) {
        stats.commits = await this.countCommitsByAuthor(repoPath, filePath, author);
      }

      return {
        authors: authorStats,
        totalLines,
        totalCommits: commitSet.size,
      };
    } catch (error) {
      console.warn(`Failed to analyze file ownership for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Count commits by a specific author for a file
   */
  private async countCommitsByAuthor(
    repoPath: string,
    filePath: string,
    author: string
  ): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `cd "${repoPath}" && git log --author="${author}" --oneline "${filePath}" | wc -l`,
        { timeout: 5000 }
      );

      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Normalize author name/email
   */
  private normalizeAuthor(author: string): string {
    // Extract email from author string if present
    const emailMatch = author.match(/<(.+)>/);
    if (emailMatch) {
      return emailMatch[1];
    }

    // Clean up author name
    return author.trim().replace(/[<>]/g, '');
  }

  /**
   * Get top contributors for the entire repository
   */
  async getTopContributors(repoPath: string, limit: number = 10): Promise<Array<{
    author: string;
    commits: number;
    lines: number;
    percentage: number;
  }>> {
    try {
      const { stdout } = await execAsync(
        `cd "${repoPath}" && git shortlog -sn --all`,
        { timeout: 10000 }
      );

      const contributors = stdout.trim().split('\n').map(line => {
        const match = line.match(/^\s*(\d+)\s+(.+)$/);
        if (match) {
          return {
            author: this.normalizeAuthor(match[2]),
            commits: parseInt(match[1]),
            lines: 0, // Will be calculated separately
            percentage: 0, // Will be calculated separately
          };
        }
        return null;
      }).filter(Boolean);

      // Get total commit count
      const { stdout: totalCommits } = await execAsync(
        `cd "${repoPath}" && git rev-list --count --all`,
        { timeout: 5000 }
      );

      const total = parseInt(totalCommits.trim()) || 1;

      // Calculate percentages and add line counts
      for (const contributor of contributors) {
        if (contributor) {
          contributor.percentage = (contributor.commits / total) * 100;
          contributor.lines = await this.getLinesByAuthor(repoPath, contributor.author);
        }
      }

      return contributors.slice(0, limit);
    } catch (error) {
      console.warn('Failed to get top contributors:', error);
      return [];
    }
  }

  /**
   * Get lines contributed by a specific author
   */
  private async getLinesByAuthor(repoPath: string, author: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `cd "${repoPath}" && git log --author="${author}" --pretty=tformat: --numstat | awk '{ add += \$1; subs += \$2; loc += \$1 - \$2 } END { print loc }'`,
        { timeout: 10000 }
      );

      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get commit activity over time
   */
  async getCommitActivity(repoPath: string, days: number = 365): Promise<Array<{
    date: string;
    commits: number;
    authors: string[];
  }>> {
    try {
      const { stdout } = await execAsync(
        `cd "${repoPath}" && git log --since="${days} days ago" --pretty=format:"%ad|%an" --date=short`,
        { timeout: 10000 }
      );

      const activity: Record<string, { commits: number; authors: Set<string> }> = {};

      for (const line of stdout.trim().split('\n')) {
        const [date, author] = line.split('|');
        if (date && author) {
          if (!activity[date]) {
            activity[date] = { commits: 0, authors: new Set() };
          }
          activity[date].commits++;
          activity[date].authors.add(author);
        }
      }

      return Object.entries(activity).map(([date, data]) => ({
        date,
        commits: data.commits,
        authors: Array.from(data.authors),
      })).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.warn('Failed to get commit activity:', error);
      return [];
    }
  }
}