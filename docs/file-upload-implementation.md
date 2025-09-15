# File Upload Implementation

## Overview
Complete file upload system for Ampel AI chat platform supporting multiple AI providers (Anthropic, Google Gemini, OpenAI) with different file handling capabilities.

## Features Implemented

### 1. Database & Storage
- ✅ Created Supabase Storage bucket `chat-attachments`
- ✅ Added `file_uploads` table for tracking uploads
- ✅ Added `attachments` JSONB column to messages table
- ✅ Implemented RLS policies for secure file access

### 2. Backend Services
- ✅ **PDF Processing**: Server-side text extraction using pdf-parse
- ✅ **File Upload API**: `/api/upload` endpoint with Supabase Storage integration
- ✅ **Provider-specific processing**:
  - Anthropic: Native image/PDF support via base64
  - Gemini: Native multi-modal support via base64
  - OpenAI: Images via base64, PDFs via text extraction

### 3. Frontend Components
- ✅ **FileUploadButton**: Click-to-upload with validation
- ✅ **FilePreview**: Display selected files with thumbnails
- ✅ **ChatInput Integration**: Drag-and-drop support, file management
- ✅ **Message Display**: Shows attached files in user messages

### 4. File Support
- **Images**: JPEG, PNG, GIF, WebP (all providers)
- **PDFs**: Native for Anthropic/Gemini, text extraction for OpenAI
- **Text**: Plain text, CSV, Markdown
- **Limits**: 10MB per file, 5 files per message

## Usage

### Uploading Files
1. Click the paperclip icon or drag files into the chat input
2. Preview shows with thumbnails for images
3. Remove unwanted files with X button
4. Send message with attachments

### Provider Behavior
- **Anthropic Claude**: Sees full PDF/image content natively
- **Google Gemini**: Processes all files multi-modally
- **OpenAI GPT**: Sees images directly, gets extracted text from PDFs

## Technical Architecture

### File Processing Flow
1. User selects files → Frontend validation
2. Upload to Supabase Storage → Get signed URLs
3. Process based on provider capabilities
4. Include in message stream with appropriate formatting
5. Store metadata in database for history

### Security
- Files stored with user-scoped paths
- RLS policies ensure users only access their own files
- Signed URLs with 1-hour expiration
- Server-side PDF processing prevents client exposure

## Migration Instructions

1. Apply the migration in Supabase Dashboard:
   - Go to SQL Editor
   - Run `/supabase/migrations/030_add_file_uploads.sql`
   - Verify storage bucket created

2. The system is ready to use - no additional configuration needed

## Testing Checklist

- [ ] Upload single image file
- [ ] Upload multiple files (mixed types)
- [ ] Test with each AI provider
- [ ] Verify PDF text extraction for OpenAI
- [ ] Test drag-and-drop functionality
- [ ] Verify file size limits
- [ ] Check file preview display
- [ ] Confirm attachments show in message history

## Known Limitations

1. PDF text extraction limited to 100k characters
2. No video file support currently
3. Files must be uploaded before sending (no async upload)
4. Base64 encoding increases payload size

## Future Enhancements

- Add support for more file types (Excel, Word docs)
- Implement file compression for large images
- Add OCR for image text extraction
- Support for async/background file processing
- File versioning and history