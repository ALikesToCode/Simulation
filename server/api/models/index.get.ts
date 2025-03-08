import { defineEventHandler, getQuery, createError } from 'h3'
import ModelService from '../../../services/ModelService'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const provider = query.provider as string
    
    // Return models based on provider or all models
    if (provider) {
      if (['google', 'openai', 'anthropic'].includes(provider)) {
        return {
          models: ModelService.getModelsByProvider(provider as 'google' | 'openai' | 'anthropic'),
          provider
        }
      } else {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid provider. Must be one of: google, openai, anthropic'
        })
      }
    }
    
    // Return all models
    return {
      models: ModelService.getAllModels()
    }
  } catch (error) {
    console.error('Error fetching models:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch models'
    })
  }
}) 