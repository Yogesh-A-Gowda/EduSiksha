const aiService = require('./aiService');

exports.embed = async (text) => {
  return await aiService.getEmbedding(text);
};
