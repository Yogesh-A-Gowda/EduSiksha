const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {verifyToken} = require('../middleware/auth');

// 1. PUBLIC: Initial Parent Sign-up
// This is the "Entry Point" for new families
router.post('/register-parent', userController.registerParent);

// 2. SHARED: Login for both Parents and Students
router.post('/login', userController.login);

// 3. PROTECTED: Parent creating a Student account
// Requires a valid Parent JWT in the Authorization header
router.post('/create-student', verifyToken, userController.createStudent);

// 4. PROTECTED: Password updates
router.put('/update-password', verifyToken, userController.updatePassword);

// 5. ADMIN ONLY: View all users (useful for your web-triage goals)
router.get('/all', verifyToken, userController.getAllUsers);

router.delete('/delete-student/:id', verifyToken, userController.deleteStudent);

router.get('/my-students', verifyToken, userController.getMyStudents);

router.post('/logout', verifyToken, userController.logout);
module.exports = router;