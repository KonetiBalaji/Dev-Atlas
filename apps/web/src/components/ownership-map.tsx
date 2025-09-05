// DevAtlas Ownership Map Component
// Created by Balaji Koneti

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface OwnershipData {
  path: string;
  authors: Array<{
    author: string;
    lines: number;
    percentage: number;
    commits: number;
  }>;
  totalLines: number;
  totalCommits: number;
}

interface OwnershipMapProps {
  ownershipData: OwnershipData[];
  repoName: string;
}

export function OwnershipMap({ ownershipData, repoName }: OwnershipMapProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  const selectedData = selectedPath 
    ? ownershipData.find(item => item.path === selectedPath)
    : null;

  const formatPath = (path: string) => {
    if (path === '.') return 'Root';
    return path.split('/').pop() || path;
  };

  const getContributionColor = (percentage: number) => {
    if (percentage >= 50) return 'bg-green-500';
    if (percentage >= 25) return 'bg-yellow-500';
    if (percentage >= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const buildTreeStructure = () => {
    const tree: any = {};
    
    ownershipData.forEach(item => {
      const parts = item.path.split('/');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            children: {},
            data: null,
          };
        }
        current = current[part].children;
      });
      
      // Set data for the leaf node
      const leafPath = parts.slice(0, -1).join('/');
      const leafName = parts[parts.length - 1];
      if (leafPath) {
        const leafParent = tree[parts[0]];
        for (let i = 1; i < parts.length - 1; i++) {
          leafParent = leafParent.children[parts[i]];
        }
        leafParent.children[leafName].data = item;
      } else {
        tree[parts[0]].data = item;
      }
    });
    
    return tree;
  };

  const renderTreeNode = (node: any, level = 0) => {
    const hasData = node.data !== null;
    const isSelected = selectedPath === node.path;
    
    return (
      <div key={node.path} className="ml-4">
        <div
          className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100' : ''
          }`}
          style={{ marginLeft: `${level * 16}px` }}
          onClick={() => setSelectedPath(node.path)}
        >
          <span className="mr-2">
            {Object.keys(node.children).length > 0 ? '📁' : '📄'}
          </span>
          <span className="font-medium">{node.name}</span>
          {hasData && (
            <div className="ml-auto flex items-center space-x-2">
              <Badge variant="secondary">
                {node.data.totalLines} lines
              </Badge>
              <Badge variant="outline">
                {node.data.authors.length} contributors
              </Badge>
            </div>
          )}
        </div>
        
        {Object.values(node.children).map((child: any) => 
          renderTreeNode(child, level + 1)
        )}
      </div>
    );
  };

  const treeStructure = buildTreeStructure();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Code Ownership Map - {repoName}</span>
          <div className="flex space-x-2">
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              Tree View
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {viewMode === 'tree' ? 'Directory Structure' : 'All Paths'}
            </h3>
            
            {viewMode === 'tree' ? (
              <div className="max-h-96 overflow-y-auto border rounded p-4">
                {Object.values(treeStructure).map((node: any) => 
                  renderTreeNode(node)
                )}
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {ownershipData.map((item) => (
                  <div
                    key={item.path}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedPath === item.path ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedPath(item.path)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formatPath(item.path)}</span>
                      <div className="flex space-x-2">
                        <Badge variant="secondary">
                          {item.totalLines} lines
                        </Badge>
                        <Badge variant="outline">
                          {item.authors.length} contributors
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contributors</h3>
            
            {selectedData ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">{formatPath(selectedData.path)}</h4>
                  <div className="text-sm text-gray-600">
                    {selectedData.totalLines} lines • {selectedData.totalCommits} commits
                  </div>
                </div>
                
                <div className="space-y-3">
                  {selectedData.authors
                    .sort((a, b) => b.percentage - a.percentage)
                    .map((author, index) => (
                    <div key={author.author} className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                        {author.author.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{author.author}</span>
                          <span className="text-sm text-gray-600">
                            {author.percentage.toFixed(1)}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getContributionColor(author.percentage)}`}
                            style={{ width: `${author.percentage}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{author.lines} lines</span>
                          <span>{author.commits} commits</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Select a path to view contributor details
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

