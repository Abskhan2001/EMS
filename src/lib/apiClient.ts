// API Client to replace Supabase
import { authService } from '../services/authService';
import { databaseService } from '../services/databaseService';

// Create a unified client that mimics Supabase structure
export const apiClient = {
  auth: authService,
  from: databaseService.from.bind(databaseService),
  rpc: databaseService.rpc.bind(databaseService),
};

// Export for backward compatibility
export const supabase = apiClient;

// Connection status checker
export async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1'}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// Enhanced error handling to match Supabase error format
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    // Network errors
    if (error.message === 'Failed to fetch') {
      return 'Connection error. Please check your internet connection and try again.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('abort')) {
      return 'Request was cancelled. Please try again.';
    }

    // Auth errors
    if (error.message.includes('auth')) {
      return 'Authentication error. Please sign in again.';
    }

    // Database errors
    if (error.message.includes('duplicate key')) {
      return 'This record already exists.';
    }
    if (error.message.includes('foreign key')) {
      return 'Invalid reference to another record.';
    }

    // Return the original error message if none of the above
    return error.message;
  }

  // Handle API-specific error objects
  if (typeof error === 'object' && error !== null) {
    const apiError = error as {
      message?: string;
      details?: string;
      hint?: string;
    };
    return (
      apiError.message ||
      apiError.details ||
      apiError.hint ||
      'An unexpected error occurred'
    );
  }

  return 'An unexpected error occurred';
};

// Enhanced retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if it's not a network error
      if (
        error instanceof Error &&
        !error.message.includes('Failed to fetch') &&
        !error.message.includes('timeout') &&
        !error.message.includes('network')
      ) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, i);

      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 200;

      // Wait before retrying, but don't wait on the last attempt
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
}

export default apiClient;