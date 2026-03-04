export interface DashboardMetrics {
  totalCalls: number
  completedCalls: number
  avgDuration: number
  callsToday: number
  activeAgents: number
  totalCandidates: number
}

export interface CandidatePipelineFunnel {
  pending: number
  called: number
  noAnswer: number
}

export interface TechStackFrequency {
  tech: string
  count: number
  percentage: number
}

export interface RecentCall {
  id: string
  candidateName: string
  candidatePhone: string
  status: string
  duration?: number | null
  initiatedAt: string
}

export interface AnalyticsDashboard {
  metrics: DashboardMetrics
  funnel: CandidatePipelineFunnel
  recentCalls: RecentCall[]
  techStackFrequency: TechStackFrequency[]
}
