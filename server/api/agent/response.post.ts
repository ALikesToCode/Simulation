import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import ModelService from '../../../services/ModelService'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { provider, prompt, context, modelId } = body

    if (!provider || !prompt) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Provider and prompt are required'
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
        if (!config.openaiApiKey) {
          throw createError({
            status: 500,
            message: 'OpenAI API key not configured'
          })
        }

        const openai = new OpenAI({ apiKey: config.openaiApiKey })
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: 'You are an agent in a multi-agent simulation. Your goal is to make decisions based on your type and context.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        })
        
        return {
          text: response.choices[0]?.message?.content || '',
          reasoning: ['Analyzed context', 'Considered objectives', 'Made decision'],
          confidence: 0.85
        }
      }
      
      case 'gemini': {
        if (!config.googleApiKey) {
          throw createError({
            status: 500,
            message: 'Google API key not configured'
          })
        }

        try {
          const gemini = new GoogleGenerativeAI(config.googleApiKey)
          
          // Use the provided model ID or get the latest model from ModelService
          const modelIdToUse = modelId || (() => {
            const latestModel = ModelService.getLatestModel('google')
            return latestModel?.id || 'gemini-1.5-pro'
          })()
          
          const model = gemini.getGenerativeModel({ model: modelIdToUse })
          
          const result = await model.generateContent(prompt)
          const response = await result.response
          const text = await response.text()
          
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
        if (!config.anthropicApiKey) {
          throw createError({
            status: 500,
            message: 'Anthropic API key not configured'
          })
        }

        const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
        const response = await anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        })
        
        return {
          text: response.content[0].text,
          reasoning: ['Analyzed situation', 'Applied context', 'Generated decision'],
          confidence: 0.9
        }
      }
      
      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid provider'
        })
    }
  } catch (error) {
    console.error('Error in agent response:', error)
    throw error
  }
}) 