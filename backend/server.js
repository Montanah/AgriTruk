require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Deployment test Wed Sep 24 01:24:29 PM EAT 2025
console.log('Backend deployment test - Wed Sep 24 02:45:00 PM EAT 2025 - Fixed hasAnySubscription');
