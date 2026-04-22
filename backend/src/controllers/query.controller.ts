import { Request, Response, NextFunction } from 'express';
import { queryService } from '../services/query.service';
import { documentService } from '../services/document.service';
import { ApiError } from '../middleware/errorHandler';

/**
 * Query Controller - handles HTTP request/response for Q&A operations
 */
export class QueryController {
  /**
   * POST /api/documents/:documentId/queries
   * Ask a question about a document
   */
  async askQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;
      const { question } = req.body;
      const userId = req.user!.userId;

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        throw new ApiError(400, 'Question is required');
      }

      // Verify document exists
      const document = await documentService.getDocumentById(documentId);
      if (!document) {
        throw new ApiError(404, 'Document not found');
      }

      const result = await queryService.createQuery(question.trim(), documentId, userId);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Query submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documents/:documentId/queries
   * Get all queries for a document
   */
  async getQueries(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;
      const queries = await queryService.getQueriesByDocument(documentId);

      res.json({
        success: true,
        data: queries,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/queries/:id
   * Get a single query by ID
   */
  async getQuery(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const query = await queryService.getQueryById(id);

      if (!query) {
        throw new ApiError(404, 'Query not found');
      }

      res.json({
        success: true,
        data: query,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const queryController = new QueryController();
