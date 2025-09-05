// DevAtlas AI Prompt Templates
// Created by Balaji Koneti

import { PromptTemplate } from './types';

// Repository summary prompt template
export const REPO_SUMMARY_PROMPT: PromptTemplate = {
  name: 'repo_summary',
  template: `You are documenting a repository for a hiring manager. Analyze the following repository structure and code to provide a concise summary.

Repository: {repoName}
Language: {language}
Key Files: {keyFiles}

In exactly 120 words or less, provide:
1. Purpose: What does this repository do?
2. Main modules: List 2-3 key components
3. How to run: Basic setup/run instructions
4. How to test: Test execution steps
5. Missing documentation: 2-3 gaps if any

Be concrete, neutral, and focus on practical information. If information is unclear, state what's missing rather than guessing.

Repository content:
{content}`,
  variables: ['repoName', 'language', 'keyFiles', 'content'],
  maxTokens: 200,
};

// Directory summary prompt template
export const DIRECTORY_SUMMARY_PROMPT: PromptTemplate = {
  name: 'directory_summary',
  template: `Analyze this directory within a larger repository.

Directory: {path}
Repository: {repoName}
Files: {files}

In 60 words or less, describe:
1. Purpose: What does this directory contain?
2. Key files: List 2-3 most important files
3. Complexity: Rate as low/medium/high based on code complexity

Directory content:
{content}`,
  variables: ['path', 'repoName', 'files', 'content'],
  maxTokens: 100,
};

// Code quality analysis prompt template
export const CODE_QUALITY_PROMPT: PromptTemplate = {
  name: 'code_quality',
  template: `Analyze the code quality of this repository.

Repository: {repoName}
Language: {language}
Lint Issues: {lintIssues}
Test Coverage: {testCoverage}

Provide a brief assessment (50 words max) covering:
1. Code organization and structure
2. Testing practices
3. Documentation quality
4. Security considerations

Focus on actionable insights for improvement.

Code sample:
{codeSample}`,
  variables: ['repoName', 'language', 'lintIssues', 'testCoverage', 'codeSample'],
  maxTokens: 150,
};

// Security analysis prompt template
export const SECURITY_ANALYSIS_PROMPT: PromptTemplate = {
  name: 'security_analysis',
  template: `Analyze the security posture of this repository.

Repository: {repoName}
Vulnerabilities: {vulnerabilities}
Secrets Found: {secretsFound}
Dependencies: {dependencies}

Provide a brief security assessment (50 words max) covering:
1. Dependency vulnerabilities
2. Secret management
3. Security best practices
4. Recommendations

Security scan results:
{securityResults}`,
  variables: ['repoName', 'vulnerabilities', 'secretsFound', 'dependencies', 'securityResults'],
  maxTokens: 150,
};

// All prompt templates
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  repo_summary: REPO_SUMMARY_PROMPT,
  directory_summary: DIRECTORY_SUMMARY_PROMPT,
  code_quality: CODE_QUALITY_PROMPT,
  security_analysis: SECURITY_ANALYSIS_PROMPT,
};

// Helper function to format prompt with variables
export function formatPrompt(template: PromptTemplate, variables: Record<string, string>): string {
  let formatted = template.template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return formatted;
}
