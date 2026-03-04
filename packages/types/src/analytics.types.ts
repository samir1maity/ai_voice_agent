export interface DashboardMetrics {
  totalCalls: number
  completedCalls: number
  avgDuration: number
  totalCost: number
  callsToday: number
  activeAgents: number
  totalCandidates: number
}

export interface CandidatePipelineFunnel {
  pending: number
  scheduled: number
  called: number
  noAnswer: number
}

export interface TechStackFrequency {
  tech: string
  count: number
  percentage: number
}

export interface DailyCost {
  date: string
  cost: number
  calls: number
}

export interface RecentCall {
  id: string
  candidateName: string
  candidatePhone: string
  status: string
  duration?: number | null
  cost?: number | null
  initiatedAt: string
}

export interface AnalyticsDashboard {
  metrics: DashboardMetrics
  funnel: CandidatePipelineFunnel
  recentCalls: RecentCall[]
  techStackFrequency: TechStackFrequency[]
}
