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

// Simplified vehicle classes for UI display (shorter labels)
export const NTSA_VEHICLE_CLASSES_SIMPLE = [
  // Category A - Motorcycles
  { value: 'A1', label: 'A1 - Moped', category: 'A', minAge: 16 },
  { value: 'A2', label: 'A2 - Motorcycle', category: 'A', minAge: 18 },
  { value: 'A3', label: 'A3 - Motorcycle Taxi', category: 'A', minAge: 21 },
  
  // Category B - Light Vehicles
  { value: 'B1', label: 'B1 - Light Vehicle', category: 'B', minAge: 18 },
  { value: 'B2', label: 'B2 - Auto Light Vehicle', category: 'B', minAge: 18 },
  { value: 'B3', label: 'B3 - Professional Vehicle', category: 'B', minAge: 21 },
  
  // Category C - Trucks
  { value: 'C1', label: 'C1 - Light Truck', category: 'C', minAge: 22 },
  { value: 'C', label: 'C - Medium Truck', category: 'C', minAge: 24 },
  { value: 'CE', label: 'CE - Heavy Truck', category: 'C', minAge: 28 },
  { value: 'CD', label: 'CD - Hazardous Materials', category: 'C', minAge: 30 },
  
  // Category D - Passenger Vehicles
  { value: 'D1', label: 'D1 - Van', category: 'D', minAge: 22 },
  { value: 'D2', label: 'D2 - Mini-bus', category: 'D', minAge: 25 },
  { value: 'D3', label: 'D3 - Large Bus', category: 'D', minAge: 30 },
  
  // Category E - Special Professional
  { value: 'E', label: 'E - Professional License', category: 'E', minAge: 21 },
  
  // Category F - Persons with Disability
  { value: 'F', label: 'F - PWD License', category: 'F', minAge: 18 },
  
  // Category G - Industrial/Construction
  { value: 'G', label: 'G - Industrial Equipment', category: 'G', minAge: 18 }
];

// Enhanced specializations with better structure
export const VEHICLE_SPECIALIZATIONS_ENHANCED = [
  { value: 'general-cargo', label: 'General Cargo', icon: 'truck' },
  { value: 'refrigerated', label: 'Refrigerated', icon: 'snowflake' },
  { value: 'hazardous', label: 'Hazardous Materials', icon: 'alert-circle' },
  { value: 'construction', label: 'Construction', icon: 'hammer' },
  { value: 'passenger', label: 'Passenger Transport', icon: 'bus' },
  { value: 'long-distance', label: 'Long Distance', icon: 'map-marker-distance' },
  { value: 'local-delivery', label: 'Local Delivery', icon: 'package-variant' },
  { value: 'agricultural', label: 'Agricultural', icon: 'leaf' },
  { value: 'heavy-machinery', label: 'Heavy Machinery', icon: 'crane' },
  { value: 'container', label: 'Container', icon: 'cube' },
  { value: 'courier', label: 'Courier', icon: 'email-fast' },
  { value: 'emergency', label: 'Emergency', icon: 'ambulance' },
  { value: 'waste-management', label: 'Waste Management', icon: 'trash-can' },
  { value: 'fuel', label: 'Fuel Transport', icon: 'gas-station' },
  { value: 'livestock', label: 'Livestock', icon: 'cow' }
];

// Mapping between API specializations and filter values
export const SPECIALIZATION_MAPPING = {
  // API Value -> Filter Value
  'General Cargo Transport': 'general-cargo',
  'Refrigerated Transport': 'refrigerated',
  'Hazardous Materials Transport': 'hazardous',
  'Construction Equipment Transport': 'construction',
  'Passenger Transport': 'passenger',
  'Long Distance Haulage': 'long-distance',
  'Local Delivery Services': 'local-delivery',
  'Agricultural Transport': 'agricultural',
  'Heavy Machinery Transport': 'heavy-machinery',
  'Container Transport': 'container',
  'Courier Services': 'courier',
  'Emergency Transport': 'emergency',
  'Waste Management Transport': 'waste-management',
  'Fuel Transport': 'fuel',
  'Livestock Transport': 'livestock',
  
  // Reverse mapping for display
  'general-cargo': 'General Cargo Transport',
  'refrigerated': 'Refrigerated Transport',
  'hazardous': 'Hazardous Materials Transport',
  'construction': 'Construction Equipment Transport',
  'passenger': 'Passenger Transport',
  'long-distance': 'Long Distance Haulage',
  'local-delivery': 'Local Delivery Services',
  'agricultural': 'Agricultural Transport',
  'heavy-machinery': 'Heavy Machinery Transport',
  'container': 'Container Transport',
  'courier': 'Courier Services',
  'emergency': 'Emergency Transport',
  'waste-management': 'Waste Management Transport',
  'fuel': 'Fuel Transport',
  'livestock': 'Livestock Transport'
};

// Helper function to map API specialization to filter value
export const mapApiSpecializationToFilter = (apiSpecialization: string): string => {
  return SPECIALIZATION_MAPPING[apiSpecialization as keyof typeof SPECIALIZATION_MAPPING] || apiSpecialization;
};

// Helper function to map filter value to API specialization
export const mapFilterToApiSpecialization = (filterValue: string): string => {
  return SPECIALIZATION_MAPPING[filterValue as keyof typeof SPECIALIZATION_MAPPING] || filterValue;
};