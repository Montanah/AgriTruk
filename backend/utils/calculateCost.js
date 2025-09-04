function calculateTransportCost(bookingData) {
  let {
    actualDistance = 0,
    weightKg = 0,
    urgencyLevel = "Low",
    perishable = false,
    needsRefrigeration = false,
    humidyControl = false,
    insured = false,
    value = 0,
    priority = false,
    fuelSurcharge = 0,
    waitTimeFee = 0,
  } = bookingData;

  let cost = 0;

  // 1. Base fare
  cost += 1000;

  // 2. Distance-based cost (KES 120/km)
  cost += actualDistance * 120;

  // 3. Weight factor
  if (weightKg > 1000 && weightKg <= 10000) {
    cost += (weightKg - 1000) * 20;
  } else if (weightKg > 10000) {
    cost += (9000 * 20) + (weightKg - 10000) * 15;
  }

  // 4. Urgency surcharge
  if (urgencyLevel === "Medium") {
    cost *= 1.15;
  } else if (urgencyLevel === "High") {
    cost *= 1.3;
  }

  // 5. Product-specific surcharges
  if (perishable) cost *= 1.1;
  if (needsRefrigeration) cost *= 1.15;
  if (humidyControl) cost *= 1.05;

  // 6. Insurance
  if (insured && value > 0) {
    cost += value * 0.02;
  }

  // 7. Priority handling
  if (priority) cost += 2000;

  // 8. Add fuel surcharge + wait time fee
  cost += fuelSurcharge + waitTimeFee;

  return Math.round(cost); // round to nearest KES
}
