-- Migration: Add file upload support for chat messages
-- Description: Creates storage bucket, file_uploads table, and updates messages table for attachments

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments', 
  false,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket RLS policies
CREATE POLICY "Users can upload their own chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create file_uploads table for tracking uploads
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  processed_content TEXT,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT file_uploads_file_size_check CHECK (file_size > 0 AND file_size <= 10485760),
  CONSTRAINT file_uploads_mime_type_check CHECK (
    mime_type IN (
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'text/markdown'
    )
  )
);

-- Create indexes for file_uploads
CREATE INDEX idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX idx_file_uploads_conversation_id ON public.file_uploads(conversation_id);
CREATE INDEX idx_file_uploads_message_id ON public.file_uploads(message_id);
CREATE INDEX idx_file_uploads_created_at ON public.file_uploads(created_at DESC);

-- Add attachments column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Create composite index for messages with attachments
CREATE INDEX idx_messages_attachments ON public.messages(conversation_id, created_at DESC) 
WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb;

-- RLS policies for file_uploads table
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own file uploads"
ON public.file_uploads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own file uploads"
ON public.file_uploads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own file uploads"
ON public.file_uploads FOR DELETE
USING (auth.uid() = user_id);

-- Function to clean up orphaned files (files without associated messages after 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete file records that have no message_id and are older than 24 hours
  DELETE FROM public.file_uploads
  WHERE message_id IS NULL
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.file_uploads IS 'Tracks file uploads for chat messages, including processing metadata and storage paths';
COMMENT ON COLUMN public.messages.attachments IS 'JSONB array of attachment objects with file metadata and signed URLs';