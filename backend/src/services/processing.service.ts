import { extractionService } from './extraction.service';
import { chunkingService } from './chunking.service';
import { embeddingService } from './embedding.service';
import { pineconeService } from './pinecone.service';
import { documentService } from './document.service';

/**
 * Processing Service - orchestrates the full RAG ingestion pipeline:
 *   1. Extract text from the uploaded file
 *   2. Split text into overlapping chunks
 *   3. Generate embeddings via OpenAI
 *   4. Store vectors in Pinecone
 *   5. Update document status in DB
 *
 * Runs asynchronously after upload so the user isn't blocked.
 */
export class ProcessingService {
  /**
   * Process a newly uploaded document through the full RAG pipeline
   */
  async processDocument(
    documentId: string,
    filePath: string,
    mimeType: string,
    originalName: string,
    userId: string
  ): Promise<void> {
    console.log(`\n🔄 Processing document: "${originalName}" (${documentId})`);
    const startTime = Date.now();

    try {
      // ── Step 1: Mark as processing ─────────────────
      await documentService.updateDocumentStatus(documentId, 'processing');

      // ── Step 2: Extract text ───────────────────────
      console.log('📖 Step 1/4: Extracting text...');
      const rawText = await extractionService.extractText(filePath, mimeType);

      if (!rawText || rawText.trim().length === 0) {
        throw new Error('No text could be extracted from the document');
      }

      // Save extracted text to DB
      await documentService.updateDocumentStatus(documentId, 'processing', rawText);

      // ── Step 3: Chunk text ─────────────────────────
      console.log('✂️ Step 2/4: Chunking text...');
      const chunks = chunkingService.splitIntoChunks(rawText);

      if (chunks.length === 0) {
        throw new Error('Document produced zero chunks after splitting');
      }

      // ── Step 4: Generate embeddings ────────────────
      console.log('🧠 Step 3/4: Generating embeddings...');
      const chunkTexts = chunks.map(c => c.text);
      const embeddings = await embeddingService.embedBatch(chunkTexts);

      // ── Step 5: Store in Pinecone ──────────────────
      console.log('📌 Step 4/4: Storing in Pinecone...');
      await pineconeService.upsertDocumentChunks(
        documentId,
        userId,
        originalName,
        chunks,
        embeddings
      );

      // ── Done: Mark as ready ────────────────────────
      await documentService.updateDocumentStatus(documentId, 'ready');

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Document processed successfully in ${elapsed}s: "${originalName}" → ${chunks.length} chunks\n`);

    } catch (error: any) {
      console.error(`❌ Processing failed for "${originalName}":`, error.message);

      // Mark document as error
      await documentService.updateDocumentStatus(documentId, 'error');
    }
  }

  /**
   * Cleanup: delete vectors when a document is deleted
   */
  async cleanupDocument(documentId: string): Promise<void> {
    try {
      await pineconeService.deleteDocumentVectors(documentId);
    } catch (error: any) {
      console.error(`⚠️ Failed to cleanup vectors for ${documentId}:`, error.message);
    }
  }
}

export const processingService = new ProcessingService();
