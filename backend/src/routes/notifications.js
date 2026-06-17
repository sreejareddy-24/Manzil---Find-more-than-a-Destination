const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { authenticateUser } = require('../middleware/auth');

/**
 * GET /api/notifications/settings
 */
router.get('/settings', authenticateUser, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('users')
    .select('notification_enabled, notification_time, notification_types')
    .eq('id', req.user.id)
    .single();

  res.json({
    enabled: data?.notification_enabled ?? true,
    time: data?.notification_time || '09:00',
    types: data?.notification_types || ['job', 'internship', 'hackathon', 'scholarship', 'fellowship']
  });
});

/**
 * PUT /api/notifications/settings
 */
router.put('/settings', authenticateUser, async (req, res) => {
  const { enabled, time, types } = req.body;

  await supabaseAdmin
    .from('users')
    .update({
      notification_enabled: enabled,
      notification_time: time,
      notification_types: types
    })
    .eq('id', req.user.id);

  res.json({ success: true });
});

/**
 * GET /api/notifications/history
 */
router.get('/history', authenticateUser, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('user_matches')
    .select('*, opportunities(title, company, type)')
    .eq('user_id', req.user.id)
    .eq('is_notified', true)
    .order('notified_at', { ascending: false })
    .limit(20);

  res.json({ notifications: data || [] });
});

/**
 * POST /api/notifications/test
 * Send test notification
 */
router.post('/test', authenticateUser, async (req, res) => {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('phone')
    .eq('id', req.user.id)
    .single();

  if (!user?.phone) {
    return res.status(400).json({ error: 'No phone number on file. Link your WhatsApp first.' });
  }

  const { sendWhatsAppMessage } = require('../services/whatsapp');
  const result = await sendWhatsAppMessage(
    user.phone,
    `✅ *Test Notification*\n\nYour CareerMate AI notifications are working correctly!\n\nYou'll receive daily opportunity recommendations at your set time.\n\n🌐 Dashboard: ${process.env.FRONTEND_URL}`
  );

  if (result.success) {
    res.json({ success: true, message: 'Test notification sent to your WhatsApp' });
  } else {
    res.status(500).json({ error: 'Failed to send test notification. Check WhatsApp settings.' });
  }
});

module.exports = router;
