import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

/**
 * Embedding Service - generates vector embeddings using Google Gemini
 * Uses embedding-001 or text-embedding-004 which has 768 dimensions.
 */
export class EmbeddingService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    if (!config.gemini.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not set — embeddings will fail');
    }
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    // Ensure the model name has the 'models/' prefix which is sometimes required by the SDK for batching
    this.modelName = config.gemini.embeddingModel.startsWith('models/') 
      ? config.gemini.embeddingModel 
      : `models/${config.gemini.embeddingModel}`;
  }

  /**
   * Generate embedding for a single text string
   */
  async embedText(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const result = await model.embedContent(text);
    return Array.from(result.embedding.values);
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    
    const BATCH_SIZE = 50; // Smaller batch size for better reliability
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      
      try {
        const result = await model.batchEmbedContents({
          requests: batch.map((t) => ({ content: { role: 'user', parts: [{ text: t }] } })),
        });

        allEmbeddings.push(...result.embeddings.map(e => Array.from(e.values)));
        console.log(`🧠 (Gemini) Embedded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}`);
      } catch (error: any) {
        console.error('❌ Gemini Batch Embedding Error:', error.message);
        // Fallback: embed one by one if batch fails
        console.log('🔄 Falling back to individual embedding for this batch...');
        for (const text of batch) {
          const emb = await this.embedText(text);
          allEmbeddings.push(emb);
        }
      }
    }

    return allEmbeddings;
  }
}

export const embeddingService = new EmbeddingService();
