require('dotenv').config();
const { Worker } = require('bullmq');
const fs = require('fs');
const officeParser = require('officeparser');
const Tesseract = require('tesseract.js');
const db = require('../config/db');
const { redisConfig } = require('../config/redis');

console.log('🚀 Hardened Document Worker (Clean Text + OCR) Started');

async function updateProcessingStatus(conversationId, status) {
    try {
        console.log(`[Status Update] Conversation ${conversationId}: ${status}`);
    } catch (err) {
        console.error("Failed to update status:", err);
    }
}

new Worker(
    'document-processing',
    async (job) => {
        const { conversation_id, filePath, mimetype, originalname } = job.data;
        let extractedText = '';

        try {
            if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

            await updateProcessingStatus(conversation_id, 'processing');
            const mimeLower = mimetype.toLowerCase();

            // 1. EXTRACTION LOGIC
            if (mimeLower.includes('image')) {
                await updateProcessingStatus(conversation_id, 'ocr_in_progress');
                // We use Buffer for Tesseract to avoid path/permission issues
                const imageBuffer = fs.readFileSync(filePath);
                const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
                extractedText = text;
            } 
            else if (mimeLower.includes('text/plain') || originalname.endsWith('.txt')) {
                await updateProcessingStatus(conversation_id, 'extracting_text');
                extractedText = fs.readFileSync(filePath, 'utf-8');
            } 
            else {
                await updateProcessingStatus(conversation_id, 'extracting_text');
                // officeParser handles: PDF, DOCX, XLSX, PPTX
                extractedText = await officeParser.parseOfficeAsync(filePath);
            }

            // 2. THE "BOX CHARACTER" FIX (Aggressive Sanitization)
            if (extractedText && extractedText.trim().length > 0) {
                const sanitizedText = extractedText
                    .replace(/\0/g, '') // Remove null bytes
                    // ONLY keep printable ASCII, newlines, and tabs. 
                    // This kills the "box" characters.
                    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') 
                    .replace(/\s+/g, ' ') // Collapse multiple spaces
                    .trim();

                if (sanitizedText.length === 0) throw new Error("Document content was unreadable noise.");

                // 3. SAVE TO NEONDB
                await db.query(
                    `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'system', $2)`,
                    [
                        conversation_id, 
                        `Document "${originalname}" content:\n${sanitizedText.slice(0, 7500)}` 
                    ]
                );

                await updateProcessingStatus(conversation_id, 'completed');
                console.log(`✅ Success: ${originalname}`);
            } else {
                throw new Error("No readable text found.");
            }

        } catch (error) {
            console.error(`❌ Worker Error [${originalname}]:`, error.message);
            await updateProcessingStatus(conversation_id, 'error');
            
            await db.query(
                `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'system', $2)`,
                [conversation_id, `⚠️ Error: Could not read "${originalname}". Format may be unsupported.`]
            );
        } finally {
            // 4. CLEANUP (Always delete the local temp file)
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    console.error("Cleanup failed:", err);
                }
            }
        }
    },
    { 
        connection: redisConfig,
        concurrency: 2 // Limits CPU usage for OCR tasks
    }
);