import express from 'express'
import type { Request, Response } from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import { createError } from 'http-errors'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Initialize AI clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// AI Response endpoint
app.post('/api/agent/response', async (req: Request, res: Response) => {
  try {
    const { provider, prompt, context } = req.body

    switch (provider) {
      case 'openai': {
        if (!process.env.OPENAI_API_KEY) {
          throw createError({
            statusCode: 500,
            message: 'OpenAI API key not configured'
          })
        }

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
        
        return res.json({
          text: response.choices[0]?.message?.content || '',
          reasoning: ['Analyzed context', 'Considered objectives', 'Made decision'],
          confidence: 0.85
        })
      }
      
      case 'gemini': {
        if (!process.env.GOOGLE_API_KEY) {
          throw createError({
            statusCode: 500,
            message: 'Google API key not configured'
          })
        }

        const model = gemini.getGenerativeModel({ model: 'gemini-pro' })
        const response = await model.generateContent(prompt)
        const result = response.response.text()
        
        return res.json({
          text: result,
          reasoning: ['Processed input', 'Generated response', 'Evaluated outcome'],
          confidence: 0.8
        })
      }
      
      case 'anthropic': {
        if (!process.env.ANTHROPIC_API_KEY) {
          throw createError({
            statusCode: 500,
            message: 'Anthropic API key not configured'
          })
        }

        const response = await anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        })
        
        return res.json({
          text: response.content[0].text,
          reasoning: ['Analyzed situation', 'Applied context', 'Generated decision'],
          confidence: 0.9
        })
      }
      
      default:
        return res.status(400).json({ error: `Invalid AI provider: ${provider}` })
    }
  } catch (error: any) {
    console.error('AI Service Error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 