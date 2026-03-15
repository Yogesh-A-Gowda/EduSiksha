const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes'); // Assuming you have user auth routes
//const authMiddleware = require('./middleware/auth');
require('./workers/summaryWorker');
require('./workers/documentWorker');
const app = express();

// Security & Parsing Middleware
app.use(cors({
  origin: "*", // In production, replace '*' with your actual frontend domain
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes); 

// Health Check (Important for Docker/Load Balancers)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;