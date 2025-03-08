import { ConfigService } from './ConfigService'
import ModelService from './ModelService'

interface AIResponse {
  text: string
  reasoning: string[]
  confidence: number
}

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
      // Get the model ID to use
      const storedModel = typeof window !== 'undefined' ? localStorage.getItem('selectedModel') : null;
      let modelId = '';
      
      if (storedModel && ModelService.modelExists(storedModel)) {
        const model = ModelService.getModelById(storedModel);
        // Only use the stored model if it matches the requested provider
        if (model && model.provider === provider) {
          modelId = storedModel;
        }
      }
      
      const response = await fetch(`${this.apiUrl}/api/agent/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          prompt,
          context,
          modelId // Pass the selected model ID
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

  async getAIResponse(options: AIRequestOptions): Promise<AIResponse> {
    const {
      provider = 'openai',
      prompt,
      systemPrompt = '',
      temperature = 0.7,
      maxTokens,
      modelOverride
    } = options;

    // Get the model ID to use
    let modelId: string;
    
    if (modelOverride) {
      // Use the override if provided
      modelId = modelOverride;
    } else {
      // Get the selected model from localStorage or use the latest model from the provider
      const storedModel = typeof window !== 'undefined' ? localStorage.getItem('selectedModel') : null;
      
      if (storedModel && ModelService.modelExists(storedModel)) {
        const model = ModelService.getModelById(storedModel);
        // Only use the stored model if it matches the requested provider
        if (model && model.provider === provider) {
          modelId = storedModel;
        } else {
          // Otherwise use the latest model for the provider
          const latestModel = ModelService.getLatestModel(provider);
          modelId = latestModel?.id || '';
        }
      } else {
        // Use the latest model for the provider
        const latestModel = ModelService.getLatestModel(provider);
        modelId = latestModel?.id || '';
      }
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          modelId,
          prompt,
          systemPrompt,
          temperature,
          maxTokens
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      return await response.json();
    } catch (error) {
      console.error('AI Response Error:', error);
      throw error;
    }
  }
}

export default new AIService() 