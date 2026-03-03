'use client'

import { Progress } from '@/components/ui/progress'

interface ScreeningScoreProps {
  overallScore?: number | null
  technicalScore?: number | null
  experienceScore?: number | null
  communicationScore?: number | null
  isQualified?: boolean | null
}

function getScoreColor(score: number): string {
  if (score < 50) return '#ef4444'
  if (score <= 70) return '#f59e0b'
  return '#10b981'
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(100, score))
  const offset = circumference - (progress / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={128} height={128} className="-rotate-90">
        <circle
          cx={64}
          cy={64}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={10}
        />
        <circle
          cx={64}
          cy={64}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900">{Math.round(score)}</span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  )
}

function SubScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score < 50 ? 'bg-red-500' : score <= 70 ? 'bg-yellow-500' : 'bg-emerald-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{Math.round(score)}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  )
}

export function ScreeningScore({
  overallScore,
  technicalScore,
  experienceScore,
  communicationScore,
  isQualified,
}: ScreeningScoreProps) {
  const overall = overallScore ?? 0
  const hasScore = overallScore != null

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        {hasScore ? (
          <ScoreRing score={overall} />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-gray-200">
            <span className="text-sm text-gray-400">No score</span>
          </div>
        )}

        {isQualified != null && (
          <span
            className={`rounded-full px-4 py-1 text-sm font-bold tracking-wide ${
              isQualified
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {isQualified ? 'QUALIFIED' : 'NEEDS REVIEW'}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {technicalScore != null && (
          <SubScoreBar label="Technical" score={technicalScore} />
        )}
        {experienceScore != null && (
          <SubScoreBar label="Experience" score={experienceScore} />
        )}
        {communicationScore != null && (
          <SubScoreBar label="Communication" score={communicationScore} />
        )}
      </div>

      {!hasScore && technicalScore == null && experienceScore == null && communicationScore == null && (
        <p className="text-center text-sm text-gray-400">
          Scoring data not yet available
        </p>
      )}
    </div>
  )
}
