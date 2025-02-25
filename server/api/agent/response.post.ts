import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  try {
    const body = await readBody(event)
    
    if (!body || typeof body !== 'object') {
      throw createError({
        status: 400,
        message: 'Invalid request body'
      })
    }
    
    const { provider, prompt, context } = body

    if (!provider || !prompt) {
      throw createError({
        status: 400,
        message: 'Missing required fields: provider and prompt'
      })
    }

    if (!body.prompt) {
      throw createError({
        status: 400,
        message: 'Prompt is required'
      })
    }

    if (!body.agentId) {
      throw createError({
        status: 400,
        message: 'Agent ID is required'
      })
    }

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

        const gemini = new GoogleGenerativeAI(config.googleApiKey)
        const model = gemini.getGenerativeModel({ model: 'gemini-pro' })
        const response = await model.generateContent(prompt)
        const result = response.response.text()
        
        return {
          text: result,
          reasoning: ['Processed input', 'Generated response', 'Evaluated outcome'],
          confidence: 0.8
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
          status: 400,
          message: `Invalid AI provider: ${provider}`
        })
    }
  } catch (error: any) {
    console.error('AI Service Error:', error)
    
    // Handle different types of errors
    if (error.statusCode) {
      throw error // Re-throw Nuxt errors
    }
    
    throw createError({
      status: 500,
      message: error.message || 'Internal server error'
    })
  }
}) 