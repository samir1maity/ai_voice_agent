'use client'

import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

interface TranscriptTurn {
  role: 'assistant' | 'user'
  text: string
}

function parseTranscript(raw: string): TranscriptTurn[] {
  const lines = raw.split('\n').filter((l) => l.trim().length > 0)
  const turns: TranscriptTurn[] = []

  for (const line of lines) {
    const assistantMatch = line.match(/^assistant:\s*(.+)/i)
    const userMatch = line.match(/^user:\s*(.+)/i)

    if (assistantMatch) {
      turns.push({ role: 'assistant', text: assistantMatch[1].trim() })
    } else if (userMatch) {
      turns.push({ role: 'user', text: userMatch[1].trim() })
    } else if (turns.length > 0) {
      // Append continuation lines to the last turn
      turns[turns.length - 1].text += ' ' + line.trim()
    }
  }

  return turns
}

interface TranscriptViewerProps {
  transcript?: string | null
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  if (!transcript || transcript.trim().length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No transcript available"
        description="The transcript will appear here once the call has completed."
      />
    )
  }

  const turns = parseTranscript(transcript)

  if (turns.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No transcript available"
        description="The transcript will appear here once the call has completed."
      />
    )
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
      {turns.map((turn, index) => (
        <div
          key={index}
          className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              turn.role === 'assistant'
                ? 'rounded-tl-sm bg-gray-100 text-gray-800'
                : 'rounded-tr-sm bg-blue-600 text-white'
            }`}
          >
            <p className={`mb-0.5 text-xs font-medium ${
              turn.role === 'assistant' ? 'text-gray-500' : 'text-blue-100'
            }`}>
              {turn.role === 'assistant' ? 'AI Screener' : 'Candidate'}
            </p>
            <p>{turn.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
