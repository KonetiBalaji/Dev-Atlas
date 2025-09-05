// DevAtlas Security Dashboard Component
// Created by Balaji Koneti

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  package: string;
  version: string;
  fixedIn?: string;
  cve?: string;
  source: string;
}

interface SecretMatch {
  file: string;
  line: number;
  type: string;
  confidence: number;
  value: string;
}

interface SecurityDashboardProps {
  vulnerabilities: Vulnerability[];
  secrets: SecretMatch[];
  dependencyCount: number;
  repoName: string;
}

export function SecurityDashboard({ 
  vulnerabilities, 
  secrets, 
  dependencyCount, 
  repoName 
}: SecurityDashboardProps) {
  const [selectedTab, setSelectedTab] = useState<'vulnerabilities' | 'secrets' | 'dependencies'>('vulnerabilities');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-red-500 text-white';
    if (confidence >= 0.6) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  const filteredVulnerabilities = severityFilter === 'all' 
    ? vulnerabilities 
    : vulnerabilities.filter(v => v.severity === severityFilter);

  const vulnerabilityStats = {
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
  };

  const secretStats = {
    high: secrets.filter(s => s.confidence >= 0.8).length,
    medium: secrets.filter(s => s.confidence >= 0.6 && s.confidence < 0.8).length,
    low: secrets.filter(s => s.confidence < 0.6).length,
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Security Dashboard - {repoName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {vulnerabilityStats.critical}
              </div>
              <div className="text-sm text-gray-600">Critical Vulnerabilities</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-500">
                {vulnerabilityStats.high}
              </div>
              <div className="text-sm text-gray-600">High Vulnerabilities</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-500">
                {secretStats.high}
              </div>
              <div className="text-sm text-gray-600">High Confidence Secrets</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-500">
                {dependencyCount}
              </div>
              <div className="text-sm text-gray-600">Dependencies</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vulnerabilities">
              Vulnerabilities ({vulnerabilities.length})
            </TabsTrigger>
            <TabsTrigger value="secrets">
              Secrets ({secrets.length})
            </TabsTrigger>
            <TabsTrigger value="dependencies">
              Dependencies ({dependencyCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vulnerabilities" className="space-y-4">
            <div className="flex space-x-2 mb-4">
              <Button
                variant={severityFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter('all')}
              >
                All ({vulnerabilities.length})
              </Button>
              <Button
                variant={severityFilter === 'critical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter('critical')}
              >
                Critical ({vulnerabilityStats.critical})
              </Button>
              <Button
                variant={severityFilter === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter('high')}
              >
                High ({vulnerabilityStats.high})
              </Button>
              <Button
                variant={severityFilter === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter('medium')}
              >
                Medium ({vulnerabilityStats.medium})
              </Button>
              <Button
                variant={severityFilter === 'low' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter('low')}
              >
                Low ({vulnerabilityStats.low})
              </Button>
            </div>

            <div className="space-y-3">
              {filteredVulnerabilities.map((vuln) => (
                <Card key={vuln.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(vuln.severity)}>
                          {vuln.severity.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{vuln.title}</span>
                      </div>
                      {vuln.cve && (
                        <Badge variant="outline">{vuln.cve}</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {vuln.description}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span>
                          <strong>Package:</strong> {vuln.package}@{vuln.version}
                        </span>
                        <span>
                          <strong>Source:</strong> {vuln.source}
                        </span>
                      </div>
                      
                      {vuln.fixedIn && (
                        <Badge variant="secondary">
                          Fixed in {vuln.fixedIn}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredVulnerabilities.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No vulnerabilities found for the selected severity level.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="secrets" className="space-y-4">
            <div className="space-y-3">
              {secrets.map((secret, index) => (
                <Card key={index} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getConfidenceColor(secret.confidence)}>
                          {(secret.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                        <span className="font-medium">{secret.type}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>File:</strong> {secret.file}:{secret.line}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <strong>Value:</strong> {secret.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {secrets.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No secrets detected in the repository.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-4">
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl font-bold text-blue-500 mb-2">
                {dependencyCount}
              </div>
              <div className="text-lg">Total Dependencies</div>
              <div className="text-sm mt-2">
                Dependency analysis and vulnerability scanning helps identify security risks.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

