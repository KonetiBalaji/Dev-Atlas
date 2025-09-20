import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ClocOutput {
    [language: string]: {
        nFiles: number;
        blank: number;
        comment: number;
        code: number;
    };
    SUM?: {
        nFiles: number;
        blank: number;
        comment: number;
        code: number;
    }
}

@Injectable()
export class InventoryService {
  async analyze(path: string): Promise<ClocOutput> {
    console.log(`Running cloc on path: ${path}`);
    try {
      // The --json flag outputs the results in JSON format
      const { stdout } = await execAsync(`cloc --json ${path}`);
      const results: ClocOutput = JSON.parse(stdout);
      console.log('cloc analysis successful.');
      return results;
    } catch (error) {
      console.error('cloc analysis failed:', error);
      throw error;
    }
  }
}
