const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Your NeonDB connection

const verifyToken = async (req, res, next) => {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Optional: Check if user exists in NeonDB to be 100% sure
    const userResult = await db.query('SELECT id FROM profiles WHERE id = $1', [decoded.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found in NeonDB." });
    }

    // 4. Attach User ID to request (Crucial for Supabase filters)
    req.user = { id: userResult.rows[0].id };
    
    next(); // Move to the next function (upload)
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(401).json({ error: "Invalid or expired token." });
  }
};


const checkConversationOwnership = async (req, res, next) => {
  // Check body (for POST) OR query params (for GET)
  const conversationId = req.body.conversation_id || req.query.conversation_id || req.params.id;

  if (!conversationId) return next(); // Skip if no ID is involved

  const check = await db.query(
    'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
    [conversationId, req.user.id]
  );

  if (check.rows.length === 0) {
    return res.status(403).json({ error: "Unauthorized. You do not own this conversation." });
  }
  next();
};

module.exports = {verifyToken, checkConversationOwnership};