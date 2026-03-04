export type CandidateStatus =
  | 'PENDING'
  | 'CALLED'
  | 'NO_ANSWER'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROCESS'
  | 'READY_FOR_CALL'

export interface Candidate {
  id: string
  name: string
  countryCode: string
  phone: string
  email?: string | null
  currentRole?: string | null
  yearsOfExperience?: number | null
  resumeUrl?: string | null
  status: CandidateStatus
  timezone: string
  notes?: string | null
  importBatchId?: string | null
  createdAt: string
  updatedAt: string
  calls?: import('./call.types').Call[]
}

export interface CreateCandidateDto {
  name: string
  countryCode?: string
  phone: string
  email?: string
  currentRole?: string
  yearsOfExperience?: number
  timezone?: string
  notes?: string
  status?: CandidateStatus
}

export interface UpdateCandidateDto extends Partial<CreateCandidateDto> {}

export interface CandidateFilters {
  status?: CandidateStatus
  search?: string
  page?: number
  limit?: number
}

export interface PaginatedCandidates {
  data: Candidate[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ImportBatchResult {
  batchId: string
  total: number
  imported: number
  failed: number
  errors: Array<{ row: number; error: string }>
}
