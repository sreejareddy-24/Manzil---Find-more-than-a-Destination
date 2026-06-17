const pdf = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { logger } = require('../utils/logger');
const path = require('path');
const sharp = require('sharp');

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdf(buffer);
    const text = data.text.trim();

    if (text.length > 50) {
      logger.info(`PDF text extracted: ${text.length} characters`);
      return { text, method: 'pdf-parse', pages: data.numpages };
    }

    // If text is too short, it might be a scanned PDF - try OCR
    logger.info('PDF text too short, attempting OCR');
    return await extractTextWithOCR(buffer);
  } catch (error) {
    logger.error('PDF parse error, attempting OCR', { error: error.message });
    return extractTextWithOCR(buffer);
  }
}

/**
 * Extract text using Tesseract OCR
 */
async function extractTextWithOCR(buffer) {
  const worker = await createWorker('eng');

  try {
    // Convert PDF to image using sharp (for image-based PDFs)
    let imageBuffer;
    try {
      imageBuffer = await sharp(buffer)
        .png()
        .toBuffer();
    } catch {
      // If not an image, use raw buffer
      imageBuffer = buffer;
    }

    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();

    logger.info(`OCR text extracted: ${text.length} characters`);
    return { text: text.trim(), method: 'ocr', pages: 1 };
  } catch (error) {
    await worker.terminate();
    logger.error('OCR extraction failed', { error: error.message });
    return { text: '', method: 'failed', pages: 0 };
  }
}

/**
 * Validate uploaded file
 */
function validateResumeFile(file) {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type. Please upload PDF, DOC, DOCX, or image files.' };
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' };
  }

  return { valid: true };
}

/**
 * Extract text from image buffer using OCR
 */
async function extractTextFromImage(buffer) {
  const worker = await createWorker('eng');

  try {
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return { text: text.trim(), method: 'ocr' };
  } catch (error) {
    await worker.terminate();
    logger.error('Image OCR failed', { error: error.message });
    return { text: '', method: 'failed' };
  }
}

module.exports = {
  extractTextFromPDF,
  extractTextFromImage,
  validateResumeFile,
  extractTextWithOCR
};
