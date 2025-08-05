import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ConsolidationRequest = {
  fromLocation: string;
  toLocation: string;
  productType: string;
  weight: string;
  requestType: 'instant' | 'booking';
  date: string;
  isBulk: boolean;
  isPriority: boolean;
  isRecurring: boolean;
  recurringFreq: string;
  insureGoods: boolean;
  insuranceValue: string;
  isPerishable: boolean;
  perishableSpecs: string[];
  isSpecialCargo: boolean;
  specialCargoSpecs: string[];
  type: string; // 'agriTRUK' | 'cargoTRUK'
  id?: string; // unique id for each request
};

interface ConsolidationContextType {
  consolidations: ConsolidationRequest[];
  addConsolidation: (req: ConsolidationRequest) => void;
  removeConsolidation: (id: string) => void;
  clearConsolidations: () => void;
}

const ConsolidationContext = createContext<ConsolidationContextType | undefined>(undefined);

export const useConsolidations = () => {
  const ctx = useContext(ConsolidationContext);
  if (!ctx) throw new Error('useConsolidations must be used within ConsolidationProvider');
  return ctx;
};

export const ConsolidationProvider = ({ children }: { children: ReactNode }) => {
  const [consolidations, setConsolidations] = useState<ConsolidationRequest[]>([]);

  const addConsolidation = (req: ConsolidationRequest) => {
    // Assign a unique id if not present
    const id = req.id || `CON-${Date.now()}-${Math.floor(Math.random()*10000)}`;
    setConsolidations(prev => [...prev, { ...req, id }]);
  };

  const removeConsolidation = (id: string) => {
    setConsolidations(prev => prev.filter(item => item.id !== id));
  };

  const clearConsolidations = () => setConsolidations([]);

  return (
    <ConsolidationContext.Provider value={{ consolidations, addConsolidation, removeConsolidation, clearConsolidations }}>
      {children}
    </ConsolidationContext.Provider>
  );
};
