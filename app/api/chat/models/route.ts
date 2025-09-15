import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAvailableModels } from '@/lib/ai/models';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get available models for the user
    const models = await getUserAvailableModels(user.id);

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching user models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available models' },
      { status: 500 }
    );
  }
}