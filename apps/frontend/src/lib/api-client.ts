/**
 * Enhanced API client with internationalization support
 * Wraps the existing axios instance to handle API responses consistently
 */

import type { AxiosError, AxiosResponse } from 'axios';
import type { ApiResponse, ApiErrorResponse } from 'src/hooks/useApiError';

import axiosInstance from 'src/lib/axios';

/**
 * Enhanced API response that includes proper typing
 */
export interface EnhancedApiResponse<T = any> extends AxiosResponse {
  data: ApiResponse<T>;
}

/**
 * API client class that wraps axios with i18n-aware error handling
 */
export class ApiClient {
  /**
   * GET request with enhanced error handling
   */
  static async get<T = any>(url: string, config?: any): Promise<EnhancedApiResponse<T>> {
    try {
      const response = await axiosInstance.get(url, config);
      return response as EnhancedApiResponse<T>;
    } catch (error) {
      throw ApiClient.handleAxiosError(error as AxiosError);
    }
  }

  /**
   * POST request with enhanced error handling
   */
  static async post<T = any>(
    url: string,
    data?: any,
    config?: any
  ): Promise<EnhancedApiResponse<T>> {
    try {
      const response = await axiosInstance.post(url, data, config);
      return response as EnhancedApiResponse<T>;
    } catch (error) {
      throw ApiClient.handleAxiosError(error as AxiosError);
    }
  }

  /**
   * PUT request with enhanced error handling
   */
  static async put<T = any>(
    url: string,
    data?: any,
    config?: any
  ): Promise<EnhancedApiResponse<T>> {
    try {
      const response = await axiosInstance.put(url, data, config);
      return response as EnhancedApiResponse<T>;
    } catch (error) {
      throw ApiClient.handleAxiosError(error as AxiosError);
    }
  }

  /**
   * DELETE request with enhanced error handling
   */
  static async delete<T = any>(url: string, config?: any): Promise<EnhancedApiResponse<T>> {
    try {
      const response = await axiosInstance.delete(url, config);
      return response as EnhancedApiResponse<T>;
    } catch (error) {
      throw ApiClient.handleAxiosError(error as AxiosError);
    }
  }

  /**
   * PATCH request with enhanced error handling
   */
  static async patch<T = any>(
    url: string,
    data?: any,
    config?: any
  ): Promise<EnhancedApiResponse<T>> {
    try {
      const response = await axiosInstance.patch(url, data, config);
      return response as EnhancedApiResponse<T>;
    } catch (error) {
      throw ApiClient.handleAxiosError(error as AxiosError);
    }
  }

  /**
   * Handle axios errors and normalize them for consistent processing
   */
  private static handleAxiosError(error: AxiosError): ApiClientError {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as ApiErrorResponse;
      return new ApiClientError(
        data.message || 'Server error occurred',
        error.response.status,
        data.messageKey,
        data.errors,
        data
      );
    } else if (error.request) {
      // Network error
      return new ApiClientError(
        'Network error. Please check your connection.',
        0,
        'server.network_error'
      );
    } else {
      // Request setup error
      return new ApiClientError(error.message || 'Request failed', 0, 'server.request_error');
    }
  }
}

/**
 * Custom error class for API client errors
 * Maintains compatibility with existing error handling while adding i18n support
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly messageKey?: string;
  public readonly errors?: any;
  public readonly response?: ApiErrorResponse;

  constructor(
    message: string,
    status: number,
    messageKey?: string,
    errors?: any,
    response?: ApiErrorResponse
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.messageKey = messageKey;
    this.errors = errors;
    this.response = response;

    // Maintain stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiClientError);
    }
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if this is a permission error
   */
  isPermissionError(): boolean {
    return this.status === 403;
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.status === 400 && this.errors;
  }

  /**
   * Check if this is a not found error
   */
  isNotFoundError(): boolean {
    return this.status === 404;
  }

  /**
   * Check if this is a server error
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Get error as ApiErrorResponse format for useApiError hook
   */
  toApiErrorResponse(): ApiErrorResponse {
    return {
      success: false,
      message: this.message,
      messageKey: this.messageKey,
      errors: this.errors,
    };
  }
}

/**
 * Helper function to check if an error is an ApiClientError
 */
export function isApiClientError(error: any): error is ApiClientError {
  return error instanceof ApiClientError;
}

/**
 * Helper function to extract API error response from various error types
 */
export function extractApiErrorResponse(error: unknown): ApiErrorResponse {
  if (isApiClientError(error)) {
    return error.toApiErrorResponse();
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.data) {
      const data = axiosError.response.data as any;
      return {
        success: false,
        message: data.message || 'An error occurred',
        messageKey: data.messageKey,
        errors: data.errors,
      };
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      message: error.message,
      messageKey: 'server.internal_error',
    };
  }

  return {
    success: false,
    message: 'An unknown error occurred',
    messageKey: 'server.internal_error',
  };
}
