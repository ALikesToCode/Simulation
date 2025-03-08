import { GoogleGenerativeAI } from '@google/generative-ai';

// Define model interfaces
export interface AIModel {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'anthropic';
  description: string;
  capabilities: string[];
  contextWindow: number;
  isMultimodal: boolean;
  releaseDate?: string;
}

export class ModelService {
  private static instance: ModelService;
  private genAI: GoogleGenerativeAI;
  
  // Current available Gemini models
  private geminiModels: AIModel[] = [
    {
      id: 'gemini-2.0-pro',
      name: 'Gemini 2.0 Pro',
      provider: 'google',
      description: 'Strongest model quality, especially for code & world knowledge; 2M long context',
      capabilities: ['text', 'images', 'video', 'audio', 'code', 'reasoning'],
      contextWindow: 2000000,
      isMultimodal: true,
      releaseDate: '2025-02-05'
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      description: 'Workhorse model for all daily tasks with strong overall performance',
      capabilities: ['text', 'images', 'video', 'audio', 'code'],
      contextWindow: 1000000,
      isMultimodal: true,
      releaseDate: '2025-01-30'
    },
    {
      id: 'gemini-2.0-flash-thinking',
      name: 'Gemini 2.0 Flash Thinking',
      provider: 'google',
      description: 'Provides stronger reasoning capabilities and includes thinking process in responses',
      capabilities: ['text', 'images', 'reasoning'],
      contextWindow: 1000000,
      isMultimodal: true,
      releaseDate: '2025-01-30'
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash-Lite',
      provider: 'google',
      description: 'Cost effective offering to support high throughput',
      capabilities: ['text', 'images', 'video', 'audio', 'code'],
      contextWindow: 1000000,
      isMultimodal: true,
      releaseDate: '2025-02-05'
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      description: 'Previous generation model with strong capabilities',
      capabilities: ['text', 'images', 'code', 'reasoning'],
      contextWindow: 1000000,
      isMultimodal: true,
      releaseDate: '2024-02-15'
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      description: 'Previous generation fast model with good capabilities',
      capabilities: ['text', 'images', 'code'],
      contextWindow: 1000000,
      isMultimodal: true,
      releaseDate: '2024-05-14'
    }
  ];
  
  // OpenAI models
  private openAIModels: AIModel[] = [
    {
      id: 'gpt-4o-2024-11-20',
      name: 'GPT-4o (2024-11-20)',
      provider: 'openai',
      description: 'Latest large model with enhanced creative writing ability',
      capabilities: ['text', 'images', 'code', 'reasoning', 'structured output'],
      contextWindow: 128000,
      isMultimodal: true,
      releaseDate: '2024-11-20'
    },
    {
      id: 'gpt-4o-2024-08-06',
      name: 'GPT-4o (2024-08-06)',
      provider: 'openai',
      description: 'Powerful multimodal model with enhanced accuracy and responsiveness',
      capabilities: ['text', 'images', 'code', 'reasoning', 'structured output'],
      contextWindow: 128000,
      isMultimodal: true,
      releaseDate: '2024-08-06'
    },
    {
      id: 'gpt-4o-mini-2024-07-18',
      name: 'GPT-4o Mini',
      provider: 'openai',
      description: 'Fast, inexpensive, capable model ideal for replacing GPT-3.5 Turbo',
      capabilities: ['text', 'images', 'code', 'structured output'],
      contextWindow: 128000,
      isMultimodal: true,
      releaseDate: '2024-07-18'
    },
    {
      id: 'gpt-4-turbo-2024-04-09',
      name: 'GPT-4 Turbo with Vision',
      provider: 'openai',
      description: 'Replacement for all previous GPT-4 preview models',
      capabilities: ['text', 'images', 'code', 'reasoning'],
      contextWindow: 128000,
      isMultimodal: true,
      releaseDate: '2024-04-09'
    }
  ];
  
  // Anthropic models
  private anthropicModels: AIModel[] = [
    {
      id: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet',
      provider: 'anthropic',
      description: 'Most intelligent Claude model with hybrid reasoning capabilities',
      capabilities: ['text', 'images', 'code', 'reasoning', 'extended thinking'],
      contextWindow: 200000,
      isMultimodal: true,
      releaseDate: '2025-02-19'
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet v2',
      provider: 'anthropic',
      description: 'Powerful model with strong reasoning capabilities',
      capabilities: ['text', 'images', 'code', 'reasoning'],
      contextWindow: 200000,
      isMultimodal: true,
      releaseDate: '2024-10-22'
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      description: 'Fastest Claude model with good capabilities',
      capabilities: ['text', 'images', 'code'],
      contextWindow: 200000,
      isMultimodal: true,
      releaseDate: '2024-10-22'
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      description: 'Previous generation high-capability model',
      capabilities: ['text', 'images', 'code', 'reasoning'],
      contextWindow: 200000,
      isMultimodal: true,
      releaseDate: '2024-02-29'
    }
  ];
  
  constructor(apiKey: string = process.env.GOOGLE_API_KEY || '') {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  public static getInstance(apiKey?: string): ModelService {
    if (!ModelService.instance) {
      ModelService.instance = new ModelService(apiKey);
    }
    return ModelService.instance;
  }
  
  /**
   * Get all available models
   */
  public getAllModels(): AIModel[] {
    return [
      ...this.geminiModels,
      ...this.openAIModels,
      ...this.anthropicModels
    ];
  }
  
  /**
   * Get models by provider
   */
  public getModelsByProvider(provider: 'google' | 'openai' | 'anthropic'): AIModel[] {
    switch (provider) {
      case 'google':
        return this.geminiModels;
      case 'openai':
        return this.openAIModels;
      case 'anthropic':
        return this.anthropicModels;
      default:
        return [];
    }
  }
  
  /**
   * Get a specific model by ID
   */
  public getModelById(id: string): AIModel | undefined {
    return this.getAllModels().find(model => model.id === id);
  }
  
  /**
   * Get the latest model for a provider
   */
  public getLatestModel(provider: 'google' | 'openai' | 'anthropic'): AIModel | undefined {
    const models = this.getModelsByProvider(provider);
    return models.length > 0 ? models[0] : undefined;
  }
  
  /**
   * Check if a model exists
   */
  public modelExists(id: string): boolean {
    return this.getAllModels().some(model => model.id === id);
  }
}

export default ModelService.getInstance(); 