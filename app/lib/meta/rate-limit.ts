/**
 * Meta API Rate Limiting Helper
 * 
 * Handles retries and exponential backoff for rate-limited requests
 */

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
}

/**
 * Fetch with automatic retry on rate limit errors
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000
  } = retryOptions

  let lastError: Error | null = null
  let delayMs = initialDelayMs

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Check for rate limit error
      if (response.status === 429 || response.status === 80004) {
        const errorData = await response.json()
        const errorMessage = errorData.error?.message || 'Rate limit exceeded'
        
        if (attempt < maxRetries) {
          console.warn(`[META] Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`)
          await sleep(delayMs)
          delayMs = Math.min(delayMs * 2, maxDelayMs) // Exponential backoff
          continue
        } else {
          throw new Error(`Rate limit exceeded after ${maxRetries} retries: ${errorMessage}`)
        }
      }

      // Check for other errors
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      // If it's not a network error and we've exhausted retries, throw
      if (attempt >= maxRetries) {
        throw lastError
      }

      // Retry on network errors
      console.warn(`[META] Request failed, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries}):`, lastError.message)
      await sleep(delayMs)
      delayMs = Math.min(delayMs * 2, maxDelayMs)
    }
  }

  throw lastError || new Error('Request failed')
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Batch requests with delay between each to avoid rate limits
 */
export async function batchWithDelay<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  delayMs: number = 100
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i++) {
    if (i > 0) {
      await sleep(delayMs) // Add delay between requests
    }
    results.push(await processor(items[i]))
  }

  return results
}
