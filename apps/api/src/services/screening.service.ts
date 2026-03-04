import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env'
import type { TranscriptTurn } from '@ai-voice-agent/types'

const genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

export interface ScreeningResult {
  detectedTechStack: string[]   // e.g. ['Python', 'Node.js', 'React']
  extractedYearsExp: number | null
  extractedCurrentRole: string | null
}

const PROMPT_TEMPLATE = `You are an HR screening assistant. Analyze the following candidate interview transcript and return a JSON object.

Transcript:
{TRANSCRIPT}

{SUMMARY_SECTION}

Return ONLY valid JSON with this exact shape:
{
  "detectedTechStack": ["<tech1>", "<tech2>", ...],
  "extractedYearsExp": <integer or null>,
  "extractedCurrentRole": "<string or null>"
}

Extraction guide:
- detectedTechStack: list any technologies, frameworks, or tools the candidate mentioned
- extractedYearsExp: total years of professional experience mentioned, or null if not stated
- extractedCurrentRole: their current job title if mentioned, or null`

class ScreeningService {
  async analyze(transcript: string, summary: string): Promise<ScreeningResult> {
    const summarySection = summary
      ? `Call Summary:\n${summary}`
      : ''

    const prompt = PROMPT_TEMPLATE
      .replace('{TRANSCRIPT}', transcript)
      .replace('{SUMMARY_SECTION}', summarySection)

    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    })

    const text = response.text?.trim() ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Gemini returned no JSON')

    const result = JSON.parse(jsonMatch[0]) as ScreeningResult
    return result
  }

  parseTranscript(raw: string): TranscriptTurn[] {
    return raw
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        if (line.startsWith('assistant:')) {
          return { speaker: 'assistant' as const, text: line.replace('assistant:', '').trim() }
        } else if (line.startsWith('user:')) {
          return { speaker: 'user' as const, text: line.replace('user:', '').trim() }
        }
        return null
      })
      .filter(Boolean) as TranscriptTurn[]
  }
}

export const screeningService = new ScreeningService()
