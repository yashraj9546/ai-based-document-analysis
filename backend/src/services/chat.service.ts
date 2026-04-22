import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { embeddingService } from './embedding.service';
import { pineconeService } from './pinecone.service';

/**
 * Represents a single retrieved context chunk with its relevance score
 */
export interface RetrievedContext {
  text: string;
  score: number;
  documentId: string;
  chunkIndex: number;
  originalName: string;
}

/**
 * Full chat response returned to the controller
 */
export interface ChatResponse {
  answer: string;
  sources: RetrievedContext[];
  model: string;
  tokensUsed?: number;
}

/**
 * Chat Service - orchestrates the full RAG pipeline:
 *   1. Embed the user query
 *   2. Query Pinecone for the most relevant document chunks
 *   3. Build a grounded prompt with retrieved context
 *   4. Send to Gemini generative model for a natural-language answer
 */
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    if (!config.gemini.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not set — chat will fail');
    }
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.modelName = config.gemini.generativeModel.startsWith('models/') 
      ? config.gemini.generativeModel 
      : `models/${config.gemini.generativeModel}`;
  }

  /**
   * Answer a user question using RAG over their uploaded documents
   *
   * @param question  - The user's natural language question
   * @param userId    - Authenticated user ID (for Pinecone filtering)
   * @param documentId - Optional: restrict retrieval to a single document
   * @param topK      - Number of chunks to retrieve (default 5)
   */
  async answerQuestion(
    question: string,
    userId: string,
    documentId?: string,
    topK: number = 5
  ): Promise<ChatResponse> {
    console.log(`\n💬 RAG query: "${question.substring(0, 80)}..."`);

    // ── Step 1: Embed the user query ──────────────────────────
    const queryEmbedding = await embeddingService.embedText(question);

    // ── Step 2: Retrieve relevant chunks from Pinecone ───────
    const relevantChunks = await pineconeService.queryRelevantChunks(
      queryEmbedding,
      userId,
      documentId,
      topK
    );

    if (relevantChunks.length === 0) {
      return {
        answer: 'I could not find relevant information in your documents.',
        sources: [],
        model: this.modelName,
      };
    }

    // ── Step 3: Build context-aware prompt ────────────────────
    const contextBlock = this.buildContextBlock(relevantChunks);
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(question, contextBlock);

    // ── Step 4: Generate answer with Gemini ──────────────────
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userPrompt);
    const response = result.response;
    let answer = response.text().trim();

    // Double check for hallucination or "I don't know" variants
    if (!answer || answer.toLowerCase().includes("don't have information") || answer.toLowerCase().includes("not mentioned in the context")) {
       answer = 'I could not find relevant information in your documents.';
    }

    const tokensUsed = response.usageMetadata?.totalTokenCount;

    return {
      answer,
      sources: relevantChunks,
      model: this.modelName,
      tokensUsed,
    };
  }

  /**
   * Build the system instruction based on strict prompt engineering requirements
   */
  private buildSystemPrompt(): string {
    return `You are a highly precise Document Analysis AI assistant. Your sole purpose is to answer questions based strictly on the provided document excerpts.

### STRICTRULES:
1. USE ONLY the "DOCUMENT CONTEXT" provided below to formulate your answer.
2. DO NOT use external knowledge, general information, or your own training data to supplement the response.
3. If the answer is not explicitly contained within the "DOCUMENT CONTEXT", you must respond with exactly: "I could not find relevant information in your documents."
4. Be concise, objective, and deterministic. Avoid introductory phrases like "Based on the context" or "According to the document".`;
  }

  /**
   * Format retrieved chunks into a structured context block
   */
  private buildContextBlock(chunks: RetrievedContext[]): string {
    return chunks
      .map((chunk, i) => `[Document: ${chunk.originalName}]\n${chunk.text}`)
      .join('\n\n');
  }

  /**
   * Build the user-facing prompt following the engineered template
   */
  private buildUserPrompt(question: string, contextBlock: string): string {
    return `### DOCUMENT CONTEXT:
${contextBlock}

### USER QUESTION:
${question}

Answer:`;
  }
}

export const chatService = new ChatService();
