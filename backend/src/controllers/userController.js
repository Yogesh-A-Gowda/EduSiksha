const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { redisClient } = require('../config/redis'); // <--- ADD THIS
// HELPER: Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

/**
 * 1. Register Parent (Public)
 * Used for the initial account creation. Sets is_admin to true.
 */
exports.registerParent = async (req, res) => {
  const { email, password, full_name } = req.body;
  try {
    const existing = await db.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO profiles (email, password, full_name, is_admin, is_paid) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name',
      [email, hashedPassword, full_name, true, false] // Parents are admins, initially unpaid
    );

    res.status(201).json({ message: "Parent account created successfully", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 2. Create Student (Protected)
 * Only a logged-in Parent (Admin) can call this to create a kid's account.
 */
exports.createStudent = async (req, res) => {
  const { email, password, full_name } = req.body;
  const parentId = req.user.id;

  try {
    // 1. Verify Parent Role
    const adminCheck = await db.query('SELECT is_admin FROM profiles WHERE id = $1', [parentId]);
    if (!adminCheck.rows[0]?.is_admin) {
      return res.status(403).json({ error: "Access denied. Only parents can create students." });
    }

    // 2. ENFORCE LIMIT: Count existing kids for this parent
    const countCheck = await db.query(
      'SELECT COUNT(*) FROM profiles WHERE parent_id = $1', 
      [parentId]
    );
    
    if (parseInt(countCheck.rows[0].count) >= 3) {
      return res.status(400).json({ 
        error: "Maximum limit reached. A parent can only have 3 student accounts." 
      });
    }

    // 3. Proceed with Creation
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO profiles (email, password, full_name, is_admin, is_paid, parent_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email',
      [email, hashedPassword, full_name, false, false, parentId]
    );

    res.status(201).json({ message: "Student account created", student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * 3. Login (Shared)
 * Works for both Parents and Students.
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM profiles WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.status(200).json({
      token: generateToken(user.id),
      user: { 
        id: user.id, 
        fullName: user.full_name, 
        isPaid: user.is_paid, 
        isAdmin: user.is_admin 
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 4. Update Password (Protected)
 */
exports.updatePassword = async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.user.id;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE profiles SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 5. Get All Users (Protected - Admin Only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Optional: Add an admin check here similar to createStudent
    const result = await db.query('SELECT id, email, full_name, is_admin, is_paid FROM profiles');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get My Students (Protected - Parent Only)
 * Only returns students linked to the logged-in parent.
 */
// userController.js (or similar)
exports.getMyStudents = async (req, res) => {
  const parentId = req.user.id; // Get the logged-in parent's ID from the token

  try {
    const result = await db.query(
      'SELECT id, email, full_name, is_admin FROM profiles WHERE parent_id = $1',
      [parentId]
    );
    
    // This ensures Parent 2 only sees their own kids
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * Delete Student (Protected - Admin Only)
 * Clears the student profile and ALL associated conversations and messages.
 */
exports.deleteStudent = async (req, res) => {
  const { id } = req.params; // The ID of the student to delete
  const parentId = req.user.id;

  try {
    // 1. Role and Ownership Check (Security)
    const accessCheck = await db.query(
      'SELECT id FROM profiles WHERE id = $1 AND parent_id = $2',
      [id, parentId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: "Student not found or unauthorized access." });
    }

    // 2. Start Transaction to clear all data
    await db.query('BEGIN');

    // Step A: Delete all messages linked to student's conversations
    await db.query(`
      DELETE FROM messages 
      WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = $1)
    `, [id]);

    // Step B: Delete all conversations belonging to the student
    await db.query('DELETE FROM conversations WHERE user_id = $1', [id]);

    // Step C: Delete the student profile
    await db.query('DELETE FROM profiles WHERE id = $1', [id]);

    await db.query('COMMIT');

    res.status(200).json({ message: "Student and all associated history cleared successfully." });
  } catch (err) {
    // If any step fails, undo everything
    await db.query('ROLLBACK');
    res.status(500).json({ error: "Failed to clear student data: " + err.message });
  }
};

exports.logout = async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    // Blacklist token for 24 hours (86400 seconds)
    // After 24h, the JWT itself expires, so we don't need to keep it in Redis forever
    await redisClient.set(`blacklist:${token}`, 'true', 'EX', 86400);
  }
  res.json({ message: "Logged out successfully" });
};