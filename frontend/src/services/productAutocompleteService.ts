import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProductOption {
  name: string;
  count: number;
  lastUsed: number;
}

class ProductAutocompleteService {
  private readonly STORAGE_KEY = 'product_autocomplete_options';
  private readonly MAX_OPTIONS = 20;
  private readonly MAX_AGE_DAYS = 90; // Remove options older than 90 days

  /**
   * Add a new product to the autocomplete options
   */
  async addProduct(productName: string): Promise<void> {
    try {
      if (!productName || productName.trim().length === 0) return;

      const normalizedName = productName.trim().toLowerCase();
      const options = await this.getStoredOptions();
      
      // Find existing option
      const existingIndex = options.findIndex(opt => opt.name === normalizedName);
      
      if (existingIndex >= 0) {
        // Update existing option
        options[existingIndex].count += 1;
        options[existingIndex].lastUsed = Date.now();
      } else {
        // Add new option
        options.push({
          name: normalizedName,
          count: 1,
          lastUsed: Date.now()
        });
      }

      // Sort by count (most used first) and then by last used
      options.sort((a, b) => {
        if (a.count !== b.count) {
          return b.count - a.count; // Higher count first
        }
        return b.lastUsed - a.lastUsed; // More recent first
      });

      // Keep only top options
      const topOptions = options.slice(0, this.MAX_OPTIONS);
      
      // Clean up old options
      const cutoffTime = Date.now() - (this.MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
      const cleanedOptions = topOptions.filter(opt => opt.lastUsed > cutoffTime);

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedOptions));
    } catch (error) {
      console.error('Error adding product to autocomplete:', error);
    }
  }

  /**
   * Get autocomplete suggestions based on input
   */
  async getSuggestions(input: string): Promise<string[]> {
    try {
      if (!input || input.trim().length === 0) {
        return await this.getMostUsedOptions();
      }

      const normalizedInput = input.trim().toLowerCase();
      const options = await this.getStoredOptions();
      
      // Filter options that match the input
      const matches = options.filter(opt => 
        opt.name.includes(normalizedInput)
      );

      // Sort by relevance (exact matches first, then by count, then by recency)
      matches.sort((a, b) => {
        const aExact = a.name.startsWith(normalizedInput);
        const bExact = b.name.startsWith(normalizedInput);
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        if (a.count !== b.count) {
          return b.count - a.count;
        }
        
        return b.lastUsed - a.lastUsed;
      });

      return matches.slice(0, 8).map(opt => this.capitalizeFirstLetter(opt.name));
    } catch (error) {
      console.error('Error getting product suggestions:', error);
      return [];
    }
  }

  /**
   * Get the most used options (for when input is empty)
   */
  async getMostUsedOptions(): Promise<string[]> {
    try {
      const options = await this.getStoredOptions();
      return options.slice(0, 8).map(opt => this.capitalizeFirstLetter(opt.name));
    } catch (error) {
      console.error('Error getting most used options:', error);
      return [];
    }
  }

  /**
   * Clear all stored options
   */
  async clearOptions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing product options:', error);
    }
  }

  /**
   * Get stored options from AsyncStorage
   */
  private async getStoredOptions(): Promise<ProductOption[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting stored options:', error);
      return [];
    }
  }

  /**
   * Capitalize first letter of each word
   */
  private capitalizeFirstLetter(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Export singleton instance
export const productAutocompleteService = new ProductAutocompleteService();
