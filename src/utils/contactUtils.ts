/**
 * Utility functions for handling contact information and placeholder detection
 */

/**
 * Checks if an email is a placeholder value
 * @param email - The email to check
 * @returns true if the email is a placeholder
 */
export const isPlaceholderEmail = (email: string): boolean => {
  return email.includes('@trukapp.com') && email.startsWith('temp_');
};

/**
 * Checks if a phone number is a placeholder value
 * @param phone - The phone number to check
 * @returns true if the phone is a placeholder
 */
export const isPlaceholderPhone = (phone: string): boolean => {
  // Check if phone matches the placeholder pattern: +2540000000XXX
  return phone.startsWith('+2540000000') && phone.length === 14;
};

/**
 * Gets a user-friendly message for missing contact information
 * @param email - The user's email
 * @param phone - The user's phone
 * @param emailVerified - Whether email is verified
 * @param phoneVerified - Whether phone is verified
 * @returns A message object with title and description
 */
export const getMissingContactMessage = (
  email: string,
  phone: string,
  emailVerified: boolean,
  phoneVerified: boolean
): { title: string; description: string; action: string } => {
  const hasPlaceholderEmail = isPlaceholderEmail(email);
  const hasPlaceholderPhone = isPlaceholderPhone(phone);
  
  if (hasPlaceholderEmail && hasPlaceholderPhone) {
    return {
      title: 'Complete Your Contact Information',
      description: 'Add your email and phone number to your profile for better account security and easier login.',
      action: 'Update Profile'
    };
  } else if (hasPlaceholderEmail) {
    return {
      title: 'Add Your Email Address',
      description: 'Add your email address to your profile for account recovery and easier login.',
      action: 'Add Email'
    };
  } else if (hasPlaceholderPhone) {
    return {
      title: 'Add Your Phone Number',
      description: 'Add your phone number to your profile for account security and easier login.',
      action: 'Add Phone'
    };
  } else if (!emailVerified && !phoneVerified) {
    return {
      title: 'Verify Your Contact Information',
      description: 'Verify your email and phone number to use them for login.',
      action: 'Verify Now'
    };
  } else if (!emailVerified) {
    return {
      title: 'Verify Your Email',
      description: 'Verify your email address to use it for login.',
      action: 'Verify Email'
    };
  } else if (!phoneVerified) {
    return {
      title: 'Verify Your Phone',
      description: 'Verify your phone number to use it for login.',
      action: 'Verify Phone'
    };
  }
  
  return {
    title: 'Contact Information Complete',
    description: 'Your contact information is up to date and verified.',
    action: 'View Profile'
  };
};

/**
 * Checks if a user has incomplete contact information
 * @param email - The user's email
 * @param phone - The user's phone
 * @param emailVerified - Whether email is verified
 * @param phoneVerified - Whether phone is verified
 * @returns true if contact information is incomplete
 */
export const hasIncompleteContactInfo = (
  email: string,
  phone: string,
  emailVerified: boolean,
  phoneVerified: boolean
): boolean => {
  const hasPlaceholderEmail = isPlaceholderEmail(email);
  const hasPlaceholderPhone = isPlaceholderPhone(phone);
  
  return hasPlaceholderEmail || hasPlaceholderPhone || (!emailVerified && !phoneVerified);
};

/**
 * Gets the priority contact method for verification
 * @param email - The user's email
 * @param phone - The user's phone
 * @param emailVerified - Whether email is verified
 * @param phoneVerified - Whether phone is verified
 * @returns 'email' | 'phone' | null
 */
export const getPriorityContactMethod = (
  email: string,
  phone: string,
  emailVerified: boolean,
  phoneVerified: boolean
): 'email' | 'phone' | null => {
  const hasPlaceholderEmail = isPlaceholderEmail(email);
  const hasPlaceholderPhone = isPlaceholderPhone(phone);
  
  // If both are placeholders, prioritize email
  if (hasPlaceholderEmail && hasPlaceholderPhone) {
    return 'email';
  }
  
  // If email is placeholder, prioritize email
  if (hasPlaceholderEmail) {
    return 'email';
  }
  
  // If phone is placeholder, prioritize phone
  if (hasPlaceholderPhone) {
    return 'phone';
  }
  
  // If both are real but not verified, prioritize the one that was used for signup
  if (!emailVerified && !phoneVerified) {
    return 'email'; // Default to email
  }
  
  return null; // Both are complete
};
