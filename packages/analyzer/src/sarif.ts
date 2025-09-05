// DevAtlas SARIF Parser
// Created by Balaji Koneti

import * as fs from 'fs-extra';
import * as path from 'path';

export interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note' | 'none';
  message: {
    text: string;
  };
  locations: Array<{
    physicalLocation: {
      artifactLocation: {
        uri: string;
      };
      region: {
        startLine: number;
        startColumn?: number;
        endLine?: number;
        endColumn?: number;
      };
    };
  }>;
  properties?: {
    tags?: string[];
    precision?: string;
    severity?: string;
  };
}

export interface SarifRun {
  tool: {
    driver: {
      name: string;
      version?: string;
      rules: Array<{
        id: string;
        name?: string;
        shortDescription?: {
          text: string;
        };
        fullDescription?: {
          text: string;
        };
        properties?: {
          tags?: string[];
          precision?: string;
          severity?: string;
        };
      }>;
    };
  };
  results: SarifResult[];
}

export interface SarifLog {
  version: string;
  runs: SarifRun[];
}

export interface ParsedSarifResult {
  tool: string;
  ruleId: string;
  level: string;
  message: string;
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity: string;
  tags: string[];
  precision: string;
}

export class SarifParser {
  /**
   * Parse SARIF file
   */
  async parseSarifFile(filePath: string): Promise<ParsedSarifResult[]> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const sarifLog: SarifLog = JSON.parse(content);
      
      return this.parseSarifLog(sarifLog);
    } catch (error) {
      console.warn(`Failed to parse SARIF file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Parse SARIF content
   */
  parseSarifContent(content: string): ParsedSarifResult[] {
    try {
      const sarifLog: SarifLog = JSON.parse(content);
      return this.parseSarifLog(sarifLog);
    } catch (error) {
      console.warn('Failed to parse SARIF content:', error);
      return [];
    }
  }

  /**
   * Parse SARIF log object
   */
  private parseSarifLog(sarifLog: SarifLog): ParsedSarifResult[] {
    const results: ParsedSarifResult[] = [];

    for (const run of sarifLog.runs) {
      const toolName = run.tool.driver.name;
      const rules = new Map(run.tool.driver.rules.map(rule => [rule.id, rule]));

      for (const result of run.results) {
        const rule = rules.get(result.ruleId);
        
        for (const location of result.locations) {
          const physicalLocation = location.physicalLocation;
          const artifactLocation = physicalLocation.artifactLocation;
          const region = physicalLocation.region;

          const parsedResult: ParsedSarifResult = {
            tool: toolName,
            ruleId: result.ruleId,
            level: result.level,
            message: result.message.text,
            file: this.normalizeFilePath(artifactLocation.uri),
            line: region.startLine,
            column: region.startColumn,
            endLine: region.endLine,
            endColumn: region.endColumn,
            severity: this.mapLevelToSeverity(result.level),
            tags: this.extractTags(result, rule),
            precision: this.extractPrecision(result, rule),
          };

          results.push(parsedResult);
        }
      }
    }

    return results;
  }

  /**
   * Map SARIF level to severity
   */
  private mapLevelToSeverity(level: string): string {
    switch (level) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'note': return 'info';
      case 'none': return 'info';
      default: return 'info';
    }
  }

  /**
   * Extract tags from result and rule
   */
  private extractTags(result: SarifResult, rule: any): string[] {
    const tags = new Set<string>();

    if (result.properties?.tags) {
      result.properties.tags.forEach(tag => tags.add(tag));
    }

    if (rule?.properties?.tags) {
      rule.properties.tags.forEach(tag => tags.add(tag));
    }

    return Array.from(tags);
  }

  /**
   * Extract precision from result and rule
   */
  private extractPrecision(result: SarifResult, rule: any): string {
    return result.properties?.precision || rule?.properties?.precision || 'unknown';
  }

  /**
   * Normalize file path
   */
  private normalizeFilePath(uri: string): string {
    // Remove file:// protocol if present
    if (uri.startsWith('file://')) {
      uri = uri.substring(7);
    }

    // Normalize path separators
    return uri.replace(/\\/g, '/');
  }

  /**
   * Convert parsed results to lint issues format
   */
  convertToLintIssues(results: ParsedSarifResult[]): Array<{
    file: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    rule: string;
    source: string;
  }> {
    return results.map(result => ({
      file: result.file,
      line: result.line,
      column: result.column || 0,
      severity: result.severity as 'error' | 'warning' | 'info',
      message: result.message,
      rule: result.ruleId,
      source: result.tool,
    }));
  }

  /**
   * Group results by tool
   */
  groupByTool(results: ParsedSarifResult[]): Record<string, ParsedSarifResult[]> {
    const grouped: Record<string, ParsedSarifResult[]> = {};

    for (const result of results) {
      if (!grouped[result.tool]) {
        grouped[result.tool] = [];
      }
      grouped[result.tool].push(result);
    }

    return grouped;
  }

  /**
   * Group results by severity
   */
  groupBySeverity(results: ParsedSarifResult[]): Record<string, ParsedSarifResult[]> {
    const grouped: Record<string, ParsedSarifResult[]> = {};

    for (const result of results) {
      if (!grouped[result.severity]) {
        grouped[result.severity] = [];
      }
      grouped[result.severity].push(result);
    }

    return grouped;
  }

  /**
   * Get summary statistics
   */
  getSummary(results: ParsedSarifResult[]): {
    total: number;
    byTool: Record<string, number>;
    bySeverity: Record<string, number>;
    byRule: Record<string, number>;
  } {
    const summary = {
      total: results.length,
      byTool: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byRule: {} as Record<string, number>,
    };

    for (const result of results) {
      summary.byTool[result.tool] = (summary.byTool[result.tool] || 0) + 1;
      summary.bySeverity[result.severity] = (summary.bySeverity[result.severity] || 0) + 1;
      summary.byRule[result.ruleId] = (summary.byRule[result.ruleId] || 0) + 1;
    }

    return summary;
  }

  /**
   * Filter results by criteria
   */
  filterResults(
    results: ParsedSarifResult[],
    criteria: {
      tool?: string;
      severity?: string;
      ruleId?: string;
      file?: string;
      minLine?: number;
      maxLine?: number;
    }
  ): ParsedSarifResult[] {
    return results.filter(result => {
      if (criteria.tool && result.tool !== criteria.tool) return false;
      if (criteria.severity && result.severity !== criteria.severity) return false;
      if (criteria.ruleId && result.ruleId !== criteria.ruleId) return false;
      if (criteria.file && !result.file.includes(criteria.file)) return false;
      if (criteria.minLine && result.line < criteria.minLine) return false;
      if (criteria.maxLine && result.line > criteria.maxLine) return false;
      return true;
    });
  }
}

