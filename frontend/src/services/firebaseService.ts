import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, enableNetwork, disableNetwork } from 'firebase/firestore';
import { errorService } from './errorService';

class FirebaseService {
  private isConnected = false;
  private connectionRetries = 0;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.initializeConnection();
  }

  /**
   * Initialize Firebase connection with retry logic
   */
  private async initializeConnection() {
    try {
      await enableNetwork(db);
      this.isConnected = true;
      this.connectionRetries = 0;
      // Firebase connected successfully
    } catch (error) {
      console.warn('⚠️ Firebase connection failed:', error);
      this.isConnected = false;
      this.retryConnection();
    }
  }

  /**
   * Retry connection with exponential backoff
   */
  private async retryConnection() {
    if (this.connectionRetries >= this.maxRetries) {
      console.error('❌ Max Firebase connection retries reached');
      return;
    }

    this.connectionRetries++;
    const delay = this.retryDelay * Math.pow(2, this.connectionRetries - 1);
    
    // Retrying Firebase connection
    
    setTimeout(async () => {
      try {
        await enableNetwork(db);
        this.isConnected = true;
        this.connectionRetries = 0;
        // Firebase reconnected successfully
      } catch (error) {
        console.warn('⚠️ Firebase reconnection failed:', error);
        this.retryConnection();
      }
    }, delay);
  }

  /**
   * Check if Firebase is connected
   */
  isFirebaseConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get document with error handling
   */
  async getDocument(collectionName: string, docId: string) {
    try {
      if (!this.isConnected) {
        throw new Error('Firebase not connected');
      }

      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting document:', error);
      errorService.logError(error, {
        screen: 'FirebaseService',
        action: 'get_document',
        details: { collectionName, docId }
      });
      throw error;
    }
  }

  /**
   * Set document with error handling
   */
  async setDocument(collectionName: string, docId: string, data: any) {
    try {
      if (!this.isConnected) {
        throw new Error('Firebase not connected');
      }

      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, data, { merge: true });
      return true;
    } catch (error) {
      console.error('Error setting document:', error);
      errorService.logError(error, {
        screen: 'FirebaseService',
        action: 'set_document',
        details: { collectionName, docId }
      });
      throw error;
    }
  }

  /**
   * Update document with error handling
   */
  async updateDocument(collectionName: string, docId: string, data: any) {
    try {
      if (!this.isConnected) {
        throw new Error('Firebase not connected');
      }

      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, data);
      return true;
    } catch (error) {
      console.error('Error updating document:', error);
      errorService.logError(error, {
        screen: 'FirebaseService',
        action: 'update_document',
        details: { collectionName, docId }
      });
      throw error;
    }
  }

  /**
   * Delete document with error handling
   */
  async deleteDocument(collectionName: string, docId: string) {
    try {
      if (!this.isConnected) {
        throw new Error('Firebase not connected');
      }

      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      errorService.logError(error, {
        screen: 'FirebaseService',
        action: 'delete_document',
        details: { collectionName, docId }
      });
      throw error;
    }
  }

  /**
   * Query collection with error handling
   */
  async queryCollection(collectionName: string, whereClause?: { field: string; operator: any; value: any }) {
    try {
      if (!this.isConnected) {
        throw new Error('Firebase not connected');
      }

      const collectionRef = collection(db, collectionName);
      let q = collectionRef;

      if (whereClause) {
        q = query(collectionRef, where(whereClause.field, whereClause.operator, whereClause.value));
      }

      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });

      return results;
    } catch (error) {
      console.error('Error querying collection:', error);
      errorService.logError(error, {
        screen: 'FirebaseService',
        action: 'query_collection',
        details: { collectionName, whereClause }
      });
      throw error;
    }
  }

  /**
   * Listen to document changes with error handling
   */
  listenToDocument(collectionName: string, docId: string, callback: (data: any) => void) {
    try {
      if (!this.isConnected) {
        console.warn('Firebase not connected, cannot listen to document');
        return () => {};
      }

      const docRef = doc(db, collectionName, docId);
      return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Error listening to document:', error);
        errorService.logError(error, {
          screen: 'FirebaseService',
          action: 'listen_to_document',
          details: { collectionName, docId }
        });
      });
    } catch (error) {
      console.error('Error setting up document listener:', error);
      errorService.logError(error, {
        screen: 'FirebaseService',
        action: 'setup_document_listener',
        details: { collectionName, docId }
      });
      return () => {};
    }
  }

  /**
   * Force reconnect to Firebase
   */
  async forceReconnect() {
    try {
      // Force reconnecting to Firebase
      await disableNetwork(db);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      await enableNetwork(db);
      this.isConnected = true;
      this.connectionRetries = 0;
      // Firebase force reconnected successfully
    } catch (error) {
      console.error('❌ Firebase force reconnect failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      retries: this.connectionRetries,
      maxRetries: this.maxRetries
    };
  }
}

export const firebaseService = new FirebaseService();
