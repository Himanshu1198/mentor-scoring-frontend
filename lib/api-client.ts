import { API_CONFIG } from '@/config/api';

interface RequestOptions extends RequestInit {
  timeout?: number;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    console.log(`🔗 API Client initialized with: ${this.baseURL}`);
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const timeout = options.timeout || API_CONFIG.timeout;

    console.log(`📡 ${options.method || 'GET'} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...API_CONFIG.headers,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ API Error on ${endpoint}:`, errorData);
        throw new Error(
          errorData.error || `API Error: ${response.status} ${response.statusText}`
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      console.error(`❌ API Error on ${endpoint}:`, error);
      throw error;
    }
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  postForm<T>(endpoint: string, formData: FormData, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type for FormData - browser will set it automatically
        ...Object.fromEntries(
          Object.entries(API_CONFIG.headers).filter(([key]) => key !== 'Content-Type')
        ),
        ...options?.headers,
      },
    });
  }
}

export const apiClient = new ApiClient();
