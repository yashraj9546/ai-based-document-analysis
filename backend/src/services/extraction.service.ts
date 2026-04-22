import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extraction Service - extracts raw text from uploaded documents
 * Supports: PDF, TXT, MD, CSV, DOC, DOCX
 */
export class ExtractionService {
  /**
   * Extract text from a file based on its MIME type
   */
  async extractText(filePath: string, mimeType: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    switch (mimeType) {
      case 'application/pdf':
        return this.extractFromPdf(filePath);

      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractFromDocx(filePath);

      case 'text/plain':
      case 'text/markdown':
      case 'text/csv':
        return this.extractFromText(filePath);

      default:
        throw new Error(`Unsupported file type for extraction: ${mimeType}`);
    }
  }

  /**
   * Extract text from PDF using pdf-parse v2
   */
  private async extractFromPdf(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(buffer);
    const parser = new PDFParse(uint8Array);
    const data = await parser.getText();

    // Combine all page texts
    let text = data.pages.map(p => p.text).join('\n\n');

    // Clean up extracted text
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.trim();

    console.log(`📄 PDF extracted: ${text.length} characters, ${data.pages.length} pages`);
    return text;
  }

  /**
   * Extract text from DOCX using mammoth
   */
  private async extractFromDocx(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value.trim();
    console.log(`📘 DOCX extracted: ${text.length} characters`);

    if (result.messages.length > 0) {
      console.warn('⚠️ DOCX warnings:', result.messages.map(m => m.message).join(', '));
    }

    return text;
  }

  /**
   * Extract text from plain text files (TXT, MD, CSV)
   */
  private async extractFromText(filePath: string): Promise<string> {
    const text = fs.readFileSync(filePath, 'utf-8').trim();
    const ext = path.extname(filePath).slice(1).toUpperCase() || 'TXT';
    console.log(`📝 ${ext} extracted: ${text.length} characters`);
    return text;
  }
}

export const extractionService = new ExtractionService();
