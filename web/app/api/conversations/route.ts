import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSafeTitle } from '@shared/utils/chatNaming';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Helper function to generate title asynchronously (non-blocking)
async function generateTitleAsync(conversationId: string, firstMessage: string, userId: string) {
  try {
    const supabase = await createClient();

    try {
      const { text } = await generateText({
        model: openai('gpt-5-nano'),
        prompt: `Generate a concise title for a conversation that starts with this message. The title should be 4 words maximum, capturing the main topic or intent. Do not use articles (a, an, the) or filler words. Focus on the key nouns and verbs. Return ONLY the title, nothing else.

User's first message: "${firstMessage}"

Title:`,
        temperature: 0.3,
        maxTokens: 20,
      });

      const generatedTitle = text.trim() || 'New Conversation';

      // Update the conversation with the generated title
      await supabase
        .from('conversations')
        .update({
          title: generatedTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', userId);

      console.log('[TITLE-GEN] Successfully generated title for conversation:', conversationId);
    } catch (aiError) {
      console.error('[TITLE-GEN] Error generating title with OpenAI:', aiError);
      // Use fallback title generation
      const fallbackTitle = generateSafeTitle(firstMessage);
      await supabase
        .from('conversations')
        .update({
          title: fallbackTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', userId);
      console.log('[TITLE-GEN] Used fallback title for conversation:', conversationId);
    }
  } catch (error) {
    console.error('[TITLE-GEN] Failed to generate title:', error);
    // Silent fail - conversation still works with temp title
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, model, firstMessage } = body;

    // Start with a temporary title
    const temporaryTitle = 'New Conversation';

    // Create conversation with temporary title
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: title || temporaryTitle,
        model: model || 'gemini-2.5-flash-lite',
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Generate title in background (fire-and-forget) if we have a first message
    // This doesn't block the response - UI gets immediate feedback
    if (firstMessage && !title) {
      generateTitleAsync(conversation.id, firstMessage, user.id).catch(err => {
        console.error('[TITLE-GEN] Background title generation failed:', err);
      });
    }

    // Return immediately with temp title - don't wait for title generation
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error in POST /api/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}