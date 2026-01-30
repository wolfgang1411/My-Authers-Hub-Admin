import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions } from 'sweetalert2';

export interface LogErrorOptions {
  title?: string;
  icon?: 'error' | 'warning' | 'info';
  showConfirmButton?: boolean;
  confirmButtonText?: string;
  customClass?: SweetAlertOptions['customClass'];
}

@Injectable({
  providedIn: 'root',
})
export class Logger {
  /**
   * Logs and displays an error to the user
   * @param error - The error object (HttpErrorResponse, Error, string, or any)
   * @param options - Optional configuration for the error dialog
   */
  logError(error: any, options?: LogErrorOptions): void {
    // Skip showing Swal if error was already handled by interceptor (e.g., 401 logout)
    if (error && (error as any).__handledByInterceptor) {
      return;
    }

    const errorInfo = this.parseError(error);

    Swal.fire({
      icon: options?.icon || 'error',
      title: options?.title || errorInfo.title || 'Error',
      html: errorInfo.message,
      showConfirmButton: options?.showConfirmButton ?? true,
      confirmButtonText: options?.confirmButtonText || 'OK',
      customClass: options?.customClass,
    });
  }

  /**
   * Parses various error formats and returns a structured error info
   * Handles: NestJS errors, Angular HttpErrorResponse, Validation errors, Prisma errors, Network errors
   */
  parseError(error: any): { message: string; title?: string } {
    // Angular HttpErrorResponse (from backend NestJS)
    if (error instanceof HttpErrorResponse) {
      return this.parseHttpErrorResponse(error);
    }

    // Standard JS Error
    if (error instanceof Error) {
      return {
        message: error.message || 'An unexpected error occurred',
        title: 'Error',
      };
    }

    // Plain string
    if (typeof error === 'string') {
      return {
        message: error,
        title: 'Error',
      };
    }

    // Generic object
    if (typeof error === 'object' && error !== null) {
      // Check if it has a message property
      if (error.message) {
        const message = Array.isArray(error.message)
          ? error.message.join('<br>')
          : error.message;
        return {
          message: message,
          title: error.title || 'Error',
        };
      }
      return {
        message: JSON.stringify(error),
        title: 'Error',
      };
    }

    // Fallback
    return {
      message: 'An unknown error occurred',
      title: 'Error',
    };
  }

  /**
   * Parses Angular HttpErrorResponse from NestJS backend
   * Handles all NestJS error formats including validation errors
   */
  private parseHttpErrorResponse(error: HttpErrorResponse): {
    message: string;
    title?: string;
  } {
    const status = error.status;
    const err = error.error;

    // Network errors (no response from server)
    if (!error.error && error.status === 0) {
      return {
        message: this.getNetworkErrorMessage(error),
        title: 'Network Error',
      };
    }

    // Handle different error response formats
    if (!err) {
      return {
        message: error.message || this.getStatusMessage(status),
        title: this.getStatusTitle(status),
      };
    }

    // Case 1: Plain string response
    if (typeof err === 'string') {
      return {
        message: err,
        title: this.getStatusTitle(status),
      };
    }

    // Case 2: NestJS error format with error_description (from AppExceptionsFilter)
    if (err.error_description) {
      return {
        message: this.formatMessage(err.error_description),
        title: this.getStatusTitle(status),
      };
    }

    // Case 3: Error with message property (can be string or array for validation errors)
    if (err.message) {
      const message = Array.isArray(err.message)
        ? this.formatValidationErrors(err.message)
        : this.formatMessage(err.message);
      return {
        message: message,
        title: this.getStatusTitle(status),
      };
    }

    // Case 4: Error with error property (NestJS standard format)
    if (err.error) {
      const errorMessage =
        err.error_description ||
        (typeof err.error === 'string' ? err.error : JSON.stringify(err.error));
      return {
        message: this.formatMessage(errorMessage),
        title: this.getStatusTitle(status),
      };
    }

    // Case 5: Check for validation errors (class-validator format)
    if (Array.isArray(err) && err.length > 0) {
      return {
        message: this.formatValidationErrors(err),
        title: 'Validation Error',
      };
    }

    // Case 6: Prisma errors or other structured errors
    if (err.statusCode && err.message) {
      const message = Array.isArray(err.message)
        ? this.formatValidationErrors(err.message)
        : this.formatMessage(err.message);
      return {
        message: message,
        title: this.getStatusTitle(err.statusCode),
      };
    }

    // Fallback: Try to extract any meaningful information
    const fallbackMessage = this.extractFallbackMessage(err, status);
    return {
      message: fallbackMessage,
      title: this.getStatusTitle(status),
    };
  }

  /**
   * Formats validation error messages (from class-validator)
   */
  private formatValidationErrors(messages: string[]): string {
    if (!Array.isArray(messages) || messages.length === 0) {
      return 'Validation failed';
    }

    // Format as HTML list for better readability
    if (messages.length === 1) {
      return this.escapeHtml(messages[0]);
    }

    return messages
      .map((msg, index) => `${index + 1}. ${this.escapeHtml(msg)}`)
      .join('<br>');
  }

  /**
   * Formats a single message, handling HTML escaping
   */
  private formatMessage(message: string | unknown): string {
    if (typeof message !== 'string') {
      return String(message);
    }
    return this.escapeHtml(message);
  }

  /**
   * Escapes HTML to prevent XSS while allowing <br> tags for line breaks
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    let escaped = div.innerHTML;
    // Allow <br> tags for line breaks
    escaped = escaped.replace(/&lt;br&gt;/gi, '<br>');
    escaped = escaped.replace(/&lt;br\/&gt;/gi, '<br>');
    return escaped;
  }

  /**
   * Gets user-friendly title based on HTTP status code
   */
  private getStatusTitle(status: number): string {
    const titles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Validation Error',
      429: 'Too Many Requests',
      500: 'Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    return titles[status] || 'Error';
  }

  /**
   * Gets user-friendly message based on HTTP status code
   */
  private getStatusMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'The request was invalid. Please check your input and try again.',
      401: 'You are not authorized to perform this action. Please log in.',
      403: 'You do not have permission to access this resource.',
      404: 'The requested resource was not found.',
      409: 'A conflict occurred. The resource may have been modified.',
      422: 'The request was well-formed but contains validation errors.',
      429: 'Too many requests. Please try again later.',
      500: 'An internal server error occurred. Please try again later.',
      502: 'The server received an invalid response. Please try again later.',
      503: 'The service is temporarily unavailable. Please try again later.',
      504: 'The request timed out. Please try again.',
    };
    return messages[status] || 'An error occurred. Please try again.';
  }

  /**
   * Gets network error message based on error details
   */
  private getNetworkErrorMessage(error: HttpErrorResponse): string {
    if (error.message?.includes('timeout')) {
      return 'The request timed out. Please check your internet connection and try again.';
    }
    if (error.message?.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.message?.includes('NetworkError')) {
      return 'A network error occurred. Please check your internet connection.';
    }
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  /**
   * Extracts fallback message from error object
   */
  private extractFallbackMessage(err: any, status: number): string {
    // Try to find any string property
    for (const key of [
      'message',
      'error',
      'error_description',
      'detail',
      'title',
    ]) {
      if (err[key] && typeof err[key] === 'string') {
        return this.formatMessage(err[key]);
      }
    }

    // If it's an object with nested properties, try to stringify intelligently
    if (typeof err === 'object') {
      try {
        const stringified = JSON.stringify(err, null, 2);
        // If the stringified version is too long, truncate it
        if (stringified.length > 500) {
          return `${stringified.substring(0, 500)}...`;
        }
        return stringified;
      } catch {
        return this.getStatusMessage(status);
      }
    }

    return this.getStatusMessage(status);
  }
}
