const { Worker } = require('bullmq');
const db = require('../config/db');
const aiService = require('../services/aiService');
const { redisConfig } = require('../config/redis');

console.log('📊 Summary Worker: Listening for Jobs...');

const worker = new Worker('conversation-summary', async (job) => {
  const { conversation_id, user_id, transcript } = job.data;
  
  try {
    if (!transcript || transcript.length < 5) return;

    // 1. AI Analysis
    const prompt = [
      { 
        role: 'system', 
        content: `Analyze the student's progress. Return ONLY JSON:
        { "summary": "2-sentence update", "curiosity": "Low|Medium|High", "mastery": "Low|Medium|High" }` 
      },
      { role: 'user', content: transcript }
    ];

    const rawResponse = await aiService.getGroqResponse(prompt);

    // 2. Extract JSON safely
    const start = rawResponse.indexOf('{');
    const end = rawResponse.lastIndexOf('}');
    if (start === -1) throw new Error("Invalid AI JSON");
    const parsed = JSON.parse(rawResponse.substring(start, end + 1));

    // 3. Stats
    const qCount = (transcript.match(/\?/g) || []).length;

    // 4. DB Upsert (Update if exists, Insert if new)
    const upsertQuery = `
      INSERT INTO conversation_summaries 
      (conversation_id, user_id, summary, curiosity, mastery, question_count, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (conversation_id) DO UPDATE SET
      summary = EXCLUDED.summary,
      curiosity = EXCLUDED.curiosity,
      mastery = EXCLUDED.mastery,
      question_count = EXCLUDED.question_count,
      last_updated = NOW()`;

    await db.query(upsertQuery, [
      conversation_id, user_id, parsed.summary, 
      parsed.curiosity, parsed.mastery, qCount
    ]);

    console.log(`✨ Summary Updated for Convo: ${conversation_id}`);

  } catch (err) {
    console.error(`❌ Worker Job ${job.id} Error:`, err.message);
  }
}, { 
  connection: redisConfig,
  concurrency: 5 
});

module.exports = worker;