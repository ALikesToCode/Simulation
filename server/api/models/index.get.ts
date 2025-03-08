// @ts-ignore
import { defineEventHandler, getQuery, createError } from '#imports'
import ModelService from '../../../services/ModelService'

// Define a simple interface for the event object
interface ApiEvent {
  // Add minimal properties needed for type checking
  node: {
    req: any;
    res: any;
  };
  context: any;
}

export default defineEventHandler(async (event: ApiEvent) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    
    const validProviders = ['google', 'openai', 'anthropic'] as const;
    type ModelProvider = typeof validProviders[number];
    
    const provider = query.provider as string;
    
    // Return models based on provider or all models
    if (provider) {
      if (validProviders.includes(provider as any)) {
        return {
          models: ModelService.getModelsByProvider(provider as ModelProvider),
          provider
        }
      } else {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid provider. Must be one of: ${validProviders.join(', ')}`
        })
      }
    }
    
    // Return all models
    return {
      models: ModelService.getAllModels()
    }
  } catch (error) {
    console.error('Error fetching models:', error instanceof Error ? error.message : error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch models'
    })
  }
}) 