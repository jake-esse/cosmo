import { NextResponse } from 'next/server';
import { isProviderAvailable, getAvailableProviders } from '@/lib/ai/providers';

export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const googleKey = process.env.GOOGLE_AI_API_KEY;
  
  return NextResponse.json({
    providers: {
      anthropic: {
        available: isProviderAvailable('anthropic'),
        keyExists: !!anthropicKey,
        keyStartsWith: anthropicKey ? anthropicKey.substring(0, 10) + '...' : 'none',
        startsWithYour: anthropicKey?.startsWith('your_'),
      },
      openai: {
        available: isProviderAvailable('openai'),
        keyExists: !!openaiKey,
        keyStartsWith: openaiKey ? openaiKey.substring(0, 10) + '...' : 'none',
        startsWithYour: openaiKey?.startsWith('your_'),
      },
      google: {
        available: isProviderAvailable('google'),
        keyExists: !!googleKey,
        keyStartsWith: googleKey ? googleKey.substring(0, 10) + '...' : 'none',
        startsWithYour: googleKey?.startsWith('your_'),
      },
    },
    availableProviders: getAvailableProviders(),
  });
}

export const runtime = 'edge';