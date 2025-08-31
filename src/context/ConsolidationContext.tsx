import React, { createContext, ReactNode, useContext, useState } from 'react';

export type ConsolidationRequest = {
  fromLocation: string;
  toLocation: string;
  productType: string;
  weight: string;
  requestType: 'instant' | 'booking';
  date: string;
  isBulk?: boolean;
  bulkQuantity?: string;
  isPriority: boolean;
  isRecurring: boolean;
  recurringFreq: string;
  recurringTimeframe: string;
  recurringDuration: string;
  recurringEndDate?: string | null;
  customRecurrence?: string;
  insureGoods: boolean;
  insuranceValue: string;
  isPerishable: boolean;
  perishableSpecs: string[];
  isSpecialCargo: boolean;
  specialCargoSpecs: string[];
  urgency: 'low' | 'medium' | 'high';
  additional?: string;
  type: string; // 'agriTRUK' | 'cargoTRUK'
  id?: string; // unique id for each request
};

interface ConsolidationContextType {
  consolidations: ConsolidationRequest[];
  addConsolidation: (request: ConsolidationRequest) => void;
  removeConsolidation: (id: string) => void;
  clearConsolidations: () => void;
  updateConsolidation: (id: string, updates: Partial<ConsolidationRequest>) => void;
}

const ConsolidationContext = createContext<ConsolidationContextType | undefined>(undefined);

export const useConsolidations = () => {
  const context = useContext(ConsolidationContext);
  if (!context) {
    throw new Error('useConsolidations must be used within a ConsolidationProvider');
  }
  return context;
};

interface ConsolidationProviderProps {
  children: ReactNode;
}

export const ConsolidationProvider: React.FC<ConsolidationProviderProps> = ({ children }) => {
  const [consolidations, setConsolidations] = useState<ConsolidationRequest[]>([]);

  const addConsolidation = (request: ConsolidationRequest) => {
    setConsolidations(prev => [...prev, request]);
  };

  const removeConsolidation = (id: string) => {
    setConsolidations(prev => prev.filter(req => req.id !== id));
  };

  const clearConsolidations = () => {
    setConsolidations([]);
  };

  const updateConsolidation = (id: string, updates: Partial<ConsolidationRequest>) => {
    setConsolidations(prev =>
      prev.map(req => req.id === id ? { ...req, ...updates } : req)
    );
  };

  return (
    <ConsolidationContext.Provider value={{
      consolidations,
      addConsolidation,
      removeConsolidation,
      clearConsolidations,
      updateConsolidation,
    }}>
      {children}
    </ConsolidationContext.Provider>
  );
};
