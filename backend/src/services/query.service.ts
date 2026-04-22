import { prisma } from '../config/database';
import { QueryResult } from '../types';
import { chatService, RetrievedContext } from './chat.service';

/**
 * Extended query result that includes RAG metadata
 */
export interface QueryResultWithSources extends QueryResult {
  sources?: RetrievedContext[];
  model?: string;
  tokensUsed?: number;
}

/**
 * Query Service - handles document Q&A business logic
 * Now integrated with the RAG pipeline for AI-powered answers
 */
export class QueryService {
  /**
   * Create a new query for a document and generate an AI answer via RAG
   */
  async createQuery(
    question: string,
    documentId: string,
    userId: string
  ): Promise<QueryResultWithSources> {
    // 1. Create the query record with "processing" status
    const query = await prisma.query.create({
      data: {
        question,
        documentId,
        userId,
        status: 'processing',
      },
    });

    try {
      // 2. Run the RAG pipeline: embed → search → generate
      const chatResponse = await chatService.answerQuestion(
        question,
        userId,
        documentId
      );

      // 3. Save the AI answer back to the database
      const updatedQuery = await prisma.query.update({
        where: { id: query.id },
        data: {
          answer: chatResponse.answer,
          status: 'completed',
        },
      });

      return {
        id: updatedQuery.id,
        question: updatedQuery.question,
        answer: updatedQuery.answer,
        status: updatedQuery.status,
        documentId: updatedQuery.documentId,
        createdAt: updatedQuery.createdAt,
        sources: chatResponse.sources,
        model: chatResponse.model,
        tokensUsed: chatResponse.tokensUsed,
      };
    } catch (error: any) {
      // Mark query as failed and re-throw
      console.error('❌ RAG pipeline failed:', error.message);
      await prisma.query.update({
        where: { id: query.id },
        data: {
          answer: `Error: ${error.message}`,
          status: 'error',
        },
      });

      return {
        id: query.id,
        question: query.question,
        answer: `Error generating answer: ${error.message}`,
        status: 'error',
        documentId: query.documentId,
        createdAt: query.createdAt,
      };
    }
  }

  /**
   * Get all queries for a document
   */
  async getQueriesByDocument(documentId: string): Promise<QueryResult[]> {
    const queries = await prisma.query.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    return queries.map((q) => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      status: q.status,
      documentId: q.documentId,
      createdAt: q.createdAt,
    }));
  }

  /**
   * Get a single query by ID
   */
  async getQueryById(queryId: string): Promise<QueryResult | null> {
    const query = await prisma.query.findUnique({
      where: { id: queryId },
    });

    if (!query) return null;

    return {
      id: query.id,
      question: query.question,
      answer: query.answer,
      status: query.status,
      documentId: query.documentId,
      createdAt: query.createdAt,
    };
  }

  /**
   * Update a query with an answer
   */
  async updateQueryAnswer(queryId: string, answer: string) {
    return prisma.query.update({
      where: { id: queryId },
      data: {
        answer,
        status: 'completed',
      },
    });
  }
}

export const queryService = new QueryService();
