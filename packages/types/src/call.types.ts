export type CallStatus =
  | 'INITIATED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'NO_ANSWER'

export interface CallAnalytic {
  id: string
  callId: string
  candidateId: string
  detectedTechStack: string[]
  extractedYearsExp?: number | null
  extractedCurrentRole?: string | null
  salaryExpectation?: string | null
  rawAnalysisPayload?: unknown | null
  createdAt: string
  updatedAt: string
}

export interface Call {
  id: string
  bolnaExecutionId?: string | null
  agentId: string
  candidateId: string
  status: CallStatus
  transcript?: string | null
  summary?: string | null
  duration?: number | null
  cost?: number | null
  agentPhoneNumber?: string | null
  candidatePhoneNumber?: string | null
  callType?: string | null
  provider?: string | null
  initiatedAt: string
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  analytics?: CallAnalytic | null
  candidate?: import('./candidate.types').Candidate
  agent?: import('./agent.types').Agent
}

export interface InitiateCallDto {
  candidateId: string
  agentId: string
}

export interface TranscriptTurn {
  speaker: 'assistant' | 'user'
  text: string
}

export interface ScreeningReport {
  reportGeneratedAt: string
  candidate: {
    name: string
    email?: string | null
    phone: string
    currentRole?: string | null
    yearsOfExperience?: number | null
  }
  call: {
    duration?: number | null
    cost?: number | null
    initiatedAt: string
    completedAt?: string | null
    provider?: string | null
  }
  screening: {
    techStack: string[]
  }
  transcript: TranscriptTurn[]
  summary?: string | null
}

export interface CallFilters {
  status?: CallStatus
  candidateId?: string
  agentId?: string
  page?: number
  limit?: number
}

export interface PaginatedCalls {
  data: Call[]
  total: number
  page: number
  limit: number
  totalPages: number
}
