import { config } from '../config';

/**
 * Represents a single text chunk with metadata
 */
export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

/**
 * Chunking Service - splits raw text into overlapping chunks
 * for embedding and semantic search
 *
 * Strategy: Sentence-aware chunking with overlap
 *   - Tries to break at sentence boundaries (. ! ? \n)
 *   - Each chunk overlaps with the previous one for context continuity
 */
export class ChunkingService {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor() {
    this.chunkSize = config.chunking.chunkSize;
    this.chunkOverlap = config.chunking.chunkOverlap;
  }

  /**
   * Split text into overlapping chunks
   */
  splitIntoChunks(text: string): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Clean whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();

    if (cleanText.length <= this.chunkSize) {
      return [{
        text: cleanText,
        index: 0,
        startChar: 0,
        endChar: cleanText.length,
      }];
    }

    const chunks: TextChunk[] = [];
    let startPos = 0;
    let chunkIndex = 0;

    while (startPos < cleanText.length) {
      // Calculate end position
      let endPos = Math.min(startPos + this.chunkSize, cleanText.length);

      // If not at the end, try to break at a sentence boundary
      if (endPos < cleanText.length) {
        const searchWindow = cleanText.substring(
          Math.max(endPos - 100, startPos),
          endPos
        );

        // Look for sentence-ending punctuation from the end of the window
        const sentenceBreaks = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
        let bestBreak = -1;

        for (const breakChar of sentenceBreaks) {
          const pos = searchWindow.lastIndexOf(breakChar);
          if (pos > bestBreak) {
            bestBreak = pos;
          }
        }

        if (bestBreak > 0) {
          // Found a sentence break; adjust endPos
          endPos = Math.max(endPos - 100, startPos) + bestBreak + 2;
        }
      }

      const chunkText = cleanText.substring(startPos, endPos).trim();

      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          index: chunkIndex,
          startChar: startPos,
          endChar: endPos,
        });
        chunkIndex++;
      }

      // Move start position forward (with overlap)
      startPos = endPos - this.chunkOverlap;

      // Prevent infinite loop if overlap >= chunkSize
      if (startPos <= chunks[chunks.length - 1]?.startChar) {
        startPos = endPos;
      }
    }

    console.log(`✂️ Text chunked: ${cleanText.length} chars → ${chunks.length} chunks (size=${this.chunkSize}, overlap=${this.chunkOverlap})`);
    return chunks;
  }
}

export const chunkingService = new ChunkingService();
