const supabase = require('../config/supabase');
const { extractText } = require('../utils/textExtractors');
const documentWorker = require('../workers/documentWorker');

exports.upload = async (req, res) => {
  const file = req.file;
  const path = `${Date.now()}-${file.originalname}`;

  await supabase.storage
    .from('uploads')
    .upload(path, file.buffer);

  const text = await extractText(file);

  await documentWorker({
    user_id: req.user.id,
    conversation_id: req.body.conversation_id,
    text,
    file_name: file.originalname
  });

  res.json({ success: true });
};
