// @ts-ignore
import { defineEventHandler, readBody, createError } from '#imports'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
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
    const body = await readBody(event)
    const { 
      provider = 'openai', 
      modelId, 
      prompt, 
      systemPrompt = '', 
      temperature = 0.7, 
      maxTokens 
    } = body

    if (!prompt) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Prompt is required'
      })
    }

    // Load API keys from environment variables
    const config = {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      googleApiKey: process.env.GOOGLE_API_KEY || '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
    }

    // Process based on provider
    switch (provider) {
      case 'openai': {
        try {
          const openai = new OpenAI({
            apiKey: config.openaiApiKey
          })

          // Use the provided model ID or get the latest model from ModelService
          const modelIdToUse = modelId || (() => {
            const latestModel = ModelService.getLatestModel('openai')
            return latestModel?.id || 'gpt-4o'
          })()

          const response = await openai.chat.completions.create({
            model: modelIdToUse,
            messages: [
              ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
              { role: 'user' as const, content: prompt }
            ],
            temperature: temperature,
            max_tokens: maxTokens || undefined
          })

          return {
            text: response.choices[0]?.message?.content || '',
            reasoning: [`Generated using ${modelIdToUse}`],
            confidence: 0.9
          }
        } catch (error) {
          console.error('OpenAI API error:', error)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to get response from OpenAI'
          })
        }
      }

      case 'gemini': {
        try {
          const gemini = new GoogleGenerativeAI(config.googleApiKey)
          
          // Use the provided model ID or get the latest model from ModelService
          const modelIdToUse = modelId || (() => {
            const latestModel = ModelService.getLatestModel('google')
            return latestModel?.id || 'gemini-1.5-pro'
          })()
          
          const model = gemini.getGenerativeModel({ model: modelIdToUse })
          
          const generationConfig = {
            temperature: temperature,
            maxOutputTokens: maxTokens || undefined,
          }
          
          const result = await model.generateContent({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig,
            ...(systemPrompt ? { systemInstruction: systemPrompt } : {})
          })
          
          const response = await result.response
          const text = response.text()
          
          return {
            text,
            reasoning: [`Generated using ${modelIdToUse}`],
            confidence: 0.9
          }
        } catch (error) {
          console.error('Gemini API error:', error)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to get response from Gemini'
          })
        }
      }

      case 'anthropic': {
        try {
          const anthropic = new Anthropic({
            apiKey: config.anthropicApiKey
          })

          // Use the provided model ID or get the latest model from ModelService
          const modelIdToUse = modelId || (() => {
            const latestModel = ModelService.getLatestModel('anthropic')
            return latestModel?.id || 'claude-3-opus'
          })()

          const response = await anthropic.messages.create({
            model: modelIdToUse,
            ...(systemPrompt ? { system: systemPrompt } : {}),
            messages: [
              { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens || undefined
          })

          return {
            text: response.content[0]?.text || '',
            reasoning: [`Generated using ${modelIdToUse}`],
            confidence: 0.9
          }
        } catch (error) {
          console.error('Anthropic API error:', error)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to get response from Anthropic'
          })
        }
      }

      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid provider'
        })
    }
  } catch (error) {
    console.error('Error in AI generate:', error)
    throw error
  }
}) 