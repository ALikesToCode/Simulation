import { ConfigService } from './ConfigService'

interface AIResponse {
  text: string
  reasoning: string[]
  confidence: number
}

export class AIService {
  private apiUrl: string

  constructor() {
    this.apiUrl = ConfigService.apiUrl
  }

  async init() {
    // No initialization needed for frontend service
  }

  async getAgentResponse(
    provider: 'openai' | 'gemini' | 'anthropic',
    prompt: string,
    context: any
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/agent/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          prompt,
          context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get agent response')
      }

      return await response.json()
    } catch (error) {
      console.error('AI Service Error:', error)
      throw error
    }
  }

  async updateKnowledgeBase(documents: string[]) {
    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documents })
      })

      if (!response.ok) {
        throw new Error('Failed to update knowledge base')
      }

      return true
    } catch (error) {
      console.error('Knowledge Base Update Error:', error)
      throw error
    }
  }

  async queryKnowledge(query: string) {
    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        throw new Error('Failed to query knowledge base')
      }

      return await response.json()
    } catch (error) {
      console.error('Knowledge Query Error:', error)
      throw error
    }
  }
} 