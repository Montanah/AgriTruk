function formatPhoneNumber(phone) {
  // Convert 07... to 2547...
  if (phone.startsWith('0') && phone.length === 10) {
    return `254${phone.substring(1)}`;
  }
  // Ensure international format
  if (phone.startsWith('+')) {
    return phone.substring(1);
  }
  return phone;
}

module.exports = formatPhoneNumber;