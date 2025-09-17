const axios = require('axios');

async function getGeoLocation(ip) {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    const { city, region, country_name } = response.data;
    return `${city || 'Unknown'}, ${region || ''}, ${country_name || ''}`.trim();
  } catch (err) {
    console.warn("Geo location fetch failed:", err.message);
    return "unknown";
  }
}

module.exports =  getGeoLocation;