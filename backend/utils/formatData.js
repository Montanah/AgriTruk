const formatTimestamps = (data) => {
  // Handle array of objects
  if (Array.isArray(data)) {
    return data.map(item => {
      const result = {};
      for (const key in item) {
        if (item[key] && typeof item[key].toDate === 'function') {
          result[key] = item[key].toDate().toISOString(); // Convert to ISO string
        } else {
          result[key] = item[key];
        }
      }
      return result;
    });
  }

  // Handle single object
  const result = {};
  for (const key in data) {
    if (data[key] && typeof data[key].toDate === 'function') {
      result[key] = data[key].toDate().toISOString(); // Convert to ISO string
    } else {
      result[key] = data[key];
    }
  }
  return result;
};

module.exports = { formatTimestamps };