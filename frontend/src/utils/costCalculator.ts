interface BookingData {
  actualDistance: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  urgencyLevel: 'Low' | 'Medium' | 'High';
  perishable: boolean;
  needsRefrigeration: boolean;
  humidityControl: boolean;
  specialCargo: string[];
  bulkness: boolean;
  insured: boolean;
  value: number;
  tolls: number;
  priority: boolean;
  fuelSurchargePct: number;
  waitMinutes: number;
  nightSurcharge: boolean;
  vehicleType: 'truck' | 'van' | 'pickup' | 'motorcycle';
}

interface CostBreakdown {
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

interface PaymentBreakdown {
  transporterReceives: number;
  companyReceives: number;
  total: number;
}

interface CostResult {
  cost: number;
  transporterPayment: number;
  costBreakdown: CostBreakdown;
  paymentBreakdown: PaymentBreakdown;
}

export function calculateTransportCost(bookingData: BookingData): CostResult {
  const {
    actualDistance = 0,
    weightKg = 0,
    lengthCm = 0,
    widthCm = 0,
    heightCm = 0,
    urgencyLevel = 'Low',
    perishable = false,
    needsRefrigeration = false,
    humidityControl = false,
    specialCargo = [],
    bulkness = false,
    insured = false,
    value = 0,
    tolls = 0,
    priority = false,
    fuelSurchargePct = 0,
    waitMinutes = 0,
    nightSurcharge = false,
    vehicleType = 'truck',
  } = bookingData;

  let cost = 0;
  const costBreakdown: CostBreakdown = {
    baseFare: 0,
    distanceCost: 0,
    weightCost: 0,
    urgencySurcharge: 0,
    perishableSurcharge: 0,
    refrigerationSurcharge: 0,
    humiditySurcharge: 0,
    specialCargoSurcharge: 0,
    bulknessSurcharge: 0,
    insuranceFee: 0,
    priorityFee: 0,
    waitTimeFee: 0,
    tollFee: 0,
    nightSurcharge: 0,
    fuelSurcharge: 0,
    subtotal: 0,
    total: 0,
  };

  // Industry standard pricing constants
  const PRICING = {
    BASE_FARE: 500,
    DISTANCE_RATE: 120, // KES per km
    WEIGHT_RATES: {
      small: { max: 1000, rate: 10 },    // KES per kg
      medium: { max: 10000, rate: 8 },   // KES per kg
      large: { rate: 5 }                 // KES per kg
    },
    URGENCY_RATES: {
      Low: 0,
      Medium: 0.15,    // 15% surcharge
      High: 0.30       // 30% surcharge
    },
    FEATURE_SURCHARGES: {
      perishable: 0.10,        // 10% surcharge
      refrigeration: 0.15,     // 15% surcharge
      humidityControl: 0.05,   // 5% surcharge
      specialCargo: 0.20,      // 20% surcharge for special cargo
      bulkness: 0.25,          // 25% surcharge for bulky items
    },
    INSURANCE_RATE: 0.02,      // 2% of goods value
    PRIORITY_FEE: 2000,        // Fixed priority handling fee
    WAIT_TIME_RATE: 30,        // KES per minute
    NIGHT_SURCHARGE: 300,      // Fixed night surcharge
    FUEL_SURCHARGE_RATE: 0.05, // 5% fuel surcharge
  };

  // 1. Base fare (varies by vehicle type)
  const vehicleBaseFares = {
    truck: 500,
    van: 300,
    pickup: 200,
    motorcycle: 100,
  };
  costBreakdown.baseFare = vehicleBaseFares[vehicleType] || PRICING.BASE_FARE;
  cost += costBreakdown.baseFare;

  // 2. Distance-based cost
  costBreakdown.distanceCost = actualDistance * PRICING.DISTANCE_RATE;
  cost += costBreakdown.distanceCost;

  // 3. Weight factor (use greater of actual weight or volumetric weight)
  let volumetricWeight = 0;
  if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
    volumetricWeight = (lengthCm * widthCm * heightCm) / 5000;
  }
  const effectiveWeight = Math.max(weightKg, volumetricWeight);

  if (effectiveWeight > 0) {
    const weightRates = PRICING.WEIGHT_RATES;
    if (effectiveWeight <= weightRates.small.max) {
      costBreakdown.weightCost = effectiveWeight * weightRates.small.rate;
    } else if (effectiveWeight <= weightRates.medium.max) {
      costBreakdown.weightCost = effectiveWeight * weightRates.medium.rate;
    } else {
      costBreakdown.weightCost = effectiveWeight * weightRates.large.rate;
    }
  }
  cost += costBreakdown.weightCost;

  // 4. Urgency surcharge
  const urgencyRate = PRICING.URGENCY_RATES[urgencyLevel] || 0;
  if (urgencyRate > 0) {
    costBreakdown.urgencySurcharge = cost * urgencyRate;
    cost += costBreakdown.urgencySurcharge;
  }

  // 5. Product-specific surcharges
  if (perishable) {
    costBreakdown.perishableSurcharge = cost * PRICING.FEATURE_SURCHARGES.perishable;
    cost += costBreakdown.perishableSurcharge;
  }

  if (needsRefrigeration) {
    costBreakdown.refrigerationSurcharge = cost * PRICING.FEATURE_SURCHARGES.refrigeration;
    cost += costBreakdown.refrigerationSurcharge;
  }

  if (humidityControl) {
    costBreakdown.humiditySurcharge = cost * PRICING.FEATURE_SURCHARGES.humidityControl;
    cost += costBreakdown.humiditySurcharge;
  }

  // 6. Special cargo surcharge
  if (specialCargo && specialCargo.length > 0) {
    costBreakdown.specialCargoSurcharge = cost * PRICING.FEATURE_SURCHARGES.specialCargo;
    cost += costBreakdown.specialCargoSurcharge;
  }

  // 7. Bulkness surcharge
  if (bulkness) {
    costBreakdown.bulknessSurcharge = cost * PRICING.FEATURE_SURCHARGES.bulkness;
    cost += costBreakdown.bulknessSurcharge;
  }

  // 8. Insurance (separate from transporter payment)
  if (insured && value > 0) {
    costBreakdown.insuranceFee = value * PRICING.INSURANCE_RATE;
    // Note: Insurance fee is added to total cost but not paid to transporter
  }

  // 9. Priority handling
  if (priority) {
    costBreakdown.priorityFee = PRICING.PRIORITY_FEE;
    cost += costBreakdown.priorityFee;
  }

  // 10. Wait time fee
  if (waitMinutes > 0) {
    costBreakdown.waitTimeFee = waitMinutes * PRICING.WAIT_TIME_RATE;
    cost += costBreakdown.waitTimeFee;
  }

  // 11. Surcharges (tolls, night fees)
  if (nightSurcharge) {
    costBreakdown.nightSurcharge = PRICING.NIGHT_SURCHARGE;
    cost += costBreakdown.nightSurcharge;
  }
  
  costBreakdown.tollFee = tolls || 0;
  cost += costBreakdown.tollFee;

  // 12. Fuel surcharge
  if (fuelSurchargePct > 0) {
    costBreakdown.fuelSurcharge = cost * fuelSurchargePct;
    cost += costBreakdown.fuelSurcharge;
  }

  // Calculate transporter payment (excludes insurance)
  const transporterPayment = cost; // Insurance is not paid to transporter
  const totalCost = cost + (costBreakdown.insuranceFee || 0);

  return {
    cost: Math.round(totalCost),
    transporterPayment: Math.round(transporterPayment),
    costBreakdown: {
      ...costBreakdown,
      // Add summary
      subtotal: Math.round(transporterPayment),
      insuranceFee: costBreakdown.insuranceFee || 0,
      total: Math.round(totalCost),
    },
    paymentBreakdown: {
      transporterReceives: Math.round(transporterPayment),
      companyReceives: costBreakdown.insuranceFee || 0,
      total: Math.round(totalCost),
    }
  };
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

export type { BookingData, CostBreakdown, PaymentBreakdown, CostResult };
