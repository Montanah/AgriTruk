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
    humidityControl = false, // Corrected from humidyControl
    insured = false,
    value = 0,
    tolls = 0,
    priority = false,
    fuelSurchargePct = 0,
    waitMinutes = 0,
    nightSurcharge = false,
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
    insuranceFee: 0,
    priorityFee: 0,
    waitTimeFee: 0,
    tollFee: 0,
    nightSurcharge: 0,
    fuelSurcharge: 0,
  };

  // 1. Base fare
  costBreakdown.baseFare = 500;
  cost += costBreakdown.baseFare;

  // 2. Distance-based cost (KES 120/km)
  costBreakdown.distanceCost = actualDistance * 120;
  cost += costBreakdown.distanceCost;

  // 3. Weight factor (use greater of actual weight or volumetric weight)
  let volumetricWeight = 0;
  if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
    volumetricWeight = (lengthCm * widthCm * heightCm) / 5000;
  }
  const effectiveWeight = Math.max(weightKg, volumetricWeight);

  if (effectiveWeight > 0) {
    if (effectiveWeight <= 1000) {
      costBreakdown.weightCost = effectiveWeight * 10; // small cargo
    } else if (effectiveWeight <= 10000) {
      costBreakdown.weightCost = effectiveWeight * 8; // medium cargo
    } else {
      costBreakdown.weightCost = effectiveWeight * 5; // large cargo discount rate
    }
  }
  cost += costBreakdown.weightCost;

  // 4. Urgency surcharge
  let tempCost = cost;
  if (urgencyLevel === "Medium") {
    costBreakdown.urgencySurcharge = tempCost * 0.15;
    cost *= 1.15;
  } else if (urgencyLevel === "High") {
    costBreakdown.urgencySurcharge = tempCost * 0.3;
    cost *= 1.3;
  }

  // 5. Product-specific surcharges
  if (perishable) {
    costBreakdown.perishableSurcharge = cost * 0.1;
    cost *= 1.1;
  }
  if (needsRefrigeration) {
    costBreakdown.refrigerationSurcharge = cost * 0.15;
    cost *= 1.15;
  }
  if (humidityControl) {
    costBreakdown.humiditySurcharge = cost * 0.05;
    cost *= 1.05;
  }

  // 6. Insurance
  if (insured && value > 0) {
    costBreakdown.insuranceFee = value * 0.02;
    cost += costBreakdown.insuranceFee;
  }

  // 7. Priority handling
  if (priority) {
    costBreakdown.priorityFee = 2000;
    cost += costBreakdown.priorityFee;
  }

  // 8. Wait time fee (KES 30/min)
  if (waitMinutes > 0) {
    costBreakdown.waitTimeFee = waitMinutes * 30;
    cost += costBreakdown.waitTimeFee;
  }

  // 9. Surcharges (tolls, night fees)
  if (nightSurcharge) {
    costBreakdown.nightSurcharge = 300;
    cost += costBreakdown.nightSurcharge;
  }
  costBreakdown.tollFee = tolls;
  cost += costBreakdown.tollFee;

  // 10. Fuel surcharge
  if (fuelSurchargePct > 0) {
    costBreakdown.fuelSurcharge = cost * fuelSurchargePct;
    cost += costBreakdown.fuelSurcharge;
  }

  return {
    cost: Math.round(cost), 
    costBreakdown,
  };
}

module.exports = calculateTransportCost;
