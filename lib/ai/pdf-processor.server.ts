// Server-only PDF processing - this file should only be imported in server-side code
import 'server-only';

export interface PDFProcessingResult {
  text: string;
  pageCount: number;
  processingTimeMs: number;
  truncated: boolean;
  error?: string;
}

const MAX_TEXT_LENGTH = 100000; // ~25k tokens for most models
const MAX_PROCESSING_TIME_MS = 30000; // 30 second timeout

export class PDFProcessor {
  /**
   * Extract text from a PDF buffer (server-side only)
   */
  static async extractText(buffer: Buffer): Promise<PDFProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Dynamically import pdf-parse to ensure it's only loaded server-side
      const pdf = await import('pdf-parse');
      
      // Set up timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('PDF processing timeout exceeded'));
        }, MAX_PROCESSING_TIME_MS);
      });

      // Race between PDF parsing and timeout
      const data = await Promise.race([
        pdf.default(buffer, {
          max: 0, // Parse all pages
          version: 'v2.0.550'
        }),
        timeoutPromise
      ]) as any;

      let text = data.text || '';
      let truncated = false;

      // Truncate if text is too long
      if (text.length > MAX_TEXT_LENGTH) {
        text = text.substring(0, MAX_TEXT_LENGTH);
        truncated = true;
      }

      // Clean up text: remove excessive whitespace and control characters
      text = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim();

      const processingTimeMs = Date.now() - startTime;

      return {
        text,
        pageCount: data.numpages || 0,
        processingTimeMs,
        truncated
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      
      // Return partial result with error
      return {
        text: '',
        pageCount: 0,
        processingTimeMs,
        truncated: false,
        error: error instanceof Error ? error.message : 'Unknown PDF processing error'
      };
    }
  }

  /**
   * Create a summary header for PDF content
   */
  static createPDFHeader(fileName: string, pageCount: number, truncated: boolean): string {
    let header = `[PDF Document: ${fileName}]\n`;
    header += `[Pages: ${pageCount}]\n`;
    if (truncated) {
      header += '[Note: Content truncated due to length]\n';
    }
    header += '\n---\n\n';
    return header;
  }

  /**
   * Format PDF content for AI model consumption
   */
  static formatForAI(
    fileName: string,
    result: PDFProcessingResult
  ): string {
    if (result.error) {
      return `[PDF Document: ${fileName}]\n[Error: ${result.error}]\n[Unable to extract text content]`;
    }

    if (!result.text || result.text.trim().length === 0) {
      return `[PDF Document: ${fileName}]\n[No text content found in PDF]`;
    }

    const header = this.createPDFHeader(fileName, result.pageCount, result.truncated);
    return header + result.text;
  }

  /**
   * Check if a file is a PDF based on MIME type
   */
  static isPDF(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  static estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to approximate token limit
   */
  static truncateToTokenLimit(text: string, maxTokens: number = 25000): string {
    const estimatedMaxChars = maxTokens * 4;
    if (text.length <= estimatedMaxChars) {
      return text;
    }
    
    // Truncate and add ellipsis
    return text.substring(0, estimatedMaxChars - 100) + '\n\n[... content truncated ...]';
  }
}