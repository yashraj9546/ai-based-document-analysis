import { prisma } from '../config/database';
import { DocumentUploadResult } from '../types';

/**
 * Document Service - handles all document-related business logic
 */
export class DocumentService {
  /**
   * Create a new document record after file upload
   */
  async createDocument(
    file: Express.Multer.File,
    userId: string
  ): Promise<DocumentUploadResult> {
    const document = await prisma.document.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        status: 'uploaded',
        userId,
      },
    });

    return {
      id: document.id,
      filename: document.filename,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      status: document.status,
    };
  }

  /**
   * Get all documents for a user
   */
  async getDocumentsByUser(userId: string) {
    return prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(documentId: string) {
    return prisma.document.findUnique({
      where: { id: documentId },
      include: {
        queries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(documentId: string, status: string, content?: string) {
    return prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        ...(content !== undefined && { content }),
      },
    });
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string) {
    return prisma.document.delete({
      where: { id: documentId },
    });
  }
}

export const documentService = new DocumentService();
