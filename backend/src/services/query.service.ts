import { prisma } from '../config/database';
import { QueryResult } from '../types';

/**
 * Query Service - handles document Q&A business logic
 */
export class QueryService {
  /**
   * Create a new query for a document
   */
  async createQuery(
    question: string,
    documentId: string,
    userId: string
  ): Promise<QueryResult> {
    const query = await prisma.query.create({
      data: {
        question,
        documentId,
        userId,
        status: 'pending',
      },
    });

    // TODO: In the next step, we'll integrate an AI service here
    // to process the question against the document content
    // For now, we'll return a placeholder

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
