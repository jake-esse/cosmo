import { PDFProcessor } from './pdf-processor';

export interface ProcessedFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  base64?: string;
  text?: string;
  processedContent?: string;
  processingTimeMs?: number;
  error?: string;
}

export interface FileProcessingOptions {
  provider: 'anthropic' | 'google' | 'openai';
  maxFileSize?: number;
  extractText?: boolean;
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class FileProcessor {
  private static readonly SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  private static readonly SUPPORTED_TEXT_TYPES = [
    'text/plain',
    'text/csv',
    'text/markdown'
  ];

  /**
   * Process a file based on the AI provider's capabilities
   */
  static async processFile(
    file: File | Buffer,
    fileName: string,
    mimeType: string,
    options: FileProcessingOptions
  ): Promise<ProcessedFile> {
    const startTime = Date.now();
    
    // Convert File to Buffer if needed
    const buffer = file instanceof Buffer ? file : await this.fileToBuffer(file);
    const fileSize = buffer.length;

    // Validate file size
    if (fileSize > (options.maxFileSize || DEFAULT_MAX_FILE_SIZE)) {
      return {
        id: this.generateFileId(),
        fileName,
        mimeType,
        fileSize,
        error: `File size exceeds limit of ${(options.maxFileSize || DEFAULT_MAX_FILE_SIZE) / 1024 / 1024}MB`
      };
    }

    try {
      switch (options.provider) {
        case 'anthropic':
          return await this.processForAnthropic(buffer, fileName, mimeType, fileSize, startTime);
        
        case 'google':
          return await this.processForGemini(buffer, fileName, mimeType, fileSize, startTime);
        
        case 'openai':
          return await this.processForOpenAI(buffer, fileName, mimeType, fileSize, startTime);
        
        default:
          throw new Error(`Unsupported provider: ${options.provider}`);
      }
    } catch (error) {
      return {
        id: this.generateFileId(),
        fileName,
        mimeType,
        fileSize,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Process file for Anthropic Claude
   * Supports native image and PDF via base64
   */
  private static async processForAnthropic(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number,
    startTime: number
  ): Promise<ProcessedFile> {
    const base64 = buffer.toString('base64');
    
    // Anthropic supports images and PDFs natively
    if (this.SUPPORTED_IMAGE_TYPES.includes(mimeType) || PDFProcessor.isPDF(mimeType)) {
      return {
        id: this.generateFileId(),
        fileName,
        mimeType,
        fileSize,
        base64,
        processingTimeMs: Date.now() - startTime
      };
    }

    // For text files, extract content
    if (this.SUPPORTED_TEXT_TYPES.includes(mimeType)) {
      const text = buffer.toString('utf-8');
      return {
        id: this.generateFileId(),
        fileName,
        mimeType,
        fileSize,
        text,
        processedContent: `[File: ${fileName}]\n\n${text}`,
        processingTimeMs: Date.now() - startTime
      };
    }

    return {
      id: this.generateFileId(),
      fileName,
      mimeType,
      fileSize,
      error: `Unsupported file type for Anthropic: ${mimeType}`,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Process file for Google Gemini
   * Supports multi-modal via base64
   */
  private static async processForGemini(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number,
    startTime: number
  ): Promise<ProcessedFile> {
    const base64 = buffer.toString('base64');
    
    // Gemini supports images and PDFs natively
    if (this.SUPPORTED_IMAGE_TYPES.includes(mimeType) || PDFProcessor.isPDF(mimeType)) {
      return {
        id: this.generateFileId(),
        fileName,
        mimeType,
        fileSize,
        base64,
        processingTimeMs: Date.now() - startTime
      };
    }

    // For text files, provide both base64 and extracted text
    if (this.SUPPORTED_TEXT_TYPES.includes(mimeType)) {
      const text = buffer.toString('utf-8');
      return {
        id: this.generateFileId(),
        fileName,
        mimeType,
        fileSize,
        base64,
        text,
        processedContent: `[File: ${fileName}]\n\n${text}`,
        processingTimeMs: Date.now() - startTime
      };
    }

    return {
      id: this.generateFileId(),
      fileName,
      mimeType,
      fileSize,
      error: `Unsupported file type for Gemini: ${mimeType}`,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Process file for OpenAI
   * Images via base64, PDFs via text extraction
   */
  private static async processForOpenAI(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number,
    startTime: number
  ): Promise<ProcessedFile> {
    // OpenAI supports images natively
    if (this.SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      const base64 = buffer.toString('base64');
      return {
        id: this.generateFileId(),
        fileName,
        mimeType,
        fileSize,
        base64,
        processingTimeMs: Date.now() - startTime
      };
    }

    // For PDFs, extract text
    if (PDFProcessor.isPDF(mimeType)) {
      const pdfResult = await PDFProcessor.extractText(buffer);
      const processedContent = PDFProcessor.formatForAI(fileName, pdfResult);
      
      return {
        id: this.generateFileId(),
        fileName,
        mimeType,
        fileSize,
        text: pdfResult.text,
        processedContent,
        processingTimeMs: Date.now() - startTime,
        error: pdfResult.error
      };
    }

    // For text files, extract content
    if (this.SUPPORTED_TEXT_TYPES.includes(mimeType)) {
      const text = buffer.toString('utf-8');
      return {
        id: this.generateFileId(),
        fileName,
        mimeType,
        fileSize,
        text,
        processedContent: `[File: ${fileName}]\n\n${text}`,
        processingTimeMs: Date.now() - startTime
      };
    }

    return {
      id: this.generateFileId(),
      fileName,
      mimeType,
      fileSize,
      error: `Unsupported file type for OpenAI: ${mimeType}`,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Convert File to Buffer
   */
  private static async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generate unique file ID
   */
  private static generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate if file type is supported by provider
   */
  static isFileTypeSupported(mimeType: string, provider: string): boolean {
    const allSupportedTypes = [
      ...this.SUPPORTED_IMAGE_TYPES,
      ...this.SUPPORTED_TEXT_TYPES,
      'application/pdf'
    ];

    if (!allSupportedTypes.includes(mimeType)) {
      return false;
    }

    // OpenAI doesn't support PDFs natively (we extract text)
    // But we still accept them for processing
    return true;
  }

  /**
   * Get human-readable file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension from name
   */
  static getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }
}