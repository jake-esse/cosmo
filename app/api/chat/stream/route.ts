import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { streamChat, getErrorMessage, isRetryableError } from '@/lib/ai/stream';
import { checkModelAccess } from '@/lib/ai/models';
import { ChatMessage } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  console.log('[CHAT-STREAM] Request received');
  
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[CHAT-STREAM] Auth error:', authError);
      return NextResponse.json(
        { error: true, message: 'Unauthorized', canRetry: false },
        { status: 401 }
      );
    }

    // Parse request body
    const { modelId, messages, webSearch } = await request.json();
    console.log('[CHAT-STREAM] Model:', modelId, 'Messages count:', messages?.length, 'Web search:', webSearch);
    

    if (!modelId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { 
          error: true, 
          message: 'Invalid request. Model ID and messages are required.',
          canRetry: false 
        },
        { status: 400 }
      );
    }

    // Check model access
    console.log('[CHAT-STREAM] Checking model access for user:', user.id);
    const access = await checkModelAccess(user.id, modelId);
    console.log('[CHAT-STREAM] Access result:', access);
    
    if (!access.has_access) {
      console.log('[CHAT-STREAM] Access denied - tier required:', access.tier_required);
      return NextResponse.json(
        {
          error: true,
          message: `You don't have access to this model. ${access.tier_required.toUpperCase()} tier required.`,
          code: 'TIER_REQUIRED',
          canRetry: false,
          suggestedAction: `Upgrade to ${access.tier_required.toUpperCase()} tier to use this model`,
        },
        { status: 403 }
      );
    }

    if (access.daily_limit !== null && access.remaining <= 0) {
      console.log('[CHAT-STREAM] Daily limit reached');
      return NextResponse.json(
        {
          error: true,
          message: `Daily limit reached for this model (${access.daily_limit} uses per day).`,
          code: 'DAILY_LIMIT',
          canRetry: false,
          suggestedAction: 'Try a different model or wait until tomorrow',
        },
        { status: 429 }
      );
    }

    // Stream the chat response
    console.log('[CHAT-STREAM] Starting stream for model:', modelId, 'with web search:', webSearch);
    const response = await streamChat({
      userId: user.id,
      modelId,
      messages: messages as ChatMessage[],
      webSearch,
    });
    
    console.log('[CHAT-STREAM] Stream response created successfully');
    return response;
  } catch (error: unknown) {
    console.error('Chat streaming error:', error);
    const err = error as { code?: string; message?: string };

    // Handle specific errors
    if (err.message?.includes('API key not configured')) {
      return NextResponse.json(
        {
          error: true,
          message: getErrorMessage(error),
          code: 'PROVIDER_UNAVAILABLE',
          canRetry: false,
          suggestedAction: 'Select a model from a different provider',
        },
        { status: 503 }
      );
    }

    if (err.code === 'RATE_LIMIT') {
      return NextResponse.json(
        {
          error: true,
          message: getErrorMessage(error),
          code: err.code,
          canRetry: true,
          suggestedAction: 'Try a different model or wait a moment',
        },
        { status: 429 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: true,
        message: getErrorMessage(error),
        code: err.code || 'UNKNOWN',
        canRetry: isRetryableError(error),
        suggestedAction: isRetryableError(error) 
          ? 'Retry with the same model'
          : 'Try a different model',
      },
      { status: 500 }
    );
  }
}

// Use Node.js runtime to ensure environment variables are accessible
export const runtime = 'nodejs';