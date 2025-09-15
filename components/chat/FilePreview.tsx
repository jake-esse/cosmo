'use client';

import { X, File, FileText, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileProcessor } from '@/lib/ai/file-processor-client';
import { UploadedFile } from '@/lib/ai/types';

interface FilePreviewProps {
  files: (File | UploadedFile)[];
  onRemove: (index: number) => void;
  uploading?: boolean;
  uploadProgress?: { [key: string]: number };
}

export function FilePreview({ 
  files, 
  onRemove, 
  uploading = false,
  uploadProgress = {}
}: FilePreviewProps) {
  if (files.length === 0) return null;

  const getFileIcon = (file: File | UploadedFile) => {
    const mimeType = 'type' in file ? file.type : file.mimeType;
    
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const getFileName = (file: File | UploadedFile) => {
    return 'name' in file ? file.name : file.fileName;
  };

  const getFileSize = (file: File | UploadedFile) => {
    const size = 'size' in file ? file.size : file.fileSize;
    return FileProcessor.formatFileSize(size);
  };

  const getFileThumbnail = (file: File | UploadedFile) => {
    // For uploaded files with signed URLs
    if ('signedUrl' in file && file.mimeType.startsWith('image/')) {
      return (
        <img 
          src={file.signedUrl} 
          alt={file.fileName}
          className="w-full h-full object-cover"
        />
      );
    }
    
    // For local files that are images
    if ('type' in file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      return (
        <img 
          src={url} 
          alt={file.name}
          className="w-full h-full object-cover"
          onLoad={() => URL.revokeObjectURL(url)}
        />
      );
    }
    
    // Default icon for non-images
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        {getFileIcon(file)}
      </div>
    );
  };

  const isUploading = (file: File | UploadedFile) => {
    const fileName = getFileName(file);
    return uploading && uploadProgress[fileName] !== undefined;
  };

  const getUploadProgress = (file: File | UploadedFile) => {
    const fileName = getFileName(file);
    return uploadProgress[fileName] || 0;
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-[20px] bg-white/40 backdrop-blur-sm border border-slate-200/50">
      {files.map((file, index) => {
        const fileName = getFileName(file);
        const fileSize = getFileSize(file);
        const uploading = isUploading(file);
        const progress = getUploadProgress(file);
        
        return (
          <div
            key={`${fileName}-${index}`}
            className="relative group flex items-center gap-2 p-2 bg-muted rounded-lg max-w-[200px]"
          >
            {/* Thumbnail */}
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
              {getFileThumbnail(file)}
            </div>
            
            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" title={fileName}>
                {fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {fileSize}
              </p>
            </div>
            
            {/* Upload progress or remove button */}
            {uploading ? (
              <div className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">{progress}%</span>
              </div>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            
            {/* Upload progress bar */}
            {uploading && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted-foreground/20 rounded-b-lg overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}