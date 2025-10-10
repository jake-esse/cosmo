/**
 * AI Integration Service
 * Configuration and utilities for AI models
 *
 * Note: AI streaming is now handled by the /api/chat endpoint
 * and useChat hook from @ai-sdk/react
 */

// Types
export interface Model {
  id: string;
  name: string;
  description: string;
  provider: 'xai';
  maxTokens: number;
}

// Available Grok models
export const AVAILABLE_MODELS: Model[] = [
  {
    id: 'grok-4-fast-non-reasoning',
    name: 'Grok 4 Fast',
    description: 'Fast responses without reasoning steps',
    provider: 'xai',
    maxTokens: 4096,
  },
  {
    id: 'grok-4-fast-reasoning',
    name: 'Grok 4 Fast Reasoning',
    description: 'Fast responses with reasoning steps',
    provider: 'xai',
    maxTokens: 4096,
  },
];

/**
 * Get user-friendly error message from AI SDK error
 */
export function getErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string };

  if (err.message?.includes('API key not configured')) {
    return 'AI service not configured. Please check your settings.';
  }

  if (err.message?.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (err.message?.includes('network') || err.message?.includes('fetch')) {
    return 'Connection lost. Please check your internet and try again.';
  }

  if (err.message?.includes('invalid') && err.message?.includes('api key')) {
    return 'Invalid API key. Please check your configuration.';
  }

  return 'An error occurred. Please try again.';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const err = error as { message?: string };

  // Network errors are retryable
  if (err.message?.includes('network') || err.message?.includes('fetch')) {
    return true;
  }

  // Rate limit errors are retryable (after waiting)
  if (err.message?.includes('rate limit')) {
    return true;
  }

  // Configuration errors are not retryable
  if (
    err.message?.includes('API key not configured') ||
    err.message?.includes('invalid') && err.message?.includes('api key')
  ) {
    return false;
  }

  // Default to retryable for unknown errors
  return true;
}

/**
 * Get available models for the current user
 * In the future, this can be filtered based on user tier/subscription
 */
export function getAvailableModels(): Model[] {
  return AVAILABLE_MODELS;
}

/**
 * Get default model ID
 */
export function getDefaultModelId(): string {
  return 'grok-4-fast-non-reasoning';
}
