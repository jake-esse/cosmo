import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { PDFProcessor } from '@/lib/ai/pdf-processor.server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 5;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown'
];

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
    const files = formData.getAll('files') as File[];
    const conversationId = formData.get('conversationId') as string;
    const provider = formData.get('provider') as string || 'anthropic';

    // Validate inputs
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_REQUEST} files allowed per upload` },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Process each file
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        try {
          // Validate file type
          if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return {
              fileName: file.name,
              error: `Unsupported file type: ${file.type}`
            };
          }

          // Validate file size
          if (file.size > MAX_FILE_SIZE) {
            return {
              fileName: file.name,
              error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
            };
          }

          // Generate unique file ID
          const fileId = uuidv4();
          const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
          const storagePath = `${user.id}/${conversationId}/${fileId}_${file.name}`;

          // Convert file to buffer for processing
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(storagePath, buffer, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return {
              fileName: file.name,
              error: `Upload failed: ${uploadError.message}`
            };
          }

          // Process file based on provider
          let processedFile: any = {
            id: fileId,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size
          };

          // Always include base64 for providers that need it
          const base64 = buffer.toString('base64');

          // Handle PDF processing server-side
          if (PDFProcessor.isPDF(file.type)) {
            const pdfResult = await PDFProcessor.extractText(buffer);
            console.log('PDF Processing Result:', {
              fileName: file.name,
              hasText: !!pdfResult.text,
              textLength: pdfResult.text?.length || 0,
              hasError: !!pdfResult.error,
              error: pdfResult.error
            });
            
            // Only set content if there's no error
            if (!pdfResult.error && pdfResult.text) {
              processedFile.text = pdfResult.text;
              processedFile.processedContent = PDFProcessor.formatForAI(file.name, pdfResult);
              processedFile.processingTimeMs = pdfResult.processingTimeMs;
            } else {
              // If there's an error, still include it but mark appropriately
              processedFile.error = pdfResult.error || 'Failed to extract PDF text';
              processedFile.processedContent = `[File: ${file.name}]\n[Error: Unable to read PDF content]`;
            }
            
            // Include base64 only for Anthropic (supports native PDF)
            // Gemini needs text extraction, not base64 PDF
            if (provider === 'anthropic') {
              processedFile.base64 = base64;
            }
          } else if (file.type.startsWith('text/')) {
            // Handle text files
            processedFile.text = buffer.toString('utf-8');
            processedFile.processedContent = `[File: ${file.name}]\n\n${processedFile.text}`;
          } else if (file.type.startsWith('image/')) {
            // Always include base64 for images
            processedFile.base64 = base64;
          }

          // Generate signed URL (1 hour expiry)
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('chat-attachments')
            .createSignedUrl(storagePath, 3600);

          if (signedUrlError) {
            console.error('Signed URL error:', signedUrlError);
            return {
              fileName: file.name,
              error: `Failed to generate download URL: ${signedUrlError.message}`
            };
          }

          // Store file metadata in database
          const { data: fileRecord, error: dbError } = await supabase
            .from('file_uploads')
            .insert({
              user_id: user.id,
              conversation_id: conversationId,
              file_name: file.name,
              file_type: fileExtension,
              file_size: file.size,
              mime_type: file.type,
              storage_path: storagePath,
              processed_content: processedFile.processedContent || null,
              processing_time_ms: processedFile.processingTimeMs || null,
              metadata: {
                provider,
                truncated: processedFile.text ? 
                  processedFile.text.length > 100000 : false,
                has_error: !!processedFile.error
              }
            })
            .select()
            .single();

          if (dbError) {
            console.error('Database error:', dbError);
            // Don't fail the upload, just log the error
          }

          return {
            id: fileRecord?.id || fileId,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            signedUrl: signedUrlData.signedUrl,
            storagePath,
            processedFile: processedFile, // Keep base64 for AI providers
            uploadedAt: new Date().toISOString()
          };
        } catch (error) {
          console.error('File processing error:', error);
          return {
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // Separate successful uploads from errors
    const successful = uploadResults.filter(r => !r.error);
    const failed = uploadResults.filter(r => r.error);

    return NextResponse.json({
      success: true,
      uploaded: successful,
      failed,
      totalFiles: files.length,
      successCount: successful.length,
      failCount: failed.length
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Configure maximum request size
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Support multiple 10MB files
    },
  },
};