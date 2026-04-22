import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone';
import { config } from '../config';

/**
 * Metadata stored alongside each vector in Pinecone
 */
export interface VectorMetadata extends RecordMetadata {
  documentId: string;
  userId: string;
  chunkIndex: number;
  chunkText: string;
  originalName: string;
}

/**
 * Pinecone Service - manages vector storage and semantic search
 * Compatible with @pinecone-database/pinecone v7.x
 */
export class PineconeService {
  private client: Pinecone;
  private indexName: string;
  private _index: Index<VectorMetadata> | null = null;

  constructor() {
    if (!config.pinecone.apiKey) {
      console.warn('⚠️ PINECONE_API_KEY not set — vector operations will fail');
    }
    this.client = new Pinecone({ apiKey: config.pinecone.apiKey });
    this.indexName = config.pinecone.indexName;
  }

  /**
   * Get or initialize the Pinecone index
   */
  private getIndex(): Index<VectorMetadata> {
    if (!this._index) {
      this._index = this.client.index<VectorMetadata>(this.indexName);
    }
    return this._index;
  }

  /**
   * Upsert chunk embeddings for a document
   * Each vector ID is formatted as: {documentId}#chunk-{index}
   */
  async upsertDocumentChunks(
    documentId: string,
    userId: string,
    originalName: string,
    chunks: { text: string; index: number }[],
    embeddings: number[][]
  ): Promise<void> {
    const index = this.getIndex();

    // Build vector records
    const records = chunks.map((chunk, i) => ({
      id: `${documentId}#chunk-${chunk.index}`,
      values: embeddings[i],
      metadata: {
        documentId,
        userId,
        chunkIndex: chunk.index,
        chunkText: chunk.text.substring(0, 1000), // Pinecone metadata limit ~40KB; truncate long chunks
        originalName,
      } as VectorMetadata,
    }));

    // Pinecone v7 upsert expects { records: [...] }
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await index.upsert({ records: batch });
      console.log(`📌 Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} (${batch.length} vectors)`);
    }

    console.log(`✅ Stored ${records.length} vectors for document "${originalName}"`);
  }

  /**
   * Query Pinecone for the most relevant chunks
   * Filters by userId to ensure data isolation
   */
  async queryRelevantChunks(
    queryEmbedding: number[],
    userId: string,
    documentId?: string,
    topK: number = 5
  ): Promise<{ text: string; score: number; documentId: string; chunkIndex: number; originalName: string }[]> {
    const index = this.getIndex();

    // Build filter: always filter by userId, optionally by documentId
    const filter: Record<string, string> = { userId };
    if (documentId) {
      filter.documentId = documentId;
    }

    const results = await index.query({
      vector: queryEmbedding,
      topK,
      filter,
      includeMetadata: true,
    });

    return (results.matches || []).map((match) => {
      const meta = match.metadata as VectorMetadata;
      return {
        text: meta.chunkText,
        score: match.score || 0,
        documentId: meta.documentId,
        chunkIndex: meta.chunkIndex,
        originalName: meta.originalName,
      };
    });
  }

  /**
   * Delete all vectors belonging to a specific document
   * Uses metadata filter (supported on serverless indexes)
   */
  async deleteDocumentVectors(documentId: string): Promise<void> {
    const index = this.getIndex();

    try {
      // Pinecone v7 deleteMany with filter
      await index.deleteMany({
        filter: { documentId: { $eq: documentId } } as unknown as object,
      });

      console.log(`🗑️ Deleted vectors for document ${documentId}`);
    } catch (error) {
      // Fallback: delete by known IDs
      console.warn(`⚠️ Filter delete failed, trying ID-based delete for ${documentId}`);
      const idsToDelete: string[] = [];
      for (let i = 0; i < 500; i++) {
        idsToDelete.push(`${documentId}#chunk-${i}`);
      }
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const batch = idsToDelete.slice(i, i + 100);
        await index.deleteMany({ ids: batch });
      }
      console.log(`🗑️ Deleted vectors by ID for document ${documentId}`);
    }
  }
}

export const pineconeService = new PineconeService();
