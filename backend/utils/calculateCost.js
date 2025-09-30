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
      bulkiness: 0.15,          // 15% surcharge for bulky items
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

  // 7. Bulkiness surcharge
  if (bulkiness) {
    // Calculate bulkiness factor based on dimensions and weight
    let bulkinessFactor = PRICING.FEATURE_SURCHARGES.bulkiness; // Base 15%
    
    // If dimensions are provided, calculate a more sophisticated bulkiness factor
    if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
      const volume = (lengthCm * widthCm * heightCm) / 1000000; // Convert to cubic meters
      const density = effectiveWeight / volume; // kg per cubic meter
      
      // Adjust bulkiness factor based on density
      if (density < 100) { // Very light for volume (very bulky)
        bulkinessFactor = 0.20; // 20% surcharge
      } else if (density < 200) { // Light for volume (bulky)
        bulkinessFactor = 0.15; // 15% surcharge
      } else if (density < 500) { // Moderate density
        bulkinessFactor = 0.10; // 10% surcharge
      } else { // Dense items
        bulkinessFactor = 0.05; // 5% surcharge
      }
    }
    
    costBreakdown.bulkinessSurcharge = cost * bulkinessFactor;
    cost += costBreakdown.bulkinessSurcharge;
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

module.exports = calculateTransportCost;
