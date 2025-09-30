import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getModel, Provider } from './providers';
import { getModelConfig, incrementDailyUsage } from './models';
import { calculateCosts } from './costs';
import { StreamingOptions, ChatMessage, ModelUsage, SearchSource } from './types';

export async function streamChat(options: StreamingOptions) {
  const { userId, modelId, messages, webSearch = false } = options;
  console.log('[STREAM] Starting streamChat for model:', modelId, 'Web search:', webSearch);

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

  // Prepare provider options for web search if supported
  const providerOptions: any = {};

  // Enable web search for xAI models that support it AND user has enabled web search
  if (modelConfig.provider === 'xai' && modelConfig.supports_web_search && webSearch) {
    // According to the AI SDK documentation for xAI web search
    // Using 'auto' mode to let the model decide when to search based on the query
    providerOptions.xai = {
      searchParameters: {
        mode: 'auto', // Let model decide when to search
        returnCitations: true,
        maxSearchResults: 5, // Limit to 5 results
        sourceTypes: ['url'], // Only return web/URL results (exclude X posts, RSS feeds)
      }
    };
    console.log('[STREAM] ✅ Web search ENABLED for xAI model:', {
      modelId,
      provider: modelConfig.provider,
      supportsWebSearch: modelConfig.supports_web_search,
      userEnabledWebSearch: webSearch,
      searchMode: 'auto',
      returnCitations: true,
      maxSearchResults: 5,
      sourceTypes: ['url']
    });
  } else {
    console.log('[STREAM] ❌ Web search DISABLED:', {
      modelId,
      provider: modelConfig.provider,
      supportsWebSearch: modelConfig.supports_web_search,
      userEnabledWebSearch: webSearch,
      isXaiProvider: modelConfig.provider === 'xai'
    });
  }

  // Stream the response
  console.log('[STREAM] Starting streamText with', messagesWithSystem.length, 'messages');
  console.log('[STREAM] Provider options being sent:', JSON.stringify(providerOptions, null, 2));

  // Store sources that will be captured in onFinish
  const capturedSources: SearchSource[] = [];

  // Build the streamText configuration
  const streamConfig: any = {
    model,
    messages: messagesWithSystem,
    maxTokens: modelConfig.max_output_tokens,
  };

  // Add providerOptions if they exist
  if (Object.keys(providerOptions).length > 0) {
    streamConfig.providerOptions = providerOptions;
    console.log('[STREAM] Provider options added to config:', streamConfig.providerOptions);
  }

  streamConfig.onFinish = async (result: any) => {
      // Store reference to capturedSources
      // @ts-ignore
      streamConfig.onFinish.__capturedSources = capturedSources;
      console.log('[STREAM] onFinish result keys:', Object.keys(result));

      const { usage, finishReason, text } = result;

      console.log('[STREAM] Stream finished. Reason:', finishReason, 'Text length:', text?.length);
      console.log('[STREAM] First 200 chars of response:', text?.substring(0, 200));
      console.log('[STREAM] Usage data:', usage);

      // Extract sources using AI SDK's built-in sources property
      let searchUsed = false;
      let searchSources: SearchSource[] = [];

      if (webSearch && modelConfig.provider === 'xai') {
        try {
          console.log('[STREAM] Attempting to extract sources from result...');

          // AI SDK provides sources via result.sources (it's a promise)
          const rawSources = result.sources ? await result.sources : null;

          console.log('[STREAM] Raw sources:', rawSources);

          if (rawSources && Array.isArray(rawSources) && rawSources.length > 0) {
            searchUsed = true;

            // Transform sources into our SearchSource format and filter for URL-only sources
            searchSources = rawSources
              .filter((source: any) => {
                // Only include URL sources, exclude X posts, RSS feeds, etc.
                const sourceType = source.sourceType || 'url';
                return sourceType === 'url';
              })
              .map((source: any) => ({
                sourceType: source.sourceType || 'url',
                url: source.url,
                title: source.title,
                snippet: source.snippet,
              }))
              .slice(0, 5); // Limit to 5 sources max

            console.log('[STREAM] 🔍 WEB SEARCH SOURCES FOUND:', searchSources.length);
            searchSources.forEach((source, idx) => {
              console.log(`  [${idx + 1}] ${source.title || source.url}`);
            });

            // Store sources in the captured sources array for streaming
            if (streamConfig.onFinish.__capturedSources) {
              streamConfig.onFinish.__capturedSources.push(...searchSources);
            }

            // Call the callback with sources if provided
            if (options.onSearchUsed) {
              options.onSearchUsed(searchSources);
            }
          } else {
            console.log('[STREAM] No sources found in result');
          }
        } catch (error) {
          console.error('[STREAM] Error extracting sources:', error);
        }
      }

      if (!searchUsed && webSearch) {
        console.log('[STREAM] ⚠️ Web search was requested but no sources found');
      }

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
          searchUsed,
          searchSources,
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
    };

  const result = await streamText(streamConfig);

  // Get the original text stream
  const textStream = result.textStream;

  // Create a transform stream that appends sources at the end
  const transformedStream = new ReadableStream({
    async start(controller) {
      try {
        // Stream all text chunks
        for await (const chunk of textStream) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }

        // After streaming completes, wait a bit for onFinish to capture sources
        await new Promise(resolve => setTimeout(resolve, 100));

        // If we captured sources, append them as a special marker
        if (capturedSources.length > 0) {
          console.log('[STREAM] Appending', capturedSources.length, 'sources to stream');
          const sourcesMarker = `\n__SOURCES_START__${JSON.stringify(capturedSources)}__SOURCES_END__`;
          controller.enqueue(new TextEncoder().encode(sourcesMarker));
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  // Convert to proper Response for streaming
  console.log('[STREAM] Converting to text stream response with sources');
  return new Response(transformedStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    }
  });
}

async function trackUsage({
  userId,
  modelId,
  provider,
  usage,
  costs,
  searchUsed = false,
  searchSources = [],
}: {
  userId: string;
  modelId: string;
  provider: string;
  usage: any;
  costs: any;
  searchUsed?: boolean;
  searchSources?: SearchSource[];
}) {
  const supabase = await createClient();

  const metadata: any = {};
  if (searchUsed) {
    metadata.web_search_used = true;
    if (searchSources.length > 0) {
      metadata.sources = searchSources;
    }
  }

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
    metadata,
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

