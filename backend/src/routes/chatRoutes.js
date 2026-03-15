const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken, checkConversationOwnership } = require('../middleware/auth');
const checkSub = require('../middleware/subscriptionGuard');

// ================================
// FILE UPLOAD (EXPENSIVE → LOCKED)
// ================================
router.post(
  '/upload',
  verifyToken,
  checkSub,
  chatController.uploadMiddleware,
  checkConversationOwnership, // FIX: now actually runs
  chatController.handleFileUpload
);

// ================================
// STUDENT CHAT ROUTES
// ================================
router.post('/new', verifyToken, checkSub, chatController.createConversation);
router.post('/message', verifyToken, checkSub, chatController.sendMessage);
router.get(
  '/messages/:conversation_id',
  verifyToken,
  checkSub,
  chatController.getChatMessages
);

// History is read-only → free
router.get('/history', verifyToken, chatController.getChatHistory);

router.put('/rename', verifyToken, chatController.renameConversation);

router.delete(
  '/delete/:conversation_id',
  verifyToken,
  chatController.deleteConversation
);

// ================================
// PARENT DASHBOARD ROUTES
// ================================
router.get(
  '/dashboard/details/:conversation_id',
  verifyToken,
  chatController.getDashboardChatDetails
);

router.get(
  '/dashboard/student-history/:student_id',
  verifyToken,
  chatController.getDashboardStudentHistory
);

// VERY EXPENSIVE → LOCKED
router.post(
  '/dashboard/generate-paper',
  verifyToken,
  checkSub,
  chatController.generateQuestionPaper
);

// ================================
// ACTIVE SESSIONS
// ================================
router.get('/active-sessions', verifyToken, chatController.getOnlineStudents);
router.post('/dashboard/refresh-summary/:conversation_id', verifyToken ,checkSub ,chatController.refreshChatSummary)
module.exports = router;



// const express = require('express');
// const router = express.Router();
// const chatController = require('../controllers/chatController');
// const {verifyToken, checkConversationOwnership} = require('../middleware/auth');
// const checkSub = require('../middleware/subscriptionGuard'); 
// // --- EXPENSIVE FEATURES (Protect with checkSub) ---

// // 1. Uploads cost storage & processing -> LOCK IT
// router.post('/upload', verifyToken, checkSub, chatController.uploadMiddleware, chatController.handleFileUpload);

// // --- Student Chat Endpoints ---
// router.post('/new', verifyToken, checkSub, chatController.createConversation);
// router.get('/messages/:conversation_id', verifyToken, checkSub, chatController.getChatMessages);

// // History is usually free (Read Only), so no checkSub needed here (optional)
// router.get('/history', verifyToken, chatController.getChatHistory);
// router.put('/rename', verifyToken, chatController.renameConversation);
// router.delete('/delete/:conversation_id', verifyToken, chatController.deleteConversation);

// // --- Parent Dashboard Endpoints ---

// // Viewing stats is free...
// router.get('/dashboard/details/:conversation_id', verifyToken, chatController.getDashboardChatDetails);
// router.get('/dashboard/student-history/:student_id', verifyToken, chatController.getDashboardStudentHistory);

// // ...But generating PDFs is VERY expensive -> LOCK IT
// router.post('/dashboard/generate-paper', verifyToken, checkSub, chatController.generateQuestionPaper);

// // --- NEW: Active Sessions Tracking ---
// router.get('/active-sessions', verifyToken, chatController.getActiveSessions);


// router.post(
//   '/upload', 
//   verifyToken, 
//   chatController.uploadMiddleware, // Multer
//   checkConversationOwnership,
//   chatController.handleFileUpload
// );

// module.exports = router;