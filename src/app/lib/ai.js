/**
 * AI integration with DeepSeek API
 */
import axios from 'axios'
import log from '../common/log.js'
import defaultSettings from '../common/config-default.js'

// Initialize OpenAI with DeepSeek configuration
const createAIClient = (baseURL, apiKey) => {
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    }
  })
}

export const AIchat = async (
  prompt,
  model = defaultSettings.modelAI,
  role = defaultSettings.roleAI,
  baseURL = defaultSettings.baseURLAI,
  path = defaultSettings.apiPathAI,
  apiKey
) => {
  try {
    const client = createAIClient(baseURL, apiKey)
    const response = await client.post(path, {
      model,
      messages: [
        {
          role: 'system',
          content: role
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    return {
      response: response.data.choices[0].message.content
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
