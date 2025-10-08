import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

// POST /api/conversations/generate-title - Generate conversation title using OpenAI
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    try {
      // Generate title using OpenAI gpt-4o-mini
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `Generate a concise title for a conversation that starts with this message. The title should be 4 words maximum, capturing the main topic or intent. Do not use articles (a, an, the) or filler words. Focus on the key nouns and verbs. Return ONLY the title, nothing else.

User's first message: "${message}"

Title:`,
        temperature: 0.3,
        maxTokens: 20,
      });

      const title = text.trim();

      // Update conversation title if conversationId is provided
      if (conversationId) {
        await supabase
          .from('conversations')
          .update({ 
            title,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId)
          .eq('user_id', user.id);
      }

      return NextResponse.json({ title });
    } catch (aiError) {
      console.error('Error generating title with OpenAI:', aiError);
      
      // Fallback to simple extraction if OpenAI fails
      const words = message
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(' ')
        .filter((word: string) => word.length > 2)
        .slice(0, 4);
      
      const fallbackTitle = words.length > 0 
        ? words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : 'New Conversation';
      
      return NextResponse.json({ title: fallbackTitle });
    }
  } catch (error) {
    console.error('Error in POST /api/conversations/generate-title:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}