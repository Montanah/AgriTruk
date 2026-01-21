import { Alert } from 'react-native';

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
  timestamp: string;
}

export interface ErrorContext {
  screen: string;
  action: string;
  userId?: string;
  additionalData?: any;
}

class ErrorService {
  private errorLog: ApiError[] = [];
  private maxLogSize = 100;

  /**
   * Log an error with context
   */
  logError(error: Error, context: ErrorContext): void {
    const apiError: ApiError = {
      code: this.extractErrorCode(error),
      message: error.message,
      status: this.extractStatusCode(error),
      details: error.stack,
      timestamp: new Date().toISOString(),
    };

    // Add to log
    this.errorLog.unshift(apiError);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console logging for debugging
    console.error('🚨 ERROR LOGGED:', {
      context,
      error: apiError,
    });

    // TODO: Send to external error tracking service (e.g., Sentry, Bugsnag)
    // this.sendToErrorTracking(apiError, context);
  }

  /**
   * Handle API errors with user-friendly messages
   */
  handleApiError(error: any, context: ErrorContext): string {
    this.logError(error, context);

    // Network errors
    if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
      return 'Network error: Please check your internet connection and try again.';
    }

    // Authentication errors
    if (error.message?.includes('Authentication failed') || error.message?.includes('401')) {
      return 'Session expired. Please log in again.';
    }

    // Permission errors
    if (error.message?.includes('Access denied') || error.message?.includes('403')) {
      return 'You don\'t have permission to perform this action.';
    }

    // Not found errors
    if (error.message?.includes('Resource not found') || error.message?.includes('404')) {
      return 'The requested resource was not found.';
    }

    // Server errors
    if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
      return 'Server error: Please try again later or contact support.';
    }

    // Validation errors
    if (error.message?.includes('validation') || error.message?.includes('400')) {
      return 'Invalid data provided. Please check your input and try again.';
    }

    // Rate limiting
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    // Default error message
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Show error alert to user
   */
  showErrorAlert(error: any, context: ErrorContext, onRetry?: () => void): void {
    const message = this.handleApiError(error, context);
    
    const buttons = [
      { text: 'OK', style: 'default' as const }
    ];

    if (onRetry) {
      buttons.unshift({ text: 'Retry', style: 'default' as const, onPress: onRetry });
    }

    Alert.alert('Error', message, buttons);
  }

  /**
   * Handle transporter-specific errors
   */
  handleTransporterError(error: any, action: string): string {
    const context: ErrorContext = {
      screen: 'TransporterScreen',
      action,
    };

    if (action.includes('profile')) {
      if (error.message?.includes('not found')) {
        return 'Transporter profile not found. Please complete your profile setup.';
      }
      if (error.message?.includes('validation')) {
        return 'Profile information is invalid. Please check your details and try again.';
      }
    }

    if (action.includes('vehicle')) {
      if (error.message?.includes('not found')) {
        return 'Vehicle information not found. Please add your vehicle details.';
      }
      if (error.message?.includes('validation')) {
        return 'Vehicle information is invalid. Please check your vehicle details.';
      }
    }

    if (action.includes('driver')) {
      if (error.message?.includes('not found')) {
        return 'Driver information not found. Please add driver details.';
      }
      if (error.message?.includes('validation')) {
        return 'Driver information is invalid. Please check driver details.';
      }
    }

    return this.handleApiError(error, context);
  }

  /**
   * Handle booking-specific errors
   */
  handleBookingError(error: any, action: string): string {
    const context: ErrorContext = {
      screen: 'BookingScreen',
      action,
    };

    if (action.includes('create')) {
      if (error.message?.includes('validation')) {
        return 'Booking details are invalid. Please check all fields and try again.';
      }
      if (error.message?.includes('capacity')) {
        return 'No transporters available with sufficient capacity for this booking.';
      }
    }

    if (action.includes('assign')) {
      if (error.message?.includes('unavailable')) {
        return 'Selected transporter is no longer available. Please choose another.';
      }
      if (error.message?.includes('capacity')) {
        return 'Selected transporter does not have sufficient capacity.';
      }
    }

    return this.handleApiError(error, context);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { total: number; recent: number; byCode: Record<string, number> } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recent = this.errorLog.filter(
      error => new Date(error.timestamp) > oneHourAgo
    ).length;

    const byCode = this.errorLog.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errorLog.length,
      recent,
      byCode,
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  private extractErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.status) return `HTTP_${error.status}`;
    if (error.name) return error.name;
    return 'UNKNOWN_ERROR';
  }

  private extractStatusCode(error: any): number {
    if (error.status) return error.status;
    if (error.response?.status) return error.response.status;
    return 0;
  }
}

export const errorService = new ErrorService();
export default errorService;
