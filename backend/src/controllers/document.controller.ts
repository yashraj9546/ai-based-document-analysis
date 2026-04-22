import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/document.service';
import { ApiError } from '../middleware/errorHandler';
import fs from 'fs';

/**
 * Document Controller - handles HTTP request/response for document operations
 */
export class DocumentController {
  /**
   * POST /api/documents/upload
   * Upload a new document
   */
  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No file uploaded');
      }

      const userId = req.user!.userId;

      const result = await documentService.createDocument(req.file, userId);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Document uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documents
   * Get all documents for a user
   */
  async getDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const documents = await documentService.getDocumentsByUser(userId);

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documents/:id
   * Get a single document with its queries
   */
  async getDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const document = await documentService.getDocumentById(id);

      if (!document) {
        throw new ApiError(404, 'Document not found');
      }

      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/documents/:id
   * Delete a document and its file
   */
  async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const document = await documentService.getDocumentById(id);

      if (!document) {
        throw new ApiError(404, 'Document not found');
      }

      // Delete the physical file
      if (fs.existsSync(document.path)) {
        fs.unlinkSync(document.path);
      }

      await documentService.deleteDocument(id);

      res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();
