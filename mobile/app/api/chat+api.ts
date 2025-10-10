/**
 * Chat API Route - Streaming Endpoint for xAI Grok Models
 *
 * This Expo Router API route handles streaming chat requests using
 * xAI's Grok models via the Vercel AI SDK.
 *
 * Supported models:
 * - grok-4-fast-non-reasoning
 * - grok-4-fast-reasoning
 *
 * @see https://ai-sdk.dev/docs/getting-started/expo
 */

import { streamText } from 'ai';
import { createXai } from '@ai-sdk/xai';

// Define supported Grok models
const SUPPORTED_MODELS = [
  'grok-4-fast-non-reasoning',
  'grok-4-fast-reasoning',
] as const;

type SupportedModel = (typeof SUPPORTED_MODELS)[number];

// System message for markdown formatting
const SYSTEM_MESSAGE = {
  role: 'system' as const,
  content:
    'You are a helpful assistant. Please format your responses using markdown for better readability. Use headers, bold text, code blocks, and lists where appropriate.',
};

/**
 * Request body type
 */
interface ChatRequest {
  modelId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

/**
 * Validates that the model ID is supported
 */
function isSupportedModel(modelId: string): modelId is SupportedModel {
  return SUPPORTED_MODELS.includes(modelId as SupportedModel);
}

/**
 * POST handler for streaming chat completions
 *
 * Accepts a request with modelId and messages, streams the response
 * using the xAI provider.
 *
 * @param req - Request object containing JSON body
 * @returns Streaming response with chat completion
 */
export async function POST(req: Request) {
  try {
    // Check if XAI_API_KEY is configured
    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'XAI_API_KEY not configured',
          message: 'Please set XAI_API_KEY in your environment variables',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for placeholder values
    if (apiKey.startsWith('your_')) {
      return new Response(
        JSON.stringify({
          error: 'XAI_API_KEY is a placeholder',
          message: 'Please replace the placeholder with your actual xAI API key',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    let body: ChatRequest;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate required fields
    if (!body.modelId) {
      return new Response(
        JSON.stringify({
          error: 'Missing modelId',
          message: 'Request body must include a modelId field',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({
          error: 'Missing or invalid messages',
          message: 'Request body must include a messages array',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate model ID
    if (!isSupportedModel(body.modelId)) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported model',
          message: `Model ${body.modelId} is not supported. Supported models: ${SUPPORTED_MODELS.join(', ')}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create xAI provider
    const xai = createXai({
      apiKey,
    });

    // Add system message to the beginning of messages
    const messagesWithSystem = [SYSTEM_MESSAGE, ...body.messages];

    // Stream the chat completion
    const result = streamText({
      model: xai(body.modelId),
      messages: messagesWithSystem,
    });

    // Return streaming response
    return result.toUIMessageStreamResponse({
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'none',
      },
    });
  } catch (error) {
    // Log error for debugging
    console.error('[Chat API] Error:', error);

    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
