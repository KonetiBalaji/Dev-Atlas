export interface AnalysisMetrics {
    handle: string;
    dominantLanguage: string;
    totalLoc: number;
    lintIssues: number;
    vulnCount: number;
    readmeScore: number;
}

export interface ScoreData {
    overall: number;
    craft: number;
    reliability: number;
    documentation: number;
    security: number;
    impact: number;
    collaboration: number;
    details: any; // For storing raw inputs
}
