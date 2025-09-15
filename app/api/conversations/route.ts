import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSafeTitle } from '@/lib/utils/chatNaming';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

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

    // Generate title using OpenAI if we have a first message
    if (firstMessage && !title) {
      try {
        const { text } = await generateText({
          model: openai('gpt-4o-mini'),
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
          .eq('id', conversation.id)
          .eq('user_id', user.id);
        
        // Return the conversation with the updated title
        conversation.title = generatedTitle;
      } catch (aiError) {
        console.error('Error generating title with OpenAI:', aiError);
        // Use fallback title generation
        const fallbackTitle = generateSafeTitle(firstMessage);
        await supabase
          .from('conversations')
          .update({ 
            title: fallbackTitle,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.id)
          .eq('user_id', user.id);
        conversation.title = fallbackTitle;
      }
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error in POST /api/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}