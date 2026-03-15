const jwt = require('jsonwebtoken');
const db = require('./config/db');
const aiService = require('./services/aiService');
const axios = require('axios');

const activeUserIds = new Set(); 

module.exports = (io) => {
  // 1. AUTHENTICATION MIDDLEWARE
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Invalid token'));
      socket.user = decoded; 
      next();
    });
  });

  io.on('connection', (socket) => {
    // 2. PRESENCE LOGIC (Blinking dots)
    const userId = socket.handshake.query.userId || socket.user.id;
    
    if (userId && userId !== 'undefined') {
      activeUserIds.add(userId);
      console.log(`👤 User Connected: ${userId}. Total Active: ${activeUserIds.size}`);
      io.emit('presence_update', Array.from(activeUserIds));
    }

    // 3. JOIN CONVERSATION
    socket.on('join_conversation', (id) => socket.join(id));

    // 4. CHAT & AI LOGIC
    socket.on('send_message', async (data) => {
      const { conversation_id, content, displayContent } = data;
      let aiProcessedContent = content;

      try {
        // File Context Handling
        if (content.includes('[CONTEXT_FILE:')) {
          const fileMatch = content.match(/\[CONTEXT_FILE:\s*(.*?)\]/);
          if (fileMatch) {
            const fileName = fileMatch[1];
            const fileData = await db.query(
              'SELECT content, file_url FROM messages WHERE conversation_id = $1 AND content LIKE $2 LIMIT 1',
              [conversation_id, `%${fileName}%`]
            );

            if (fileData.rows.length > 0) {
              const fileUrl = fileData.rows[0].file_url || content.match(/\((https:\/\/.*?)\)/)?.[1];
              if (fileUrl) {
                const response = await axios.get(fileUrl);
                const extractedText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                aiProcessedContent = `User is asking about a file.\nFile Name: ${fileName}\nFile Content:\n${extractedText}\n\nUser Question: ${content}`;
              }
            }
          }
        }

        // SAVE USER MESSAGE
        const userMsg = await db.query(
          'INSERT INTO messages (conversation_id, role, content, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
          [conversation_id, 'user', displayContent || content, socket.user.id]
        );

        socket.emit('message_sent', userMsg.rows[0]);

        // FETCH HISTORY FOR AI
        const historyRes = await db.query(
          'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 10',
          [conversation_id]
        );

        let messagesForAI = historyRes.rows.map(m => ({ 
          role: m.role, 
          // Crucial: Sanitize junk characters before sending to Groq
          content: m.content.replace(/[^\x20-\x7E\n\r\t]/g, ' ') 
        }));
        
        if (messagesForAI.length > 0) {
          messagesForAI[messagesForAI.length - 1].content = aiProcessedContent;
        }

        messagesForAI.unshift({ 
          role: "system", 
          content: "You are EDU-AI. Use the provided context to answer the student accurately." 
        });

        // STREAM FROM AI
        const stream = await aiService.getGroqStream(messagesForAI);
        let fullAIContent = "";

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            fullAIContent += delta;
            io.to(conversation_id).emit('ai_stream_chunk', { conversation_id, content: delta });
          }
        }

        // SAVE ASSISTANT MESSAGE
        const aiMsg = await db.query(
          'INSERT INTO messages (conversation_id, role, content, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
          [conversation_id, 'assistant', fullAIContent, socket.user.id]
        );

        io.to(conversation_id).emit('receive_message', aiMsg.rows[0]);

      } catch (err) {
        console.error("Socket Error:", err.message);
        socket.emit('error', { message: "AI failed to respond.", details: err.message });
      }
    });

    // 5. DISCONNECT LOGIC
    socket.on('disconnect', () => {
      if (userId) {
        activeUserIds.delete(userId);
        io.emit('presence_update', Array.from(activeUserIds));
      }
    });
  });
};