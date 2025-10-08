import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/conversations/list - List user's conversations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const archived = searchParams.get('archived') === 'true';

    // Build query
    const query = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('archived', archived)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: conversations, error, count } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    return NextResponse.json({ 
      conversations: conversations || [], 
      total: count || 0 
    });
  } catch (error) {
    console.error('Error in GET /api/conversations/list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}