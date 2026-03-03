export interface BolnaUsageBreakdown {
  llmModel: Record<string, { input: number; output: number }>
  voice_id: string
  synthesizer_model: string
  transcriber_model: string
  transcriber_duration: number
  synthesizer_characters: number
}

export interface BolnaCostBreakdown {
  llm: number
  network: number
  platform: number
  synthesizer: number
  transcriber: number
}

export interface BolnaTelephonyData {
  duration: string
  to_number: string
  from_number: string
  recording_url: string
  hosted_telephony: boolean
  provider_call_id: string
  call_type: 'outbound' | 'inbound'
  provider: string
  hangup_by: string | null
  hangup_reason: string | null
}

export interface BolnaContextDetails {
  recipient_data: {
    name: string
    timezone: string
    [key: string]: unknown
  }
  recipient_phone_number: string
}

export interface BolnaWebhookPayload {
  id: string
  agent_id: string
  batch_id: string | null
  created_at: string
  updated_at: string
  scheduled_at: string | null
  answered_by_voice_mail: boolean | null
  conversation_duration: number
  total_cost: number
  transcript: string
  usage_breakdown: BolnaUsageBreakdown
  cost_breakdown: BolnaCostBreakdown
  extracted_data: Record<string, unknown> | null
  summary: string | null
  error_message: string | null
  status: string
  agent_extraction: unknown | null
  user_number: string
  agent_number: string
  initiated_at: string
  telephony_data: BolnaTelephonyData
  context_details: BolnaContextDetails
  smart_status: string | null
  campaign_id: string | null
}

export interface BolnaCallInitiatePayload {
  agent_id: string
  recipient_phone_number: string
  recipient_data: {
    name: string
    timezone?: string
    [key: string]: unknown
  }
}

export interface BolnaCallInitiateResponse {
  execution_id?: string
  call_id?: string
  status?: string
  message?: string
}
