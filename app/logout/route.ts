import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  // Sign out the user
  await supabase.auth.signOut();
  
  // Redirect to login page (use the request URL to get the correct host)
  const url = new URL('/login', 'http://localhost:3002');
  return NextResponse.redirect(url);
}