require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Get the HTTP server from app.js (it's already created there with Socket.IO)
const server = app.server;

if (!server) {
  console.error('❌ HTTP server not found in app.js. Socket.IO may not be initialized.');
  process.exit(1);
}

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Socket.IO server ready for real-time chat`);
  console.log(`✅ Socket.IO path: /socket.io`);
});
