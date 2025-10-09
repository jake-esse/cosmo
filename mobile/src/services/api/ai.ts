import { streamText } from 'ai';
import { createXai } from '@ai-sdk/xai';

/**
 * AI Integration Service
 * Handles all AI interactions using Vercel AI SDK with xAI's Grok models
 */

// Types
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamingOptions {
  modelId: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  onChunk?: (chunk: string) => void;
  onComplete?: (usage: TokenUsage) => void;
  onError?: (error: Error) => void;
}

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
 * Initialize xAI provider
 * @throws Error if API key is not configured
 */
export function initializeXaiProvider() {
  const apiKey = process.env.EXPO_PUBLIC_XAI_API_KEY;

  if (!apiKey || apiKey.startsWith('your_')) {
    throw new Error(
      'xAI API key not configured. Please set EXPO_PUBLIC_XAI_API_KEY in your .env.local file.'
    );
  }

  return createXai({ apiKey });
}

/**
 * Stream chat completion from xAI Grok model
 * This is an async generator that yields text chunks as they arrive
 *
 * @example
 * for await (const chunk of streamChatCompletion(options)) {
 *   console.log(chunk); // Display chunk in UI
 * }
 */
export async function* streamChatCompletion(
  options: StreamingOptions
): AsyncGenerator<string, TokenUsage, unknown> {
  const { modelId, messages, onChunk, onComplete, onError } = options;

  try {
    // Initialize provider
    const xai = initializeXaiProvider();

    // Get model instance
    const model = xai(modelId);

    // Add system message for better formatting
    const messagesWithSystem = [
      {
        role: 'system' as const,
        content:
          'You are a helpful assistant. Please format your responses using markdown for better readability. Use headers, bold text, code blocks, and lists where appropriate.',
      },
      ...messages,
    ];

    console.log('[AI] Starting stream with model:', modelId);
    console.log('[AI] Message count:', messagesWithSystem.length);

    // Stream the response
    const result = streamText({
      model,
      messages: messagesWithSystem,
      maxTokens: 4096,
      temperature: 0.7,
    } as any);

    // Stream text chunks
    for await (const chunk of (await result).textStream) {
      onChunk?.(chunk);
      yield chunk;
    }

    // Wait for completion to get usage stats
    const finalResult = await result;
    const completion = await finalResult.usage;

    const usage: TokenUsage = {
      promptTokens: completion?.inputTokens || 0,
      completionTokens: completion?.outputTokens || 0,
      totalTokens: (completion?.inputTokens || 0) + (completion?.outputTokens || 0),
    };

    console.log('[AI] Stream completed. Usage:', usage);
    onComplete?.(usage);

    return usage;
  } catch (error) {
    console.error('[AI] Streaming error:', error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    onError?.(errorObj);
    throw errorObj;
  }
}

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
