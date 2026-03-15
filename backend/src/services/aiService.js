const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Helper to sanitize and truncate messages to prevent crashes 
 * and stay within Groq token limits.
 */
const prepareSafeMessages = (messages) => {
  return messages.map(m => ({
    role: m.role,
    content: typeof m.content === 'string' 
      ? m.content.replace(/[^\x20-\x7E\n\r\t]/g, ' ').slice(0, 12000) 
      : ''
  }));
};


exports.getGroqResponse = async (messages) => {
  try {
    const safeMessages = prepareSafeMessages(messages);

    const chatCompletion = await groq.chat.completions.create({
      messages: safeMessages,
      model: "llama-3.3-70b-versatile",
      temperature: 0, // Keep it at 0 for strictness
      max_tokens: 1024,
    });

    let content = chatCompletion.choices[0]?.message?.content || "";

    // NEW: Robust extraction logic
    // This finds the first '{' and the last '}' and cuts out everything else
    const firstBracket = content.indexOf('{');
    const lastBracket = content.lastIndexOf('}');

    if (firstBracket !== -1 && lastBracket !== -1) {
      return content.substring(firstBracket, lastBracket + 1);
    }

    return content.trim();

  } catch (error) {
    console.error("Groq API Error:", error.message);
    throw new Error("AI Service is currently unavailable.");
  }
};


/**
 * Streaming Response (Live Student Chat)
 */
exports.getGroqStream = async (messages) => {
  try {
    const safeMessages = prepareSafeMessages(messages);

    return await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: safeMessages,
      stream: true, 
      temperature: 0.7,
      max_tokens: 1024,
    });
  } catch (error) {
    console.error("Groq Stream Error:", error.message);
    throw error;
  }
};