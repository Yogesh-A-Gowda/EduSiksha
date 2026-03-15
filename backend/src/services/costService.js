const db = require('../config/db');

exports.track = async (user_id, tokens) => {
  const cost = (tokens / 1000) * 0.002;
  await db.query(
    'INSERT INTO token_usage (user_id, tokens, cost) VALUES ($1,$2,$3)',
    [user_id, tokens, cost]
  );
};
