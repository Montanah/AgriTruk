function calculateTransportCost(bookingData) {
  let {
    actualDistance = 0,
    weightKg = 0,
    lengthCm = 0,
    widthCm = 0,
    heightCm = 0,
    urgencyLevel = "Low",
    perishable = false,
    needsRefrigeration = false,
    humidityControl = false,
    specialCargo = [],
    bulkiness = false,
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
  const costBreakdown = {
    baseFare: 0,
    distanceCost: 0,
    weightCost: 0,
    urgencySurcharge: 0,
    perishableSurcharge: 0,
    refrigerationSurcharge: 0,
    humiditySurcharge: 0,
    specialCargoSurcharge: 0,
    bulkinessSurcharge: 0,
    insuranceFee: 0,
    priorityFee: 0,
    waitTimeFee: 0,
    tollFee: 0,
    nightSurcharge: 0,
    fuelSurcharge: 0,
  };

  // Realistic Kenya market pricing constants (2024)
  const PRICING = {
    BASE_FARE: 300,            // Reduced from 500 to 300 KES
    DISTANCE_RATE: 80,         // Reduced from 120 to 80 KES per km (market rate ~212, but we're more competitive)
    WEIGHT_RATES: {
      small: { max: 1000, rate: 5 },     // Reduced from 10 to 5 KES per kg
      medium: { max: 10000, rate: 4 },   // Reduced from 8 to 4 KES per kg
      large: { rate: 2.5 }               // Reduced from 5 to 2.5 KES per kg
    },
    URGENCY_RATES: {
      Low: 0,
      Medium: 0.10,    // Reduced from 15% to 10% surcharge
      High: 0.20       // Reduced from 30% to 20% surcharge
    },
    FEATURE_SURCHARGES: {
      perishable: 0.08,        // Reduced from 10% to 8% surcharge
      refrigeration: 0.12,     // Reduced from 15% to 12% surcharge
      humidityControl: 0.04,   // Reduced from 5% to 4% surcharge
      specialCargo: 0.15,      // Reduced from 20% to 15% surcharge
      bulkiness: 0.10,         // Reduced from 15% to 10% surcharge
    },
    INSURANCE_RATE: 0.004,     // 0.4% of goods value (realistic international rate)
    PRIORITY_FEE: 1000,        // Reduced from 2000 to 1000 KES
    WAIT_TIME_RATE: 20,        // Reduced from 30 to 20 KES per minute
    NIGHT_SURCHARGE: 200,      // Reduced from 300 to 200 KES
    FUEL_SURCHARGE_RATE: 0.03, // Reduced from 5% to 3% fuel surcharge
  };

  // 1. Base fare (varies by vehicle type) - Realistic Kenya rates
  const vehicleBaseFares = {
    truck: 300,      // Reduced from 500
    van: 200,        // Reduced from 300
    pickup: 150,     // Reduced from 200
    motorcycle: 100, // Kept same
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
  console.log('calculateCost - urgencyLevel:', urgencyLevel, 'type:', typeof urgencyLevel);
  console.log('calculateCost - PRICING.URGENCY_RATES:', PRICING.URGENCY_RATES);
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

  // 7. Bulkiness surcharge
  if (bulkiness) {
    // Calculate bulkiness factor based on dimensions and weight
    let bulkinessFactor = PRICING.FEATURE_SURCHARGES.bulkiness; // Base 10%
    
    // If dimensions are provided, calculate a more sophisticated bulkiness factor
    if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
      const volume = (lengthCm * widthCm * heightCm) / 1000000; // Convert to cubic meters
      const density = effectiveWeight / volume; // kg per cubic meter
      
      // Adjust bulkiness factor based on density (reduced rates)
      if (density < 100) { // Very light for volume (very bulky)
        bulkinessFactor = 0.15; // 15% surcharge (reduced from 20%)
      } else if (density < 200) { // Light for volume (bulky)
        bulkinessFactor = 0.12; // 12% surcharge (reduced from 15%)
      } else if (density < 500) { // Moderate density
        bulkinessFactor = 0.08; // 8% surcharge (reduced from 10%)
      } else { // Dense items
        bulkinessFactor = 0.05; // 5% surcharge (kept same)
      }
    }
    
    costBreakdown.bulkinessSurcharge = cost * bulkinessFactor;
    cost += costBreakdown.bulkinessSurcharge;
  }

  // 8. Insurance (separate from transporter payment)
  if (insured && value > 0) {
    // Calculate insurance rate based on cargo type and risk factors
    let insuranceRate = PRICING.INSURANCE_RATE; // Base 0.4%
    
    // Adjust rate based on cargo characteristics
    if (perishable) {
      insuranceRate = 0.006; // 0.6% for perishable goods
    }
    
    if (specialCargo && specialCargo.length > 0) {
      // Check for high-risk special cargo
      const highRiskCargo = ['hazardous', 'fragile', 'highValue', 'livestockAnimals'];
      const hasHighRisk = specialCargo.some(cargo => 
        highRiskCargo.some(risk => cargo.toLowerCase().includes(risk.toLowerCase()))
      );
      
      if (hasHighRisk) {
        insuranceRate = 0.012; // 1.2% for high-risk special cargo
      } else {
        insuranceRate = 0.008; // 0.8% for standard special cargo
      }
    }
    
    // Calculate insured value (goods value + freight cost + 10% margin)
    const freightCost = cost; // Current calculated freight cost
    const insuredValue = value + freightCost + (value * 0.1); // Add 10% margin
    
    costBreakdown.insuranceFee = insuredValue * insuranceRate;
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
  let transporterPayment = cost; // Insurance is not paid to transporter
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

module.exports = calculateTransportCost;
