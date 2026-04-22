/**
 * Shared type definitions for the API
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DocumentUploadResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
}

export interface QueryResult {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  documentId: string;
  createdAt: Date;
}
