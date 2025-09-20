import { LlmGatewayService } from './llm-gateway.service';

export interface AnalysisMetrics {
    handle: string;
    dominantLanguage: string;
    totalLoc: number;
    lintIssues: number;
    vulnCount: number;
    readmeScore: number;
}

export class AiService {
  constructor(private readonly llmGateway: LlmGatewayService) {}

  async summarizeRepo(metrics: AnalysisMetrics): Promise<string> {
    const prompt = this.buildPrompt(metrics);
    console.log('Generating real summary with LLM...');
    return this.llmGateway.getCompletion(prompt);
  }

  private buildPrompt(metrics: AnalysisMetrics): string {
    return `
      Analyze the following repository metrics and provide a concise, professional summary (max 120 words) for a hiring manager.
      Focus on the project's health, quality, and documentation. Be neutral and factual.

      - Repository Handle: ${metrics.handle}
      - Dominant Language: ${metrics.dominantLanguage}
      - Lines of Code: ${metrics.totalLoc}
      - Static Analysis Issues: ${metrics.lintIssues}
      - Dependency Vulnerabilities: ${metrics.vulnCount}
      - README Score (out of 100): ${metrics.readmeScore}

      Based on these metrics, what is the overall impression of this project?
    `;
  }
}
