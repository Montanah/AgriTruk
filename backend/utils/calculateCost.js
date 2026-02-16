function calculateTransportCost(bookingData) {
  let {
    actualDistance = 0,
    weightKg = 0,
    perishable = false,
    needsRefrigeration = false,
    insured = false,
    value = 0,
    priority = false,
  } = bookingData;

  const costBreakdown = {
    baseCost: 0,
    perishableSurcharge: 0,
    refrigerationSurcharge: 0,
    insuranceFee: 0,
    priorityFee: 0,
  };

  // Convert weight to tons
  const weightTons = weightKg / 1000;

  // Fixed rate per ton per km
  const RATE_PER_TON_KM = 4; // Ksh 4 per ton per km

  // Base cost
  let cost = Math.max(actualDistance * weightTons * RATE_PER_TON_KM, 300); // Minimum Ksh 300
  costBreakdown.baseCost = cost;

  // Perishable surcharge (flat per km)
  if (perishable) {
    const PERISHABLE_RATE = 1.5; // Ksh 1.5/km per ton
    costBreakdown.perishableSurcharge =
      distanceKm * weightTons * PERISHABLE_RATE;
    cost += costBreakdown.perishableSurcharge;
  }

  // Refrigeration surcharge
  if (needsRefrigeration) {
    const REFRIGERATION_RATE = 2; // Ksh 2/km per ton
    costBreakdown.refrigerationSurcharge =
      distanceKm * weightTons * REFRIGERATION_RATE;
    cost += costBreakdown.refrigerationSurcharge;
  }

  // Priority handling
  if (priority) {
    const PRIORITY_FEE = 1000; // Flat Ksh 1,000
    costBreakdown.priorityFee = PRIORITY_FEE;
    cost += PRIORITY_FEE;
  }

  // Insurance
  if (insured && value > 0) {
    const INSURANCE_RATE = 0.003; // 0.3% of cargo value
    costBreakdown.insuranceFee = value * INSURANCE_RATE;
  } else {
    costBreakdown.insuranceFee = 0;
  }

  // Calculate transporter payment (excludes insurance)
  let transporterPayment = cost; // Insurance is not paid to transporter
  const totalCost = cost + (costBreakdown.insuranceFee || 0);

  const variationPct = 0.1; // ±10% range
  const minVariationPct = 0.3; // ±30% range
  const minCost = Math.round(totalCost * (1 - minVariationPct));
  const maxCost = Math.round(totalCost * (1 + variationPct));

  return {
    cost: Math.round(totalCost),
    estimatedCostRange: {
      min: minCost,
      max: maxCost,
      display: `Ksh ${minCost.toLocaleString()} - ${maxCost.toLocaleString()}`,
    },
    baseEstimate: Math.round(totalCost),
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
    },
  };
}

module.exports = calculateTransportCost;
