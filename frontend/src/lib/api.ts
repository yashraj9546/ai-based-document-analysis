const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Core API client with automatic token refresh
 */
class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Attempt to refresh the access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.success && data.data) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Make an authenticated API request with automatic token refresh
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const accessToken = this.getAccessToken();

    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    if (accessToken) {
      requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

    if (body && !(body instanceof FormData)) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body) {
      requestInit.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, requestInit);

    // If 401, try refreshing the token
    if (response.status === 401 && accessToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        requestHeaders['Authorization'] = `Bearer ${this.getAccessToken()}`;
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...requestInit,
          headers: requestHeaders,
        });
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  }
}

export const apiClient = new ApiClient();

// ──────────────────────────────────────────────────
//  Auth API
// ──────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  };
  message: string;
}

export const authApi = {
  register: async (email: string, password: string, name?: string) => {
    const data = await apiClient.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });

    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    return data;
  },

  login: async (email: string, password: string) => {
    const data = await apiClient.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    return data;
  },

  getProfile: async () => {
    return apiClient.request<{ success: boolean; data: AuthUser }>('/auth/me');
  },

  logout: () => {
    apiClient.clearTokens();
  },
};

// ──────────────────────────────────────────────────
//  Document API
// ──────────────────────────────────────────────────
export interface DocumentData {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListResponse {
  success: boolean;
  data: DocumentData[];
}

export interface DocumentUploadResponse {
  success: boolean;
  data: DocumentData;
  message: string;
}

export const documentApi = {
  /**
   * Upload a document with progress tracking via XHR
   */
  upload: (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<DocumentUploadResponse> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('document', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/documents/upload`);

      // Set auth header
      const token = localStorage.getItem('accessToken');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Upload failed'));
          }
        } catch {
          reject(new Error('Failed to parse server response'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  },

  /**
   * Get all documents for the current user
   */
  getAll: async (): Promise<DocumentListResponse> => {
    return apiClient.request<DocumentListResponse>('/documents');
  },

  /**
   * Get a single document by ID
   */
  getById: async (id: string) => {
    return apiClient.request<{ success: boolean; data: DocumentData }>(`/documents/${id}`);
  },

  /**
   * Delete a document
   */
  delete: async (id: string) => {
    return apiClient.request<{ success: boolean; message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  },
};
