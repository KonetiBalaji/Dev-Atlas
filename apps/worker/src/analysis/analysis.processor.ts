import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from 'ai';
import { GitService } from '../git/git.service';
import { InventoryService } from '../inventory/inventory.service';
import { StaticAnalysisService } from '../static-analysis/static-analysis.service';
import { SecurityService } from '../security/security.service';
import { DocsService } from '../docs/docs.service';
import { ScoringService } from '../scoring/scoring.service';
import { AnalysisMetrics } from 'types';

@Processor('analysis')
export class AnalysisProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly git: GitService,
    private readonly inventory: InventoryService,
    private readonly staticAnalysis: StaticAnalysisService,
    private readonly security: SecurityService,
    private readonly docs: DocsService,
    private readonly scoring: ScoringService,
  ) {}

  @Process('analyze-project')
  async handleAnalyzeProject(job: Job<{ projectId: string }>) {
    const { projectId } = job.data;
    console.log(`Processing analysis for project: ${projectId}`);

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    try {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'running' },
      });

      const repoUrl = `https://github.com/${project.handle}.git`;
      const localPath = `/tmp/devatlas/${projectId}`;

      await this.git.clone(repoUrl, localPath);

      const inventoryResult = await this.inventory.analyze(localPath);
      const totalLoc = inventoryResult.SUM?.code || 0;

      let dominantLanguage = 'N/A';
      let maxLoc = 0;
      for (const lang in inventoryResult) {
        if (lang !== 'SUM') {
          if (inventoryResult[lang].code > maxLoc) {
            maxLoc = inventoryResult[lang].code;
            dominantLanguage = lang;
          }
        }
      }
      console.log(`Inventory complete. Dominant language: ${dominantLanguage}, Total LOC: ${totalLoc}`);

      const lintIssues = await this.staticAnalysis.analyze(localPath, dominantLanguage);
      const vulnCount = await this.security.analyze(localPath);
      const readmeScore = await this.docs.analyzeReadme(localPath);

      const blameSummary = await this.git.getBlameSummary(localPath);
      const totalLines = Array.from(blameSummary.values()).reduce((acc, count) => acc + count, 0);
      const ownershipData = [];
      for (const [author, count] of blameSummary.entries()) {
        ownershipData.push({
          author: author,
          share: totalLines > 0 ? count / totalLines : 0,
        });
      }
      console.log('Ownership analysis complete.');

      const metrics: AnalysisMetrics = {
        handle: project.handle,
        dominantLanguage,
        totalLoc,
        lintIssues,
        vulnCount,
        readmeScore,
      };

      const summary = await this.ai.summarizeRepo(metrics);
      const scores = this.scoring.calculateScores(metrics);

      await this.prisma.analysis.create({
        data: {
          projectId: projectId,
          status: 'complete',
          summary: summary,
          score: {
            create: scores,
          },
          repos: {
            create: {
              name: project.handle,
              url: repoUrl,
              language: dominantLanguage,
              loc: totalLoc,
              lintIssues: lintIssues,
              vulnCount: vulnCount,
              readmeScore: readmeScore,
              ownership: {
                create: ownershipData,
              },
            },
          },
        },
      });

      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'complete' },
      });

      console.log(`Analysis complete for project: ${projectId}`);
    } catch (error) {
      console.error(`Analysis failed for project: ${projectId}`, error);
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'failed' },
      });
      throw error; // Re-throw error to let BullMQ handle job failure
    }
  }
}
