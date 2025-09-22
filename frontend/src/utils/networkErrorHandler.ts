// Network error handling utility
export interface NetworkError {
  type: 'network' | 'timeout' | 'server' | 'auth' | 'unknown';
  message: string;
  userMessage: string;
  retryable: boolean;
}

export const handleNetworkError = (error: any): NetworkError => {
  console.error('Network error details:', error);

  // Check for specific error types
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: error.message || 'Request timeout',
      userMessage: 'Request timed out. Please check your internet connection and try again.',
      retryable: true,
    };
  }

  if (
    error.message?.includes('Network request failed') ||
    error.message?.includes('fetch') ||
    error.message?.includes('TypeError: Network request failed') ||
    error.message?.includes('Unable to connect to server')
  ) {
    return {
      type: 'network',
      message: error.message || 'Network request failed',
      userMessage: 'Network error. Please check your internet connection and try again.',
      retryable: true,
    };
  }

  if (error.message?.includes('Authentication failed') || error.message?.includes('401')) {
    return {
      type: 'auth',
      message: error.message || 'Authentication failed',
      userMessage: 'Authentication failed. Please log in again.',
      retryable: false,
    };
  }

  if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
    return {
      type: 'server',
      message: error.message || 'Server error',
      userMessage: 'Server error. Please try again later.',
      retryable: true,
    };
  }

  // Default unknown error
  return {
    type: 'unknown',
    message: error.message || 'Unknown error',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true,
  };
};

export const isRetryableError = (error: any): boolean => {
  const networkError = handleNetworkError(error);
  return networkError.retryable;
};

export const getUserFriendlyMessage = (error: any): string => {
  const networkError = handleNetworkError(error);
  return networkError.userMessage;
};

// Retry logic with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Network status checker
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
    });
    return true;
  } catch (error) {
    console.warn('Network check failed:', error);
    return false;
  }
};

// API endpoint health check
export const checkApiHealth = async (baseUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
};

