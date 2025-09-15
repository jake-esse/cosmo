import { NextRequest, NextResponse } from 'next/server';
import { PDFProcessor } from '@/lib/ai/pdf-processor.server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const provider = formData.get('provider') as string || 'gemini';

    if (!file || !PDFProcessor.isPDF(file.type)) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Process PDF
    console.log('[TEST-PDF] Processing PDF:', file.name, 'for provider:', provider);
    const pdfResult = await PDFProcessor.extractText(buffer);
    console.log('[TEST-PDF] PDF Result:', {
      fileName: file.name,
      hasText: !!pdfResult.text,
      textLength: pdfResult.text?.length || 0,
      pageCount: pdfResult.pageCount,
      truncated: pdfResult.truncated,
      hasError: !!pdfResult.error,
      error: pdfResult.error,
      processingTimeMs: pdfResult.processingTimeMs
    });

    // Prepare response based on provider
    const response: any = {
      fileName: file.name,
      provider,
      pageCount: pdfResult.pageCount,
      truncated: pdfResult.truncated,
      processingTimeMs: pdfResult.processingTimeMs,
      textLength: pdfResult.text?.length || 0,
      textPreview: pdfResult.text?.substring(0, 500) || '',
      error: pdfResult.error
    };

    // Add provider-specific data
    if (provider === 'anthropic') {
      response.includesBase64 = true;
      response.base64Size = buffer.toString('base64').length;
    } else if (provider === 'gemini' || provider === 'google') {
      response.includesBase64 = false;
      response.extractedText = !!pdfResult.text && !pdfResult.error;
      response.processedContent = pdfResult.text ? 
        PDFProcessor.formatForAI(file.name, pdfResult).substring(0, 500) + '...' : 
        null;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[TEST-PDF] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}