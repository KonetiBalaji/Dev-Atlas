// DevAtlas PDF Report Component
// Created by Balaji Koneti

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface AnalysisData {
  projectName: string;
  overallScore: number;
  breakdown: {
    craft: number;
    reliability: number;
    documentation: number;
    security: number;
    impact: number;
    collaboration: number;
  };
  repos: Array<{
    name: string;
    url: string;
    language: string;
    stars: number;
    forks: number;
    loc: number;
    score: number;
    summary: string;
  }>;
  recommendations: string[];
  generatedAt: string;
}

interface PDFReportProps {
  analysisData: AnalysisData;
}

export function PDFReport({ analysisData }: PDFReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      // In a real implementation, you would call an API endpoint
      // that generates and returns a PDF file
      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devatlas-report-${analysisData.projectName}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>PDF Report</span>
          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? 'Generating...' : 'Download PDF Report'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Report Preview */}
          <div className="border rounded-lg p-6 bg-white">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                DevAtlas Analysis Report
              </h1>
              <h2 className="text-xl text-gray-600 mb-4">
                {analysisData.projectName}
              </h2>
              <div className="text-sm text-gray-500">
                Generated on {new Date(analysisData.generatedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Overall Score */}
            <div className="text-center mb-8">
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(analysisData.overallScore)}`}>
                {analysisData.overallScore}
              </div>
              <div className="text-lg text-gray-600">Overall Score</div>
            </div>

            {/* Score Breakdown */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Score Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(analysisData.breakdown).map(([category, score]) => (
                  <div key={category} className="text-center p-4 border rounded">
                    <div className={`text-2xl font-bold mb-1 ${getScoreColor(score)}`}>
                      {score}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {category}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Repository Summary */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Repository Analysis</h3>
              <div className="space-y-3">
                {analysisData.repos.map((repo, index) => (
                  <div key={index} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{repo.name}</h4>
                        <div className="text-sm text-gray-600">
                          {repo.language} • {repo.stars} stars • {repo.forks} forks
                        </div>
                      </div>
                      <Badge className={getScoreBadgeColor(repo.score)}>
                        {repo.score}/100
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-700">
                      {repo.summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
              <div className="space-y-2">
                {analysisData.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="text-sm text-gray-700">{recommendation}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p>Generated by DevAtlas - Developer & Codebase Analysis Platform</p>
              <p>For more information, visit devatlas.com</p>
            </div>
          </div>

          {/* Report Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Contents</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Executive Summary</li>
                  <li>• Overall Score & Breakdown</li>
                  <li>• Repository Analysis</li>
                  <li>• Code Quality Metrics</li>
                  <li>• Security Assessment</li>
                  <li>• Documentation Review</li>
                  <li>• Actionable Recommendations</li>
                  <li>• Detailed Findings</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={generatePDF}
                    disabled={isGenerating}
                  >
                    Download PDF Report
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const dataStr = JSON.stringify(analysisData, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `devatlas-data-${analysisData.projectName}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export JSON Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

