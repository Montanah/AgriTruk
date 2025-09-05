import { API_ENDPOINTS } from '../constants/api';

export interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'commission' | 'fee';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  reference?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionResponse {
  success: boolean;
  message: string;
  data?: Transaction | Transaction[];
}

class TransactionService {
  private async getAuthToken(): Promise<string> {
    const { getAuth } = await import('firebase/auth');
    const { auth } = await import('../firebaseConfig');
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  /**
   * Get all transactions
   */
  async getTransactions(): Promise<TransactionResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(API_ENDPOINTS.TRANSACTIONS, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get transactions');
      }

      return { success: true, message: 'Transactions retrieved successfully', data };
    } catch (error) {
      console.error('Error getting transactions:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get a specific transaction by ID
   */
  async getTransaction(transactionId: string): Promise<TransactionResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_ENDPOINTS.TRANSACTIONS}/${transactionId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get transaction');
      }

      return { success: true, message: 'Transaction retrieved successfully', data };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new TransactionService();
