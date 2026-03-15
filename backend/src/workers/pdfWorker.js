const { Worker } = require('bullmq');
const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const ExcelJS = require('exceljs');
const db = require('../config/db');
const Redis = require('ioredis');
const { redisConfig } = require('../config/redis');

const worker = new Worker('document-processing', async (job) => {
  const { user_id, filePath, originalname, mimetype, conversation_id } = job.data;

  try {
    const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${filePath}`;
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    let extractedText = "";

    if (mimetype === 'application/pdf') {
      const data = await pdf(buffer);
      extractedText = data.text;
    } 
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } 
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || originalname.endsWith('.xlsx')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          const rowData = row.values.filter(val => val !== null && val !== undefined).join(' ');
          extractedText += rowData + '\n';
        });
      });
    }
    else if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    }

    if (!extractedText.trim()) {
      throw new Error("Extraction failed: No text found in file.");
    }

    await db.query(
      'INSERT INTO messages (conversation_id, role, content, user_id, file_content) VALUES ($1, $2, $3, $4, $5)',
      [conversation_id, 'system', `Processed content for ${originalname}`, user_id, extractedText]
    );

  } catch (err) {
    console.error("Worker Parsing Error:", err.message);
  }
}, { connection: new Redis(redisConfig) });