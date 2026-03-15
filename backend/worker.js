require('dotenv').config();
const { Worker } = require('bullmq');
const { redisConfig } = require('./src/config/redis'); // Use config, not the client instance
const { Emitter } = require("@socket.io/redis-emitter");
const Redis = require('ioredis');
const aiService = require('./src/services/aiService');
const db = require('./src/config/db');

// Initialize the Emitter (This is the bridge to Socket.io)
const redisConnection = new Redis(redisConfig);
const emitter = new Emitter(redisConnection);

console.log("👷 Background Worker Started...");

const worker = new Worker('pdf-generation', async (job) => {
  console.log(`[Job ${job.id}] Processing PDF generation...`);
  const { user_id, conversation_ids } = job.data;

  try {
    // 1. Fetch Chat Data
    const result = await db.query(
      'SELECT content, role FROM messages WHERE conversation_id = ANY($1) ORDER BY created_at ASC',
      [conversation_ids]
    );

    if (result.rows.length === 0) throw new Error("No messages found");
    const contextText = result.rows.map(r => `${r.role}: ${r.content}`).join("\n");
    
    // 2. AI Generation
    const prompt = [
        { role: "system", content: "Generate a comprehensive Question Paper based on this chat history." },
        { role: "user", content: contextText }
    ];
    const pdfContent = await aiService.getGroqResponse(prompt);

    // 3. Save to DB
    await db.query(
        'INSERT INTO notifications (user_id, title, content, is_read) VALUES ($1, $2, $3, $4)',
        [user_id, 'Question Paper Ready', `Here is your content: \n\n${pdfContent.substring(0, 200)}...`, false]
    );

    // 4. FIX: Use Emitter instead of 'io'
    // This sends the popup signal through Redis to your API server
    emitter.to(`user_${user_id}`).emit('notification_received', {
        title: 'Question Paper Ready',
        message: 'Your document has been processed.'
    });

    console.log(`[Job ${job.id}] Completed and Notification Sent.`);
    return { status: 'success' };

  } catch (err) {
    console.error(`[Job ${job.id}] Failed:`, err);
    throw err;
  }
}, { 
  connection: redisConfig, // BullMQ needs the config object here
  concurrency: 5 
});