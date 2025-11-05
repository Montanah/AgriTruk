// Cost calculation utilities - Display helpers only
// NOTE: All cost calculations are done by the backend API (/bookings/estimate)
// Backend is the single source of truth for cost calculations
// This file only contains display/formatting helpers

export interface CostBreakdown {
  baseFare: number;
  distanceCost: number;
  weightCost: number;
  urgencySurcharge: number;
  perishableSurcharge: number;
  refrigerationSurcharge: number;
  humiditySurcharge: number;
  specialCargoSurcharge: number;
  bulknessSurcharge: number;
  insuranceFee: number;
  priorityFee: number;
  waitTimeFee: number;
  tollFee: number;
  nightSurcharge: number;
  fuelSurcharge: number;
  subtotal: number;
  total: number;
}

export interface PaymentBreakdown {
  transporterReceives: number;
  companyReceives: number;
  total: number;
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to calculate average cost from a cost range
// Used for management screens and revenue/spent calculations
export function getAverageCost(item: any): number {
  try {
    // Check for estimatedCostRange first (backend format from Mumbua's implementation)
    if (item?.estimatedCostRange) {
      const minCost = Number(item.estimatedCostRange.min || 0);
      const maxCost = Number(item.estimatedCostRange.max || 0);
      if (!isNaN(minCost) && !isNaN(maxCost)) {
        // If both min and max exist, return average
        if (minCost > 0 && maxCost > 0) {
          return Math.round((minCost + maxCost) / 2);
        }
        // If only one exists, use that
        if (minCost > 0) return minCost;
        if (maxCost > 0) return maxCost;
      }
    }
    
    // Check for costRange format
    if (item?.costRange || (item?.minCost != null && item?.maxCost != null)) {
      const minCost = Number(item.costRange?.min || item.minCost || 0);
      const maxCost = Number(item.costRange?.max || item.maxCost || 0);
      if (!isNaN(minCost) && !isNaN(maxCost)) {
        // If both min and max exist, return average
        if (minCost > 0 && maxCost > 0) {
          return Math.round((minCost + maxCost) / 2);
        }
        // If only one exists, use that
        if (minCost > 0) return minCost;
        if (maxCost > 0) return maxCost;
      }
    }
    
    // Fallback to single cost if no range available
    const cost = Number(item?.cost || item?.price || item?.estimatedCost || item?.baseEstimate || 0);
    if (!isNaN(cost) && cost > 0) {
      return cost;
    }
    return 0;
  } catch (error) {
    console.error('Error calculating average cost:', error);
    return 0;
  }
}

// Helper function to format average cost for display in management screens
export function formatAverageCost(item: any): string {
  const averageCost = getAverageCost(item);
  if (averageCost === 0) {
    return 'KES 0';
  }
  return `KES ${averageCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Helper function to format cost range (iOS-safe)
// Supports both estimatedCostRange (backend format) and costRange formats
// Backend returns: { estimatedCost, minCost, maxCost, costRange: { min, max }, estimatedCostRange: { min, max, display } }
export function formatCostRange(item: any): string {
  try {
    // Check for estimatedCostRange first (backend format from Mumbua's implementation)
    if (item?.estimatedCostRange?.display) {
      return item.estimatedCostRange.display;
    }
    
    // Check for estimatedCostRange with min/max
    if (item?.estimatedCostRange && (item.estimatedCostRange.min != null || item.estimatedCostRange.max != null)) {
      const minCost = Number(item.estimatedCostRange.min || 0);
      const maxCost = Number(item.estimatedCostRange.max || 0);
      if (!isNaN(minCost) && !isNaN(maxCost)) {
        return `KES ${minCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - ${maxCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      }
    }
    
    // Check for costRange format
    if (item?.costRange || (item?.minCost != null && item?.maxCost != null)) {
      const minCost = Number(item.costRange?.min || item.minCost || 0);
      const maxCost = Number(item.costRange?.max || item.maxCost || 0);
      if (!isNaN(minCost) && !isNaN(maxCost)) {
        return `KES ${minCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - ${maxCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      }
    }
    
    // Fallback to single cost if no range available
    const cost = Number(item?.cost || item?.price || item?.estimatedCost || item?.baseEstimate || 0);
    if (!isNaN(cost)) {
      return `KES ${cost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return 'KES 0';
  } catch (error) {
    console.error('Error formatting cost range:', error);
    return 'KES 0';
  }
}

// Helper function to get cost breakdown description
export function getCostBreakdownDescription(breakdown: CostBreakdown): string[] {
  const descriptions: string[] = [];
  
  if (breakdown.baseFare > 0) {
    descriptions.push(`Base fare: ${formatCurrency(breakdown.baseFare)}`);
  }
  
  if (breakdown.distanceCost > 0) {
    descriptions.push(`Distance cost: ${formatCurrency(breakdown.distanceCost)}`);
  }
  
  if (breakdown.weightCost > 0) {
    descriptions.push(`Weight cost: ${formatCurrency(breakdown.weightCost)}`);
  }
  
  if (breakdown.urgencySurcharge > 0) {
    descriptions.push(`Urgency surcharge: ${formatCurrency(breakdown.urgencySurcharge)}`);
  }
  
  if (breakdown.perishableSurcharge > 0) {
    descriptions.push(`Perishable surcharge: ${formatCurrency(breakdown.perishableSurcharge)}`);
  }
  
  if (breakdown.refrigerationSurcharge > 0) {
    descriptions.push(`Refrigeration surcharge: ${formatCurrency(breakdown.refrigerationSurcharge)}`);
  }
  
  if (breakdown.humiditySurcharge > 0) {
    descriptions.push(`Humidity control surcharge: ${formatCurrency(breakdown.humiditySurcharge)}`);
  }
  
  if (breakdown.specialCargoSurcharge > 0) {
    descriptions.push(`Special cargo surcharge: ${formatCurrency(breakdown.specialCargoSurcharge)}`);
  }
  
  if (breakdown.bulknessSurcharge > 0) {
    descriptions.push(`Bulkness surcharge: ${formatCurrency(breakdown.bulknessSurcharge)}`);
  }
  
  if (breakdown.priorityFee > 0) {
    descriptions.push(`Priority handling: ${formatCurrency(breakdown.priorityFee)}`);
  }
  
  if (breakdown.waitTimeFee > 0) {
    descriptions.push(`Wait time fee: ${formatCurrency(breakdown.waitTimeFee)}`);
  }
  
  if (breakdown.tollFee > 0) {
    descriptions.push(`Toll fees: ${formatCurrency(breakdown.tollFee)}`);
  }
  
  if (breakdown.nightSurcharge > 0) {
    descriptions.push(`Night surcharge: ${formatCurrency(breakdown.nightSurcharge)}`);
  }
  
  if (breakdown.fuelSurcharge > 0) {
    descriptions.push(`Fuel surcharge: ${formatCurrency(breakdown.fuelSurcharge)}`);
  }
  
  if (breakdown.insuranceFee > 0) {
    descriptions.push(`Insurance fee: ${formatCurrency(breakdown.insuranceFee)} (paid to company)`);
  }
  
  return descriptions;
}
