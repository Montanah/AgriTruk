import { Alert } from 'react-native';

export interface NetworkError {
  type: 'network' | 'timeout' | 'server' | 'unknown';
  message: string;
  retryable: boolean;
}

export const handleNetworkError = (error: any): NetworkError => {
  console.error('Network error details:', error);

  // Check for specific error types
  if (error.name === 'TypeError' && error.message?.includes('Network request failed')) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection and try again.',
      retryable: true,
    };
  }

  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Request timed out. Please try again.',
      retryable: true,
    };
  }

  if (error.status >= 500) {
    return {
      type: 'server',
      message: 'Server error. Please try again later.',
      retryable: true,
    };
  }

  if (error.status >= 400 && error.status < 500) {
    return {
      type: 'server',
      message: error.message || 'Request failed. Please check your input and try again.',
      retryable: false,
    };
  }

  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred. Please try again.',
    retryable: true,
  };
};

export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Simple connectivity check
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return true;
  } catch (error) {
    console.error('Network connectivity check failed:', error);
    return false;
  }
};

export const showNetworkErrorAlert = (error: NetworkError, onRetry?: () => void) => {
  const buttons = [
    {
      text: 'OK',
      style: 'default' as const,
    },
  ];

  if (error.retryable && onRetry) {
    buttons.unshift({
      text: 'Retry',
      style: 'default' as const,
      onPress: onRetry,
    });
  }

  Alert.alert(
    'Connection Error',
    error.message,
    buttons
  );
};





