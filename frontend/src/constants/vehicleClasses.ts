// NTSA Vehicle Classes for Kenya
// Based on official NTSA driving license categories from https://senseitechnology.co.ke/ntsa-driving-licence-class-categories-with-vehicle-description-age-requirements-per-class/

export const NTSA_VEHICLE_CLASSES = [
  // Category A - Motorcycles
  { value: 'A1', label: 'A1 - Moped (up to 50cc)', category: 'A', minAge: 16 },
  { value: 'A2', label: 'A2 - Light Motorcycle (above 50cc)', category: 'A', minAge: 18 },
  { value: 'A3', label: 'A3 - Motorcycle Taxi/Courier (above 100cc)', category: 'A', minAge: 21 },
  
  // Category B - Light Vehicles
  { value: 'B1', label: 'B1 - Light Vehicle (up to 3500kg GVW)', category: 'B', minAge: 18 },
  { value: 'B2', label: 'B2 - Light Vehicle Automatic (up to 3500kg GVW)', category: 'B', minAge: 18 },
  { value: 'B3', label: 'B3 - Professional Light Vehicle (up to 3500kg GVW)', category: 'B', minAge: 21 },
  
  // Category C - Trucks
  { value: 'C1', label: 'C1 - Light Truck (3500-7500kg GVW)', category: 'C', minAge: 22 },
  { value: 'C', label: 'C - Medium Truck (above 7500kg GVW)', category: 'C', minAge: 24 },
  { value: 'CE', label: 'CE - Heavy Truck with Trailer', category: 'C', minAge: 28 },
  { value: 'CD', label: 'CD - Heavy Goods Vehicle (Hazardous Materials)', category: 'C', minAge: 30 },
  
  // Category D - Passenger Vehicles
  { value: 'D1', label: 'D1 - Van (up to 14 passengers)', category: 'D', minAge: 22 },
  { value: 'D2', label: 'D2 - Mini-bus (14-32 passengers)', category: 'D', minAge: 25 },
  { value: 'D3', label: 'D3 - Large Bus (33+ passengers)', category: 'D', minAge: 30 },
  
  // Category E - Special Professional
  { value: 'E', label: 'E - Special Professional License', category: 'E', minAge: 21 },
  
  // Category F - Persons with Disability
  { value: 'F', label: 'F - Special License (PWD)', category: 'F', minAge: 18 },
  
  // Category G - Industrial/Construction
  { value: 'G', label: 'G - Industrial/Construction Equipment', category: 'G', minAge: 18 }
];

// Vehicle specializations for job seekers
export const VEHICLE_SPECIALIZATIONS = [
  'General Cargo Transport',
  'Refrigerated Transport',
  'Hazardous Materials Transport',
  'Construction Equipment Transport',
  'Passenger Transport',
  'Long Distance Haulage',
  'Local Delivery Services',
  'Agricultural Transport',
  'Heavy Machinery Transport',
  'Container Transport',
  'Courier Services',
  'Emergency Transport',
  'Waste Management Transport',
  'Fuel Transport',
  'Livestock Transport'
];

// Helper function to get vehicle classes by category
export const getVehicleClassesByCategory = (category: string) => {
  return NTSA_VEHICLE_CLASSES.filter(vc => vc.category === category);
};

// Helper function to get vehicle class by value
export const getVehicleClassByValue = (value: string) => {
  return NTSA_VEHICLE_CLASSES.find(vc => vc.value === value);
};

// Helper function to check if user meets age requirement for vehicle class
export const meetsAgeRequirement = (vehicleClass: string, userAge: number) => {
  const vc = getVehicleClassByValue(vehicleClass);
  return vc ? userAge >= vc.minAge : false;
};

// Helper function to get vehicle class label
export const getVehicleClassLabel = (value: string): string => {
  const vehicleClass = NTSA_VEHICLE_CLASSES.find(cls => cls.value === value);
  return vehicleClass ? vehicleClass.label : value;
};

// Helper function to get specialization label
export const getSpecializationLabel = (value: string): string => {
  const specialization = VEHICLE_SPECIALIZATIONS.find(spec => spec === value);
  return specialization || value;
};