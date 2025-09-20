import { Injectable } from '@nestjs/common';
import { AnalysisMetrics, ScoreData } from 'types';

@Injectable()
export class ScoringService {
  calculateScores(metrics: AnalysisMetrics): ScoreData {
    console.log('Calculating scores...');

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

    // Craft (25%) - based on lint issues per KLOC
    const lintIssuesPerKloc = metrics.totalLoc > 0 ? (metrics.lintIssues / (metrics.totalLoc / 1000)) : 0;
    const craft = clamp(100 - lintIssuesPerKloc * 2, 0, 100);

    // Reliability (15%) - placeholder
    const reliability = 70;

    // Documentation (15%) - directly from readmeScore
    const documentation = metrics.readmeScore;

    // Security (15%) - based on vulnerabilities
    const security = clamp(100 - metrics.vulnCount * 10, 0, 100);

    // Impact (20%) - placeholder
    const impact = 75;

    // Collaboration (10%) - placeholder
    const collaboration = 80;

    const overall = Math.round(
        craft * 0.25 +
        reliability * 0.15 +
        documentation * 0.15 +
        security * 0.15 +
        impact * 0.20 +
        collaboration * 0.10
    );

    const scores: ScoreData = {
        overall,
        craft,
        reliability,
        documentation,
        security,
        impact,
        collaboration,
        details: { ...metrics, lintIssuesPerKloc }
    };

    console.log('Scores calculated:', scores);
    return scores;
  }
}
