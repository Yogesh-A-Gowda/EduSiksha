const db = require('../config/db');

module.exports = async (req, res, next) => {
  const userId = req.user.id;

  try {
    // The query checks: 
    // 1. Am I paid? 
    // 2. If I'm a student, is my parent paid?
    const query = `
      SELECT p.is_paid as my_status, parent.is_paid as parent_status, p.is_admin
      FROM profiles p
      LEFT JOIN profiles parent ON p.parent_id = parent.id
      WHERE p.id = $1
    `;
    
    const { rows } = await db.query(query, [userId]);
    const user = rows[0];

    if (!user) return res.status(404).json({ error: "User not found" });

    // Logic: Pass if (I am an admin and I paid) OR (I am a student and my parent paid)
    const hasAccess = user.is_admin ? user.my_status : user.parent_status;

    if (hasAccess) {
      return next();
    }

    res.status(403).json({ 
      error: "Subscription required. Please ensure the Parent account has an active plan." 
    });
  } catch (err) {
    res.status(500).json({ error: "Subscription verification failed." });
  }
};