import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getModel, Provider } from './providers';
import { getModelConfig, incrementDailyUsage } from './models';
import { calculateCosts } from './costs';
import { StreamingOptions, ChatMessage, ModelUsage } from './types';

export async function streamChat(options: StreamingOptions) {
  const { userId, modelId, messages } = options;
  console.log('[STREAM] Starting streamChat for model:', modelId);

  // Get model configuration
  const modelConfig = await getModelConfig(modelId);
  console.log('[STREAM] Model config:', modelConfig);
  
  if (!modelConfig) {
    throw new Error(`Model ${modelId} not found or disabled`);
  }

  if (!modelConfig.enabled) {
    throw new Error(`Model ${modelId} is currently disabled`);
  }

  // Get the AI model instance
  console.log('[STREAM] Getting model instance for provider:', modelConfig.provider);
  const model = getModel(modelConfig.provider as Provider, modelId);

  // Convert messages to AI SDK format and filter out empty messages
  const aiMessages = messages
    .filter(msg => msg.content && msg.content.trim() !== '')
    .map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content.trim(),
    }));
  
  // Ensure we have at least one message
  if (aiMessages.length === 0) {
    throw new Error('No valid messages to process');
  }
  
  console.log('[STREAM] Filtered messages:', aiMessages.map(m => ({
    role: m.role,
    contentType: typeof m.content,
    contentLength: typeof m.content === 'string' ? m.content.length : 0,
    hasContent: !!m.content
  })));

  // Add system message to encourage markdown formatting for better readability
  const messagesWithSystem = [
    {
      role: 'system' as const,
      content: 'You are a helpful assistant. Please format your responses using markdown for better readability. Use headers, bold text, code blocks, and lists where appropriate.'
    },
    ...aiMessages
  ];

  // Stream the response
  console.log('[STREAM] Starting streamText with', messagesWithSystem.length, 'messages');
  const result = await streamText({
    model,
    messages: messagesWithSystem,
    maxTokens: modelConfig.max_output_tokens,
    onFinish: async ({ usage, finishReason, text }) => {
      console.log('[STREAM] Stream finished. Reason:', finishReason, 'Text length:', text?.length);
      console.log('[STREAM] First 200 chars of response:', text?.substring(0, 200));
      if (usage) {
        // Calculate costs
        const costs = calculateCosts(
          {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          },
          modelConfig
        );

        // Track usage in database
        await trackUsage({
          userId,
          modelId,
          provider: modelConfig.provider,
          usage,
          costs,
        });

        // Update daily usage
        await incrementDailyUsage(
          userId,
          modelId,
          usage.promptTokens,
          usage.completionTokens
        );

        // Call optional callback
        if (options.onTokenUsage) {
          options.onTokenUsage({
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          });
        }
      }
    },
  });

  // Convert to proper Response for streaming
  console.log('[STREAM] Converting to text stream response');
  return result.toTextStreamResponse();
}

async function trackUsage({
  userId,
  modelId,
  provider,
  usage,
  costs,
}: {
  userId: string;
  modelId: string;
  provider: string;
  usage: any;
  costs: any;
}) {
  const supabase = await createClient();

  const usageRecord: ModelUsage = {
    user_id: userId,
    model: modelId,
    provider,
    input_tokens: usage.promptTokens,
    output_tokens: usage.completionTokens,
    api_input_cost: costs.apiInputCost,
    api_output_cost: costs.apiOutputCost,
    user_input_cost: costs.userInputCost,
    user_output_cost: costs.userOutputCost,
  };

  const { error } = await supabase.from('model_usage').insert(usageRecord);

  if (error) {
    console.error('Error tracking model usage:', error);
    // Don't throw - we don't want to break the stream if tracking fails
  }
}

export function getErrorMessage(error: any): string {
  if (error.code === 'RATE_LIMIT') {
    return 'Rate limit exceeded. Please try a different model or wait a moment.';
  }
  
  if (error.code === 'INVALID_API_KEY') {
    return 'Invalid API key. This model is temporarily unavailable.';
  }
  
  if (error.code === 'MODEL_NOT_FOUND') {
    return 'Model not found. Please select a different model.';
  }
  
  if (error.message?.includes('API key not configured')) {
    return `${error.message}. Please select a model from a different provider.`;
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
}

export function isRetryableError(error: any): boolean {
  const nonRetryableCodes = ['INVALID_API_KEY', 'MODEL_NOT_FOUND', 'UNAUTHORIZED'];
  
  if (nonRetryableCodes.includes(error.code)) {
    return false;
  }
  
  if (error.message?.includes('API key not configured')) {
    return false;
  }
  
  return true;
}

