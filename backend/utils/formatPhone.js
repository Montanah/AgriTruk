function formatPhoneNumber(phone) {
  // Remove all spaces or special characters
  phone = phone.replace(/\D/g, '');

  // If starts with 0 and is 10 digits: 07XXXXXXXX → 2547XXXXXXXX
  if (phone.startsWith('0') && phone.length === 10) {
    return `254${phone.substring(1)}`;
  }

  // If starts with 2540 → fix to 2547XXXXXXXX
  if (phone.startsWith('2540')) {
    return `254${phone.substring(4)}`;
  }

  // If starts with +254 → remove +
  if (phone.startsWith('+254')) {
    return phone.substring(1);
  }

  // Already correct
  return phone;
}

module.exports = formatPhoneNumber;

