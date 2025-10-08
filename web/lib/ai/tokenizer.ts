import { encodingForModel } from 'js-tiktoken';

// Context window limits for each model (in tokens)
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'claude-3-5-haiku-latest': 200000,
  'claude-sonnet-4-0': 200000,
  'claude-opus-4-1': 200000,
  'gpt-5-nano': 128000,
  'gpt-5-mini': 128000,
  'gpt-5': 128000,
  'gemini-2.5-flash-lite': 1000000,
  'gemini-2.5-flash': 1000000,
  'gemini-2.5-pro': 1000000,
};

// Reserve 10% of context for response
export const CONTEXT_USAGE_THRESHOLD = 0.9;

// Get the provider for a model
export function getProviderForModel(modelId: string): 'openai' | 'anthropic' | 'google' {
  if (modelId.startsWith('claude')) {
    return 'anthropic';
  } else if (modelId.startsWith('gpt')) {
    return 'openai';
  } else if (modelId.startsWith('gemini')) {
    return 'google';
  }
  // Default fallback
  return 'openai';
}

// Count tokens for a given text based on the provider
export async function countTokens(text: string, modelId: string): Promise<number> {
  const provider = getProviderForModel(modelId);
  
  if (provider === 'openai') {
    try {
      // Use tiktoken for OpenAI models
      const encoding = encodingForModel('gpt-4o');
      const tokens = encoding.encode(text);
      const count = tokens.length;
      // Note: encoding.free() is not available in browser version of js-tiktoken
      // The garbage collector will handle cleanup automatically
      return count;
    } catch (error) {
      console.error('Error counting OpenAI tokens:', error);
      // Fallback to approximation
      return Math.ceil(text.length / 4);
    }
  } else {
    // For Claude and Gemini, use character-based approximation
    // 1 token ≈ 3.5 characters
    return Math.ceil(text.length / 3.5);
  }
}

// Count tokens for multiple messages
export async function countMessagesTokens(
  messages: Array<{ role: string; content: string }>,
  modelId: string
): Promise<number> {
  let totalTokens = 0;
  
  for (const message of messages) {
    // Count tokens for role (system, user, assistant)
    totalTokens += await countTokens(message.role, modelId);
    // Count tokens for content
    totalTokens += await countTokens(message.content, modelId);
    // Add some overhead for message structure (approximately 4 tokens per message)
    totalTokens += 4;
  }
  
  return totalTokens;
}

// Check if adding a new message would exceed the context limit
export async function wouldExceedContextLimit(
  currentTokens: number,
  newMessageContent: string,
  modelId: string
): Promise<boolean> {
  const limit = MODEL_CONTEXT_LIMITS[modelId];
  if (!limit) {
    // If model not in our list, allow it
    return false;
  }
  
  const newMessageTokens = await countTokens(newMessageContent, modelId);
  const totalTokens = currentTokens + newMessageTokens;
  const threshold = limit * CONTEXT_USAGE_THRESHOLD;
  
  return totalTokens > threshold;
}

// Get remaining tokens for a model
export function getRemainingTokens(currentTokens: number, modelId: string): number {
  const limit = MODEL_CONTEXT_LIMITS[modelId];
  if (!limit) {
    return Infinity;
  }
  
  const threshold = limit * CONTEXT_USAGE_THRESHOLD;
  return Math.max(0, threshold - currentTokens);
}

// Get model display name
export function getModelDisplayName(modelId: string): string {
  const modelNames: Record<string, string> = {
    'claude-3-5-haiku-latest': 'Claude 3.5 Haiku',
    'claude-sonnet-4-0': 'Claude Sonnet 4.0',
    'claude-opus-4-1': 'Claude Opus 4.1',
    'gpt-5-nano': 'GPT-5 Nano',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5': 'GPT-5',
    'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
  };
  
  return modelNames[modelId] || modelId;
}