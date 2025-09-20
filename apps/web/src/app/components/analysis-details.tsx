'use client';

import { FullProject } from '../lib/api';

const DetailRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between py-2 border-b border-gray-200">
    <span className="font-medium text-gray-600">{label}</span>
    <span className="text-gray-800">{value}</span>
  </div>
);

const ScoreBar = ({ label, score }: { label: string; score: number }) => {
    const bgColor = score > 75 ? 'bg-green-500' : score > 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-gray-700">{label}</span>
                <span className="text-sm font-medium text-gray-700">{score}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${bgColor} h-2.5 rounded-full`} style={{ width: `${score}%` }}></div>
            </div>
        </div>
    );
};

export default function AnalysisDetails({ project }: { project: FullProject }) {
  const latestAnalysis = project.analyses[0];
  if (!latestAnalysis) return <div className="p-4 text-center">No analysis available.</div>;

  const repo = latestAnalysis.repos[0];
  const score = latestAnalysis.score;

  return (
    <div className="bg-gray-50 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Summary & Metrics */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Analysis Report</h3>
          <p className="text-gray-700 mb-6 italic">{latestAnalysis.summary}</p>
          <div className="space-y-4">
            <DetailRow label="Dominant Language" value={repo.language} />
            <DetailRow label="Lines of Code" value={repo.loc.toLocaleString()} />
            <DetailRow label="Lint Issues" value={repo.lintIssues} />
            <DetailRow label="Dependency Vulnerabilities" value={repo.vulnCount} />
          </div>
        </div>

        {/* Right Column: Scores & Ownership */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold mb-4">Overall Score: {score.overall}</h3>
                <div className="space-y-4">
                    <ScoreBar label="Craft" score={score.craft} />
                    <ScoreBar label="Reliability" score={score.reliability} />
                    <ScoreBar label="Documentation" score={score.documentation} />
                    <ScoreBar label="Security" score={score.security} />
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold mb-4">Top Contributors</h3>
                <ul className="space-y-2">
                {repo.ownership.slice(0, 5).map(owner => (
                    <li key={owner.id} className="flex justify-between text-sm">
                    <span>{owner.author}</span>
                    <span className="font-medium">{`${(owner.share * 100).toFixed(1)}%`}</span>
                    </li>
                ))}
                </ul>
            </div>
        </div>

      </div>
    </div>
  );
}
