const db = require('../config/db');
const { Queue } = require('bullmq');
const multer = require('multer');
const fs = require('fs');
const { redisConfig } = require('../config/redis');
const supabase = require('../config/supabaseStorage');
const aiService = require('../services/aiService');


// --------------------
// FILE UPLOAD HANDLER
// --------------------
// --------------------
// FILE UPLOAD HANDLER (Optimized for Worker Safety)
// --------------------
exports.handleFileUpload = async (req, res) => {
  try {
    const { file } = req;
    const { conversation_id } = req.body;

    if (!file || !conversation_id) {
      return res.status(400).json({ error: 'Missing file or conversation_id' });
    }

    // 1. Generate path for Supabase (Cloud Storage)
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const storagePath = `uploads/${Date.now()}-${sanitizedName}`;

    // 2. Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(storagePath, fs.createReadStream(file.path), {
        contentType: file.mimetype,
        duplex: 'half'
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(storagePath);

    // 3. Store reference in messages table
    await db.query(
      `INSERT INTO messages (conversation_id, user_id, role, content, file_name, file_url, file_path)
       VALUES ($1, $2, 'user', $3, $4, $5, $6)`,
      [conversation_id, req.user.id, `[File Uploaded: ${file.originalname}]`, file.originalname, publicUrl.publicUrl, storagePath]
    );

    // 4. TRIGGER WORKER: Pass the LOCAL path (file.path)
    // IMPORTANT: We DO NOT unlink the file here. The worker does it.
    await documentQueue.add('document-processing', {
      user_id: req.user.id,
      conversation_id,
      filePath: file.path, // Absolute path on the server
      mimetype: file.mimetype,
      originalname: file.originalname
    });

    res.json({
      message: 'File uploaded and processing started',
      name: file.originalname,
      url: publicUrl.publicUrl
    });

  } catch (err) {
    console.error("Upload Error:", err);
    // Cleanup if something failed before the worker took over
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
};

// --------------------
// PRODUCTION READY: SEND MESSAGE
// --------------------
const upload = multer({ dest: 'uploads/' });
exports.uploadMiddleware = upload.single('file');

const documentQueue = new Queue('document-processing', {
  connection: redisConfig
});

const summaryQueue = new Queue('conversation-summary', {
  connection: redisConfig
});

// --------------------
// SEND MESSAGE (THE BRAIN)
// --------------------

// src/controllers/chatController.js

exports.sendMessage = async (req, res) => {
  const { conversation_id, content } = req.body;
  const user_id = req.user.id;
  const io = req.app.get('io');

  try {
    // 1. Save student's current message
    await db.query(
      'INSERT INTO messages (conversation_id, user_id, role, content) VALUES ($1, $2, $3, $4)',
      [conversation_id, user_id, 'user', content]
    );

    if (io) io.to(conversation_id).emit('typing', { isTyping: true });

    // 2. Fetch history for AI context
    const { rows: history } = await db.query(
      `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 50`,
      [conversation_id]
    );

    const aiMessages = [
      { role: "system", content: "You are a helpful educational tutor." },
      ...history.map(m => ({ role: m.role, content: m.content }))
    ];

    // 3. Get AI Response
    const aiResponse = await aiService.getGroqResponse(aiMessages);

    // 4. Save AI Response
    await db.query(
      'INSERT INTO messages (conversation_id, user_id, role, content) VALUES ($1, $2, $3, $4)',
      [conversation_id, user_id, 'assistant', aiResponse]
    );

    if (io) io.to(conversation_id).emit('typing', { isTyping: false });

    // 5. Send ONLY the chat response back
    res.json({ role: 'assistant', content: aiResponse });

  } catch (err) {
    console.error("❌ sendMessage Error:", err);
    if (io) io.to(conversation_id).emit('typing', { isTyping: false });
    res.status(500).json({ error: "Failed to process message" });
  }
};

// --------------------
// ACTIVE STUDENT COUNT
// --------------------
// src/controllers/chatController.js

/**
 * Get initial list of online student IDs for the Parent Dashboard
 */
exports.getOnlineStudents = async (req, res) => {
  try {
    const io = req.app.get('io');
    const onlineIds = [];
    
    if (io) {
      // Iterate through connected sockets to find userIds from handshakes
      for (let [id, socket] of io.of("/").sockets) {
        const uId = socket.handshake.query.userId || (socket.user ? socket.user.id : null);
        if (uId && uId !== 'undefined') {
          onlineIds.push(uId);
        }
      }
    }
    
    // Return unique IDs
    res.json({ onlineIds: [...new Set(onlineIds)] });
  } catch (err) {
    console.error("Error fetching online students:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// --------------------
// DASHBOARD CHAT DETAILS
// (OPTIMIZED: uses summary table)
// --------------------



// --- UPDATED GENERATE QUESTION PAPER ---

// 1. Make sure it says "exports.generateQuestionPaper"
exports.generateQuestionPaper = async (req, res) => {
  const { conversation_ids } = req.body;

  try {
    const chatRes = await db.query(
      `SELECT role, content FROM messages 
       WHERE conversation_id = ANY($1) AND role != 'system'
       ORDER BY created_at ASC`,
      [conversation_ids]
    );

    const transcript = chatRes.rows
      .map(r => `${r.role}: ${r.content}`)
      .join('\n')
      .slice(0, 15000);

    if (!transcript) return res.status(400).json({ error: "No history found." });

    const prompt = [
      { role: 'system', content: 'You are a professional teacher. Generate a formal exam paper based on the transcript. Use bold headings and numbered lists. Do NOT return JSON. Return plain text.' },
      { role: 'user', content: transcript }
    ];

    // Get the response from AI
    const paper = await aiService.getGroqResponse(prompt);

    // FIX: Set the content type to text/plain so the browser knows it's not JSON
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=ExamPaper.txt`);
    
    // Send as raw text
    return res.send(paper); 

  } catch (err) {
    console.error("QP Generation Error:", err);
    res.status(500).send("Failed to generate paper");
  }
};

// 2. Make sure it says "exports.getDashboardChatDetails"
// src/controllers/chatController.js

exports.getDashboardChatDetails = async (req, res) => {
  const { conversation_id } = req.params;

  try {
    console.log(`\n--- 🔍 Fetching Dashboard Details ---`);
    console.log(`Convo ID: ${conversation_id}`);

    // 1. Fetch Chat Messages (Exclude system/technical logs)
    // const messagesRes = await db.query(
    //   `SELECT role, content, created_at 
    //    FROM messages
    //    WHERE conversation_id = $1 AND role != 'system'
    //    ORDER BY created_at ASC`,
    //   [conversation_id]
    // );

    // 2. Fetch the AI Analysis from our summary table
    const summaryRes = await db.query(
      `SELECT summary, curiosity, mastery, question_count, last_updated
       FROM conversation_summaries
       WHERE conversation_id = $1`,
      [conversation_id]
    );

    // 3. LOG FOR DEBUGGING (Check your terminal!)
    if (summaryRes.rows.length > 0) {
      console.log(`✅ Analysis found in DB for ${conversation_id}`);
    } else {
      console.log(`⚠️ No analysis found for ${conversation_id}. Returning placeholders.`);
    }

    // 4. Return the data
    res.json({
      //messages: messagesRes.rows,
      // If the row exists, we send it. 
      // If not (e.g., chat just started), we send placeholders.
      analysis: summaryRes.rows[0] || {
        summary: 'No messages exchanged yet. Summary will appear after the first chat.',
        curiosity: 'Pending', 
        mastery: 'Pending',
        question_count: 0
      }
    });

  } catch (err) {
    console.error("❌ Dashboard Details Error:", err.message);
    res.status(500).json({ error: "Failed to load chat details" });
  }
};

// --------------------
// CHAT HISTORY
// --------------------
exports.getChatHistory = async (req, res) => {
  const user_id = req.user.id;
  const result = await db.query(
    'SELECT id, title, created_at FROM conversations WHERE user_id = $1 ORDER BY created_at DESC',
    [user_id]
  );
  res.json(result.rows);
};

// --------------------
// CHAT MESSAGES
// --------------------
// --------------------
// CHAT MESSAGES (Filtered for Student UI)
// --------------------
exports.getChatMessages = async (req, res) => {
  const { conversation_id } = req.params;

  try {
    // We explicitly exclude 'system' messages so the student doesn't see 
    // the raw technical text extracted from files.
    const result = await db.query(
      `SELECT role, content, created_at, file_url 
       FROM messages 
       WHERE conversation_id = $1 AND role != 'system'
       ORDER BY created_at ASC`,
      [conversation_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
};
// --------------------
// CREATE CONVERSATION
// --------------------
exports.createConversation = async (req, res) => {
  const user_id = req.user.id;
  const { title } = req.body;

  const result = await db.query(
    'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *',
    [user_id, title || 'New Chat']
  );

  res.status(201).json(result.rows[0]);
};

// --------------------
// RENAME CONVERSATION
// --------------------
exports.renameConversation = async (req, res) => {
  const { conversation_id, new_title } = req.body;
  const user_id = req.user.id;

  const result = await db.query(
    'UPDATE conversations SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [new_title, conversation_id, user_id]
  );

  if (!result.rows.length) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.json(result.rows[0]);
};

// --------------------
// DELETE CONVERSATION
// --------------------
exports.deleteConversation = async (req, res) => {
  const { conversation_id } = req.params;
  const user_id = req.user.id;

  const result = await db.query(
    'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
    [conversation_id, user_id]
  );

  if (!result.rows.length) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.json({ message: 'Deleted' });
};

// --------------------
// PARENT: STUDENT HISTORY
// --------------------
exports.getDashboardStudentHistory = async (req, res) => {
  const { student_id } = req.params;

  const result = await db.query(
    'SELECT id, title, created_at FROM conversations WHERE user_id = $1 ORDER BY created_at DESC',
    [student_id]
  );

  res.json(result.rows);
};

exports.getOnlineStudents = async (req, res) => {
  try {
    const io = req.app.get('io');
    // Get all connected user IDs from the socket handshake
    const onlineIds = [];
    if (io) {
      for (let [id, socket] of io.of("/").sockets) {
        if (socket.handshake.query.userId) {
          onlineIds.push(socket.handshake.query.userId);
        }
      }
    }
    res.json({ onlineIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.refreshChatSummary = async (req, res) => {
  const { conversation_id } = req.params;
  const user_id = req.user.id;

  try {
    // 1. Fetch entire data from messages table
    const { rows: history } = await db.query(
      `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversation_id]
    );

    if (history.length === 0) {
      return res.status(404).json({ error: "No messages found to summarize." });
    }

    // 2. Prepare transcript for AI
    const transcript = history.map(r => `${r.role}: ${r.content}`).join('\n');
    const qCount = (transcript.match(/\?/g) || []).length;

    // 3. Send to AI for summary
    const summaryPrompt = [
      { role: 'system', content: 'Return ONLY JSON: {"summary": "...", "curiosity": "High", "mastery": "Low"}' },
      { role: 'user', content: `Summarize this learning session:\n${transcript}` }
    ];

    const rawSummary = await aiService.getGroqResponse(summaryPrompt);
    const parsed = JSON.parse(rawSummary.substring(rawSummary.indexOf('{'), rawSummary.lastIndexOf('}') + 1));

    // 4. Store/Update in conversation_summaries table
    const result = await db.query(`
      INSERT INTO conversation_summaries 
      (conversation_id, user_id, summary, curiosity, mastery, question_count, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (conversation_id) DO UPDATE SET
        summary = EXCLUDED.summary,
        curiosity = EXCLUDED.curiosity,
        mastery = EXCLUDED.mastery,
        question_count = EXCLUDED.question_count,
        last_updated = NOW()
      RETURNING *`,
      [conversation_id, user_id, parsed.summary, parsed.curiosity, parsed.mastery, qCount]
    );

    // 5. Give the latest reviews to frontend
    res.json(result.rows[0]);

  } catch (err) {
    console.error("Refresh Summary Error:", err.message);
    res.status(500).json({ error: "Failed to update summary" });
  }
};