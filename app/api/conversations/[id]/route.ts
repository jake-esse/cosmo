import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { countTokens } from '@/lib/ai/tokenizer';

// GET /api/conversations/[id] - Get conversation with messages
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', params.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Calculate tokens if not already tracked
    let totalTokensUsed = conversation.total_tokens_used || 0;
    if (totalTokensUsed === 0 && messages && messages.length > 0) {
      // Calculate tokens for existing messages
      const model = conversation.model || 'gemini-2.5-flash-lite';
      for (const msg of messages) {
        if (msg.content) {
          const tokens = msg.tokens_used || await countTokens(msg.content, model);
          totalTokensUsed += tokens;
          
          // Update message with token count if not set
          if (!msg.tokens_used) {
            await supabase
              .from('messages')
              .update({ tokens_used: tokens })
              .eq('id', msg.id);
          }
        }
      }
      
      // Update conversation with total tokens
      await supabase
        .from('conversations')
        .update({ total_tokens_used: totalTokensUsed })
        .eq('id', params.id);
        
      conversation.total_tokens_used = totalTokensUsed;
    }

    return NextResponse.json({ conversation, messages: messages || [] });
  } catch (error) {
    console.error('Error in GET /api/conversations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/conversations/[id] - Update conversation
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, last_message_at, total_tokens_used, archived } = body;

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (last_message_at !== undefined) updates.last_message_at = last_message_at;
    if (total_tokens_used !== undefined) updates.total_tokens_used = total_tokens_used;
    if (archived !== undefined) updates.archived = archived;
    updates.updated_at = new Date().toISOString();

    // Update conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation:', error);
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error in PATCH /api/conversations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete messages first (cascade should handle this, but being explicit)
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', params.id);

    // Delete conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting conversation:', error);
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/conversations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}