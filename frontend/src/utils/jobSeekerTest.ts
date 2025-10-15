// Test utility for job seeker functionality
// This file can be used to test the job seeker flow

import { NTSA_VEHICLE_CLASSES } from '../constants/vehicleClasses';

export const testJobSeekerValidation = () => {
  console.log('Testing Job Seeker Validation...');
  
  // Test age calculation
  const testDateOfBirth = new Date('1990-01-01');
  const today = new Date();
  let age = today.getFullYear() - testDateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - testDateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < testDateOfBirth.getDate())) {
    age--;
  }
  
  console.log('Test Date of Birth:', testDateOfBirth.toLocaleDateString());
  console.log('Calculated Age:', age);
  
  // Test experience calculation
  const testCareerStartDate = new Date('2015-01-01');
  let experience = today.getFullYear() - testCareerStartDate.getFullYear();
  const expMonthDiff = today.getMonth() - testCareerStartDate.getMonth();
  if (expMonthDiff < 0 || (expMonthDiff === 0 && today.getDate() < testCareerStartDate.getDate())) {
    experience--;
  }
  
  console.log('Test Career Start Date:', testCareerStartDate.toLocaleDateString());
  console.log('Calculated Experience:', experience);
  
  // Test vehicle class eligibility
  console.log('\nTesting Vehicle Class Eligibility:');
  NTSA_VEHICLE_CLASSES.forEach(vehicleClass => {
    const isEligible = age >= vehicleClass.minAge;
    console.log(`${vehicleClass.label}: Age ${age} >= ${vehicleClass.minAge} = ${isEligible ? '✅' : '❌'}`);
  });
  
  return {
    age,
    experience,
    eligibleClasses: NTSA_VEHICLE_CLASSES.filter(cls => age >= cls.minAge)
  };
};

export const testFormDataCreation = () => {
  console.log('Testing FormData Creation...');
  
  const mockJobSeekerData = {
    dateOfBirth: new Date('1990-01-01'),
    careerStartDate: new Date('2015-01-01'),
    selectedVehicleClasses: ['B1', 'C1'],
    selectedSpecializations: ['General Cargo Transport', 'Long Haul'],
    assignmentDescription: 'Test assignment description'
  };
  
  const formData = new FormData();
  formData.append('dateOfBirth', mockJobSeekerData.dateOfBirth.toISOString());
  formData.append('careerStartDate', mockJobSeekerData.careerStartDate.toISOString());
  formData.append('vehicleClasses', JSON.stringify(mockJobSeekerData.selectedVehicleClasses));
  formData.append('specializations', JSON.stringify(mockJobSeekerData.selectedSpecializations));
  formData.append('assignmentDescription', mockJobSeekerData.assignmentDescription);
  
  console.log('FormData created successfully');
  console.log('Mock data:', mockJobSeekerData);
  
  return formData;
};

// Export test functions for use in development
export default {
  testJobSeekerValidation,
  testFormDataCreation
};
