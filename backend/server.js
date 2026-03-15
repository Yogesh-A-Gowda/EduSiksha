require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const socketHandler = require('./src/socketHandler');

const documentWorker = require('./src/workers/documentWorker');
console.log(documentWorker,"documentWork is initialized");
const summaryWorker = require('./src/workers/summaryWorker');
console.log( summaryWorker,"Worker process initialized");


const PORT = process.env.PORT || 5000;

// 1. Create HTTP Server
const server = http.createServer(app);

// 2. Initialize Socket.io with Production CORS
const io = new Server(server, {
  cors: {
    // In production, change "*" to your specific frontend URL (e.g., "https://myapp.com")
    origin: "*", 
    allowedHeaders: ["Authorization"],
    credentials: true
  }
});
app.set('io', io);
// 3. Attach Logic
socketHandler(io);

// 4. Listen
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSockets enabled`);
});