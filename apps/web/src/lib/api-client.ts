import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

apiClient.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (!axios.isAxiosError(err)) {
      throw new Error('Unexpected error. Please try again.')
    }

    const apiError = err.response?.data?.error
    const apiMessage = err.response?.data?.message
    const status = err.response?.status

    let message =
      (typeof apiError === 'string' && apiError) ||
      (typeof apiMessage === 'string' && apiMessage) ||
      ''

    if (!message) {
      if (!err.response) {
        message = 'Unable to connect to server. Please check your connection and try again.'
      } else if (err.code === 'ECONNABORTED') {
        message = 'Request timed out. Please try again.'
      } else if (status === 400) {
        message = 'Invalid request. Please check your input and try again.'
      } else if (status === 401) {
        message = 'Unauthorized request.'
      } else if (status === 403) {
        message = 'You do not have permission to perform this action.'
      } else if (status === 404) {
        message = 'Requested resource was not found.'
      } else if (status && status >= 500) {
        message = 'Server error. Please try again in a moment.'
      } else {
        message = err.message || 'Something went wrong'
      }
    }

    throw new Error(message)
  }
)

// ─── Agent APIs ───────────────────────────────────────────────────────────────
export const agentsApi = {
  list: () => apiClient.get('/agents').then((r) => r.data.data),
  get: (id: string) => apiClient.get(`/agents/${id}`).then((r) => r.data.data),
  create: (data: unknown) => apiClient.post('/agents', data).then((r) => r.data.data),
  fetchAll: () => apiClient.post('/agents/fetch-all').then((r) => r.data.data),
  update: (id: string, data: unknown) => apiClient.put(`/agents/${id}`, data).then((r) => r.data.data),
  delete: (id: string) => apiClient.delete(`/agents/${id}`).then((r) => r.data),
  sync: (id: string) => apiClient.post(`/agents/${id}/sync`).then((r) => r.data.data),
  getCalls: (id: string, params?: Record<string, unknown>) =>
    apiClient.get(`/agents/${id}/calls`, { params }).then((r) => r.data),
}

// ─── Candidate APIs ───────────────────────────────────────────────────────────
export const candidatesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/candidates', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/candidates/${id}`).then((r) => r.data.data),
  create: (data: unknown) => apiClient.post('/candidates', data).then((r) => r.data.data),
  update: (id: string, data: unknown) => apiClient.put(`/candidates/${id}`, data).then((r) => r.data.data),
  delete: (id: string) => apiClient.delete(`/candidates/${id}`).then((r) => r.data),
  getCalls: (id: string) => apiClient.get(`/candidates/${id}/calls`).then((r) => r.data.data),
  importCsv: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('/candidates/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data)
  },
}

// ─── Call APIs ────────────────────────────────────────────────────────────────
export const callsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/calls', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/calls/${id}`).then((r) => r.data.data),
  initiate: (data: { candidateId: string; agentId: string }) =>
    apiClient.post('/calls', data).then((r) => r.data.data),
  getStatus: (id: string) => apiClient.get(`/calls/${id}/status`).then((r) => r.data.data),
  getTranscript: (id: string) => apiClient.get(`/calls/${id}/transcript`).then((r) => r.data.data),
  analyze: (id: string) => apiClient.post(`/calls/${id}/analyze`).then((r) => r.data.data),
  getReport: (id: string) => apiClient.get(`/calls/${id}/report`).then((r) => r.data.data),
}

// ─── Analytics APIs ───────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: () => apiClient.get('/analytics/dashboard').then((r) => r.data.data),
}

// ─── Batch APIs ───────────────────────────────────────────────────────────────
export const batchApi = {
  initiateCalls: (data: { candidateIds: string[]; agentId: string }) =>
    apiClient.post('/batch/calls', data).then((r) => r.data.data),
}
