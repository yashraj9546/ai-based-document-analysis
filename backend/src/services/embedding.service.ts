import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

/**
 * Embedding Service - generates vector embeddings.
 * Primary: Local Python server (FastEmbed / ONNX)
 * Secondary: Google Gemini (Fallback)
 */
export class EmbeddingService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;
  private localUrl: string;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.modelName = config.gemini.embeddingModel.startsWith('models/') 
      ? config.gemini.embeddingModel 
      : `models/${config.gemini.embeddingModel}`;
    this.localUrl = config.gemini.embeddingServerUrl;
  }

  /**
   * Generate embedding for a single text string
   */
  async embedText(text: string): Promise<number[]> {
    try {
      // Try local server first
      const response = await fetch(`${this.localUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const dim = data.embedding.length;
        console.log(`🧠 (Local) Generated embedding with dimension: ${dim}`);
        return data.embedding;
      }
      
      console.warn('⚠️ Local embedding server returned error, falling back to Gemini');
    } catch (error) {
      console.warn('⚠️ Local embedding server unreachable, falling back to Gemini');
    }

    // Fallback to Gemini
    const modelId = "gemini-embedding-001";
    console.log(`🧠 (Gemini) Requesting embedding from: models/${modelId}`);
    try {
      const model = this.genAI.getGenerativeModel({ model: modelId });
      
      // Use TaskType.RETRIEVAL_QUERY for better query embeddings
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY' as any,
      });
      
      let embedding = Array.from(result.embedding.values);
      
      // Force dimension to 768 (Pinecone index requirement)
      if (embedding.length !== 768) {
        console.warn(`⚠️ Gemini returned ${embedding.length} dims, adjusting to 768`);
        if (embedding.length > 768) {
          embedding = embedding.slice(0, 768);
        } else {
          // Pad with zeros if somehow smaller
          while (embedding.length < 768) embedding.push(0);
        }
      }
      
      console.log(`🧠 (Gemini) Final vector dimension: ${embedding.length}`);
      return embedding;
    } catch (error: any) {
      console.error('❌ Gemini embedding failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    try {
      // Try local server batch endpoint
      const response = await fetch(`${this.localUrl}/embed-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts }),
      });

      if (response.ok) {
        const data: any = await response.json();
        console.log(`🧠 (Local) Embedded batch of ${texts.length} texts`);
        return data.embeddings;
      }

      console.warn('⚠️ Local embedding server batch failed, falling back to Gemini');
    } catch (error) {
      console.warn('⚠️ Local embedding server unreachable for batch, falling back to Gemini');
    }

    // Fallback to Gemini (one by one or batch)
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const BATCH_SIZE = 50;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      try {
        const result = await model.batchEmbedContents({
          requests: batch.map((t) => ({ 
            content: { role: 'user', parts: [{ text: t }] },
            model: "models/gemini-embedding-001",
            taskType: 'RETRIEVAL_DOCUMENT' as any,
          })),
        });
        
        const embeddings = result.embeddings.map(e => {
          let values = Array.from(e.values);
          if (values.length > 768) values = values.slice(0, 768);
          if (values.length < 768) {
             while (values.length < 768) values.push(0);
          }
          return values;
        });
        
        allEmbeddings.push(...embeddings);
        console.log(`🧠 (Gemini Fallback) Embedded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} (Dim: ${embeddings[0]?.length})`);
      } catch (error: any) {
        // Individual fallback
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
