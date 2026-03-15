// Using a simple object for structure reference, 
// or you could use a library like Joi/Zod here.
const messageSchema = {
  conversation_id: "uuid (required)",
  role: "user' or 'assistant' (required)",
  content: "text (required)"
};

module.exports = { messageSchema };