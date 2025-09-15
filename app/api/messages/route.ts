import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { countTokens } from '@/lib/ai/tokenizer';

// POST /api/messages - Save message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversation_id, role, content, model, provider, model_usage, error_details, attachments } = body;

    // Verify conversation belongs to user and get current token count
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, total_tokens_used, model')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Calculate tokens for this message
    const modelToUse = model || conversation.model || 'gemini-2.5-flash-lite';
    const calculatedTokens = await countTokens(content, modelToUse);
    const tokens_used = body.tokens_used || calculatedTokens;

    // Create message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        role,
        content,
        model: modelToUse,
        tokens_used,
        provider,
        model_usage,
        error_details,
        attachments: attachments || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }

    // Update conversation's last_message_at and total_tokens_used
    const newTotalTokens = (conversation.total_tokens_used || 0) + tokens_used;
    await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_tokens_used: newTotalTokens
      })
      .eq('id', conversation_id);

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}