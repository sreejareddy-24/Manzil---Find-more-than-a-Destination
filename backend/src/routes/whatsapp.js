const express = require('express');
const router = express.Router();
const { processWhatsAppMessage } = require('../services/whatsapp');
const { logger } = require('../utils/logger');

/**
 * GET /webhook/whatsapp - Webhook verification
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('WhatsApp webhook verification failed', { mode, token });
  return res.status(403).json({ error: 'Forbidden' });
});

/**
 * POST /webhook/whatsapp - Receive messages
 */
router.post('/', async (req, res) => {
  // Always respond 200 immediately to WhatsApp
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle messages
    if (value?.messages?.length > 0) {
      const message = value.messages[0];
      const phoneNumber = message.from;
      const contact = value.contacts?.[0];

      logger.info('Received WhatsApp message', {
        from: phoneNumber,
        type: message.type,
        name: contact?.profile?.name
      });

      // Handle text messages
      if (message.type === 'text') {
        const text = message.text?.body || '';
        await processWhatsAppMessage(phoneNumber, text);
      }
      // Handle document (PDF resume)
      else if (message.type === 'document') {
        const mediaId = message.document?.id;
        const mimeType = message.document?.mime_type;
        if (mediaId) {
          await processWhatsAppMessage(phoneNumber, 'resume_upload', mediaId);
        }
      }
      // Handle image (image resume)
      else if (message.type === 'image') {
        const mediaId = message.image?.id;
        if (mediaId) {
          await processWhatsAppMessage(phoneNumber, 'resume_upload', mediaId);
        }
      }
      // Handle interactive responses
      else if (message.type === 'interactive') {
        const response = message.interactive?.list_reply?.id ||
          message.interactive?.button_reply?.id || '';
        await processWhatsAppMessage(phoneNumber, response);
      }
    }

    // Handle status updates
    if (value?.statuses?.length > 0) {
      value.statuses.forEach(status => {
        logger.debug('Message status update', {
          id: status.id,
          status: status.status,
          to: status.recipient_id
        });
      });
    }

  } catch (error) {
    logger.error('Error processing WhatsApp webhook', { error: error.message, stack: error.stack });
  }
});

module.exports = router;
