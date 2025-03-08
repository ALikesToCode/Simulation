import { ConfigService } from './ConfigService'
import ModelService from './ModelService'

interface AIResponse {
  text: string
  reasoning: string[]
  confidence: number
}

/**
 * Options for generating AI responses.
 * @param {string} provider - The AI provider to use.
 * @param {string} prompt - The prompt text.
 * @param {string} [systemPrompt] - Optional system prompt for context.
 * @param {number} [temperature] - Sampling temperature.
 * @param {number} [maxTokens] - Max tokens to generate.
 * @param {string} [modelOverride] - Force a specific model ID.
 */
interface AIRequestOptions {
  provider?: 'openai' | 'gemini' | 'anthropic'
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  modelOverride?: string
}

export class AIService {
  private apiUrl: string
  private apiAvailability: {
    openai: boolean;
    gemini: boolean;
    anthropic: boolean;
  }
  private retryCount: number = 0
  private maxRetries: number = 3

  constructor() {
    this.apiUrl = ConfigService.apiUrl
    this.apiAvailability = {
      openai: true,
      gemini: true,
      anthropic: true
    }
  }

  async init() {
    // Test API availability
    try {
      // Make a simple request to test the API
      const response = await fetch(`${this.apiUrl}/api/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.warn('API service may be unavailable. Some features may not work correctly.')
      } else {
        console.log('API service is available')
      }
    } catch (error) {
      console.error('Error connecting to API service:', error)
      console.warn('API service is unavailable. Some features may not work correctly.')
    }
  }
  
  /**
   * Resolves the appropriate model ID based on provider and user preferences
   * @param provider The AI provider to use
   * @param modelOverride Optional override to force a specific model
   * @returns The resolved model ID to use
   */
  private resolveModelId(provider: 'openai' | 'gemini' | 'anthropic', modelOverride?: string): string {
    // Use the override if provided
    if (modelOverride) {
      return modelOverride;
    }
    
    // Otherwise use the latest model for the provider
    const providerMapping = {
      'openai': 'openai',
      'anthropic': 'anthropic',
      'gemini': 'google'
    } as const;
    
    const latestModel = ModelService.getLatestModel(providerMapping[provider]);
    return latestModel?.id || '';
  }

  async getAgentResponse(
    provider: 'openai' | 'gemini' | 'anthropic',
    prompt: string,
    context: any
  ): Promise<AIResponse> {
    // Check if the provider is available
    if (!this.apiAvailability[provider]) {
      console.warn(`${provider} API is marked as unavailable. Using fallback response.`)
      return this.getFallbackResponse(provider, prompt, context)
    }
    
    try {
      // Resolve model ID
      const modelId = this.resolveModelId(provider)
      
      // Make API request
      const response = await fetch(`${this.apiUrl}/api/agent/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          prompt,
          context,
          modelId
        })
      })
      
      if (!response.ok) {
        // Increment retry count
        this.retryCount++
        
        // If we've exceeded max retries, mark provider as unavailable
        if (this.retryCount >= this.maxRetries) {
          console.warn(`${provider} API has failed ${this.maxRetries} times. Marking as unavailable.`)
          this.apiAvailability[provider] = false
        }
        
        throw new Error(`Failed to get response from ${provider}: ${response.statusText}`)
      }
      
      // Reset retry count on success
      this.retryCount = 0
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error getting response from ${provider}:`, error)
      
      // Increment retry count
      this.retryCount++
      
      // If we've exceeded max retries, mark provider as unavailable
      if (this.retryCount >= this.maxRetries) {
        console.warn(`${provider} API has failed ${this.maxRetries} times. Marking as unavailable.`)
        this.apiAvailability[provider] = false
      }
      
      // Return fallback response
      return this.getFallbackResponse(provider, prompt, context)
    }
  }
  
  /**
   * Generate a fallback response when the API is unavailable
   */
  private getFallbackResponse(
    provider: 'openai' | 'gemini' | 'anthropic',
    prompt: string,
    context: any
  ): AIResponse {
    // Simple rule-based fallback
    let response = "I'm unable to provide a detailed response at the moment."
    
    // Check for common keywords in the prompt
    if (prompt.toLowerCase().includes('hello') || prompt.toLowerCase().includes('hi')) {
      response = "Hello! I'm currently operating in fallback mode due to API limitations."
    } else if (prompt.toLowerCase().includes('help')) {
      response = "I'd like to help, but I'm currently operating with limited capabilities."
    } else if (prompt.toLowerCase().includes('weather')) {
      response = "I can't access real-time weather data at the moment."
    } else if (prompt.toLowerCase().includes('time')) {
      response = `The current time is ${new Date().toLocaleTimeString()}.`
    }
    
    return {
      text: response,
      reasoning: ['API is unavailable', 'Using fallback response'],
      confidence: 0.5
    }
  }

  async updateKnowledgeBase(documents: string[]) {
    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documents })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update knowledge base: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating knowledge base:', error)
      throw error
    }
  }

  async queryKnowledge(query: string) {
    try {
      const response = await fetch(`${this.apiUrl}/api/knowledge/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to query knowledge base: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error querying knowledge base:', error)
      throw error
    }
  }

  async getAIResponse(options: AIRequestOptions): Promise<AIResponse> {
    const {
      provider = 'openai',
      prompt,
      systemPrompt,
      temperature = 0.7,
      maxTokens,
      modelOverride
    } = options
    
    // Check if the provider is available
    if (!this.apiAvailability[provider]) {
      console.warn(`${provider} API is marked as unavailable. Using fallback response.`)
      return this.getFallbackResponse(provider, prompt, {})
    }
    
    try {
      // Resolve model ID
      const modelId = modelOverride || this.resolveModelId(provider)
      
      // Make API request
      const response = await fetch(`${this.apiUrl}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          prompt,
          systemPrompt,
          temperature,
          maxTokens,
          modelId
        })
      })
      
      if (!response.ok) {
        // Increment retry count
        this.retryCount++
        
        // If we've exceeded max retries, mark provider as unavailable
        if (this.retryCount >= this.maxRetries) {
          console.warn(`${provider} API has failed ${this.maxRetries} times. Marking as unavailable.`)
          this.apiAvailability[provider] = false
        }
        
        throw new Error(`Failed to get response from ${provider}: ${response.statusText}`)
      }
      
      // Reset retry count on success
      this.retryCount = 0
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error getting response from ${provider}:`, error)
      
      // Increment retry count
      this.retryCount++
      
      // If we've exceeded max retries, mark provider as unavailable
      if (this.retryCount >= this.maxRetries) {
        console.warn(`${provider} API has failed ${this.maxRetries} times. Marking as unavailable.`)
        this.apiAvailability[provider] = false
      }
      
      // Return fallback response
      return this.getFallbackResponse(provider, prompt, {})
    }
  }
}

export default new AIService() 