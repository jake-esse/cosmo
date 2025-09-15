'use client';

import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileProcessor } from '@/lib/ai/file-processor-client';

interface FileUploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  accept?: string;
}

const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,text/markdown';

export function FileUploadButton({
  onFilesSelected,
  disabled = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  accept = DEFAULT_ACCEPT
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Validate file count
    if (files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed. Please select fewer files.`);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file sizes and types
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File size exceeds ${FileProcessor.formatFileSize(maxFileSize)} limit`);
        continue;
      }

      // Check file type
      const acceptedTypes = accept.split(',').map(t => t.trim());
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: File type ${file.type} not supported`);
        continue;
      }

      validFiles.push(file);
    }

    // Show errors if any
    if (errors.length > 0) {
      alert('File validation errors:\n' + errors.join('\n'));
    }

    // Pass valid files to parent
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    // Reset input for next selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={handleClick}
        disabled={disabled}
        className="h-8 w-8"
        title="Attach files"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  );
}