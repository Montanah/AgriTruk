/**
 * Enhanced M-PESA Payment Validation & Error Handling
 *
 * This module provides comprehensive M-PESA payment validation and processing
 * for the TRUKapp subscription flow.
 *
 * Features:
 * - Kenyan phone number format validation
 * - Proper error handling and user feedback
 * - Timeout handling (30-second timeout)
 * - Retry mechanism
 * - Loading state management
 */

// ============================================================================
// M-PESA STK PUSH INTEGRATION
// ============================================================================

import { API_ENDPOINTS } from "../constants/api";
import { getAuth } from "firebase/auth";

/**
 * Get authentication token
 */
async function getAuthToken(): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  return await user.getIdToken();
}

/**
 * Initiate M-PESA STK Push
 * Triggers M-PESA prompt on user's phone
 */
export async function initiateMpesaSTKPush(
  phoneNumber: string,
  amount: number,
  accountReference: string,
  description?: string,
): Promise<{
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  error?: string;
  code?: string;
}> {
  try {
    // Validate phone number first
    const validation = validateMpesaPhoneNumber(phoneNumber);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        code: "INVALID_PHONE",
      };
    }

    const token = await getAuthToken();
    const response = await fetch(`${API_ENDPOINTS.PAYMENTS}/mpesa/stk-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: validation.formatted,
        amount,
        accountReference,
        description: description || `Payment for ${accountReference}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success || data.ResponseCode === "0") {
      return {
        success: true,
        checkoutRequestId: data.CheckoutRequestID || data.checkoutRequestId,
        merchantRequestId: data.MerchantRequestID || data.merchantRequestId,
      };
    }

    return {
      success: false,
      error: data.message || data.ResponseDescription || "STK Push failed",
      code: data.ResponseCode || data.code || "STK_PUSH_FAILED",
    };
  } catch (error: any) {
    console.error("M-PESA STK Push error:", error);
    return {
      success: false,
      error: error.message || "Failed to initiate M-PESA payment",
      code: "NETWORK_ERROR",
    };
  }
}

/**
 * Poll M-PESA payment status
 * Checks if user has completed payment on their phone
 */
export async function pollMpesaPaymentStatus(
  checkoutRequestId: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000,
  onStatusChange?: (status: string, attempt: number) => void,
): Promise<{
  success: boolean;
  status?: "completed" | "failed" | "cancelled" | "timeout";
  transactionId?: string;
  error?: string;
}> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      onStatusChange?.(
        `Waiting for payment confirmation... (${attempt}/${maxAttempts})`,
        attempt,
      );

      const token = await getAuthToken();
      const response = await fetch(
        `${API_ENDPOINTS.PAYMENTS}/mpesa/status/${checkoutRequestId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();

        // Check for successful payment
        if (data.status === "completed" || data.ResultCode === "0") {
          onStatusChange?.("Payment confirmed!", attempt);
          return {
            success: true,
            status: "completed",
            transactionId: data.transactionId || data.MpesaReceiptNumber,
          };
        }

        // Check for failed payment
        if (
          data.status === "failed" ||
          (data.ResultCode && data.ResultCode !== "0")
        ) {
          return {
            success: false,
            status: "failed",
            error: data.error || data.ResultDesc || "Payment failed",
          };
        }

        // Check for cancelled payment
        if (data.status === "cancelled") {
          return {
            success: false,
            status: "cancelled",
            error: "Payment was cancelled by user",
          };
        }
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error: any) {
      console.error(`Payment status check attempt ${attempt} failed:`, error);

      // Continue polling unless it's the last attempt
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
  }

  return {
    success: false,
    status: "timeout",
    error: "Payment verification timeout. Please check your M-PESA messages.",
  };
}

// ============================================================================
// PHONE NUMBER VALIDATION
// ============================================================================

/**
 * Validates Kenyan M-PESA phone number
 *
 * Accepts formats:
 * - 07XXXXXXXX (Safaricom mobile format)
 * - 01XXXXXXXX (Safaricom landline/older format)
 * - 0722XXXXXX (with full digit)
 * - +254722XXXXXX (international format)
 * - 254722XXXXXX (international without +)
 *
 * @param phone - Phone number to validate
 * @returns {valid: boolean, formatted: string, error: string}
 */
export function validateMpesaPhoneNumber(phone: string): {
  valid: boolean;
  formatted?: string;
  error?: string;
} {
  if (!phone || !phone.trim()) {
    return {
      valid: false,
      error: "Phone number is required",
    };
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Check if it matches Kenyan phone number patterns
  const patterns = {
    kenyaLocal: /^0[17]\d{8}$/, // 07XXXXXXXX or 01XXXXXXXX
    kenyaInternational1: /^\+?254\d{9}$/, // +254722XXXXXX or 254722XXXXXX
    kenyaInternational2: /^254\d{9}$/, // 254722XXXXXX
  };

  // Validate against patterns
  if (patterns.kenyaLocal.test(cleaned)) {
    // Format: 07XXXXXXXX or 01XXXXXXXX → +254722XXXXXX or +254122XXXXXX
    const formatted = "+254" + cleaned.substring(1);
    return {
      valid: true,
      formatted,
    };
  }

  if (patterns.kenyaInternational1.test(cleaned)) {
    // Already in correct format
    const formatted = cleaned.startsWith("+") ? cleaned : "+" + cleaned;
    return {
      valid: true,
      formatted,
    };
  }

  if (patterns.kenyaInternational2.test(cleaned)) {
    // Add + prefix
    const formatted = "+" + cleaned;
    return {
      valid: true,
      formatted,
    };
  }

  // Check if it's a Safaricom, Airtel, or Telkom number
  const operatorPatterns = {
    safaricom: /^(01|07|722|723|724|725|726|727|728|729)/, // Safaricom (01 landline, 07 mobile)
    airtel: /^(070|701|702|703)/, // Airtel
    telkom: /^(070|710|711)/, // Telkom
  };

  const operatorInfo = Object.entries(operatorPatterns).find(([, pattern]) =>
    pattern.test(cleaned),
  );

  if (operatorInfo) {
    return {
      valid: false,
      error: `Invalid ${operatorInfo[0]} number format. Use 01XXXXXXXX, 07XXXXXXXX or +254XXXXXXXXX format.`,
    };
  }

  return {
    valid: false,
    error:
      "Invalid Kenyan phone number. Must be 10 digits starting with 01, 07 or +254.",
  };
}

// ============================================================================
// M-PESA PAYMENT HANDLER
// ============================================================================

/**
 * Handles M-PESA payment request with retry and timeout logic
 *
 * @param phone - Validated M-PESA phone number
 * @param amount - Amount in KES
 * @param planId - Subscription plan ID
 * @param options - Additional options
 */
export async function processMpesaPayment(
  phone: string,
  amount: number,
  planId: string,
  options?: {
    maxRetries?: number;
    timeoutMs?: number;
    onStatusChange?: (status: string) => void;
  },
): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
  code?: string;
}> {
  const maxRetries = options?.maxRetries || 3;
  const timeoutMs = options?.timeoutMs || 30000; // 30 second timeout
  const onStatusChange = options?.onStatusChange || (() => {});

  // Validate phone first
  const validation = validateMpesaPhoneNumber(phone);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      code: "INVALID_PHONE",
    };
  }

  const formattedPhone = validation.formatted!;

  // Try payment with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onStatusChange(
        `Processing payment (attempt ${attempt}/${maxRetries})...`,
      );

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Payment request timeout")),
          timeoutMs,
        ),
      );

      // Create payment promise
      const paymentPromise = fetch("/api/subscriptions/mpesa/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add auth header if available
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          amount,
          planId,
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        return response.json();
      });

      // Race between payment and timeout
      const result = await Promise.race([paymentPromise, timeoutPromise]);

      if (result.success) {
        onStatusChange("Payment processed successfully!");
        return {
          success: true,
          transactionId: result.transactionId,
        };
      }

      // Payment failed but not due to timeout
      if (attempt === maxRetries) {
        return {
          success: false,
          error: result.message || "Payment failed",
          code: result.code || "PAYMENT_FAILED",
        };
      }

      // Wait before retry (exponential backoff)
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    } catch (error: any) {
      const isTimeout = error.message === "Payment request timeout";
      const isLastAttempt = attempt === maxRetries;

      if (isTimeout) {
        onStatusChange(
          `Request timeout, retrying... (${attempt}/${maxRetries})`,
        );
      } else {
        onStatusChange(`Payment error, retrying... (${attempt}/${maxRetries})`);
      }

      if (isLastAttempt) {
        const errorMessage = isTimeout
          ? "Payment request timed out. Please check your internet connection and try again."
          : error.message || "Payment failed after multiple attempts";

        return {
          success: false,
          error: errorMessage,
          code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        };
      }

      // Wait before next retry
      const backoffMs = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  return {
    success: false,
    error: "Unexpected error processing payment",
    code: "UNKNOWN_ERROR",
  };
}

// ============================================================================
// M-PESA POLLING (Wait for STK Prompt)
// ============================================================================

/**
 * Polls for M-PESA STK prompt status
 *
 * After initiating payment, device should show M-PESA STK prompt.
 * This function waits for user to enter M-PESA PIN.
 *
 * @param transactionId - Transaction ID from initial payment request
 * @param options - Options including timeout and poll interval
 */
export async function waitForMpesaPrompt(
  transactionId: string,
  options?: {
    maxWaitMs?: number;
    pollIntervalMs?: number;
    onStatusChange?: (status: string) => void;
  },
): Promise<{
  success: boolean;
  status?: "completed" | "cancelled" | "timeout";
  error?: string;
}> {
  const maxWaitMs = options?.maxWaitMs || 60000; // 60 second max wait
  const pollIntervalMs = options?.pollIntervalMs || 2000; // Poll every 2 seconds
  const onStatusChange = options?.onStatusChange || (() => {});

  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      pollCount++;

      const response = await fetch(
        `/api/subscriptions/mpesa/status/${transactionId}`,
      );

      if (!response.ok) {
        if (pollCount === 1) {
          onStatusChange("Waiting for M-PESA prompt...");
        }

        // Still waiting
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      const data = await response.json();

      if (data.status === "completed") {
        onStatusChange("Payment confirmed!");
        return {
          success: true,
          status: "completed",
        };
      } else if (data.status === "cancelled") {
        return {
          success: false,
          status: "cancelled",
          error: "Payment was cancelled by user",
        };
      } else if (data.status === "failed") {
        return {
          success: false,
          status: "cancelled",
          error: data.error || "Payment failed",
        };
      }

      // Still processing
      onStatusChange(
        `Waiting for M-PESA prompt... (${Math.round((Date.now() - startTime) / 1000)}s)`,
      );
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    } catch (error: any) {
      console.warn("Error polling M-PESA status:", error);
      // Continue polling on error
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  return {
    success: false,
    status: "timeout",
    error:
      "M-PESA prompt not received. Please ensure USSD is not already open and try again.",
  };
}

// ============================================================================
// ERROR MESSAGE FORMATTING
// ============================================================================

/**
 * Formats M-PESA error for user-friendly display
 *
 * @param error - Error code or message
 */
export function formatMpesaError(error?: string): string {
  const errorMap: { [key: string]: string } = {
    INVALID_PHONE:
      "Please enter a valid Kenyan phone number (01XXXXXXXX, 07XXXXXXXX or +254XXXXXXXXX)",
    TIMEOUT:
      "Payment request timed out. Check your internet connection and try again.",
    NETWORK_ERROR: "Network error. Please check your connection and try again.",
    PAYMENT_FAILED:
      "Payment failed. Please try again or use a different payment method.",
    INSUFFICIENT_FUNDS: "Insufficient funds in your M-PESA account.",
    ACCOUNT_LOCKED:
      "Your M-PESA account is locked. Please contact Safaricom support.",
    INVALID_AMOUNT: "Invalid payment amount. Please try again.",
  };

  return errorMap[error || ""] || "Payment failed. Please try again later.";
}

// ============================================================================
// EXPORTS FOR USE IN REACT COMPONENTS
// ============================================================================

export const MpesaPaymentModule = {
  validatePhoneNumber: validateMpesaPhoneNumber,
  processPayment: processMpesaPayment,
  waitForPrompt: waitForMpesaPrompt,
  formatError: formatMpesaError,
  initiateSTKPush: initiateMpesaSTKPush,
  pollPaymentStatus: pollMpesaPaymentStatus,
};

export default MpesaPaymentModule;
