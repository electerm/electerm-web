/**
 * AI integration with DeepSeek API
 */
import OpenAI from 'openai'
import log from '../common/log.js'
import defaultSettings from '../common/config-default.js'

// Initialize OpenAI with DeepSeek configuration
const initAIClient = async (config) => {
  return new OpenAI(config)
}

export const AIchat = async (
  prompt,
  model = defaultSettings.modelAI,
  role = defaultSettings.roleAI,
  baseURL = defaultSettings.baseURLAI,
  apiKey
) => {
  try {
    const client = await initAIClient({
      baseURL,
      apiKey
    })
    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: role
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model
    })

    return {
      response: completion.choices[0].message.content
    }
  } catch (e) {
    log.error('AI chat error')
    log.error(e)
    return {
      error: e.message,
      stack: e.stack
    }
  }
}
