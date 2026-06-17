const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { authenticateUser } = require('../middleware/auth');
const { generateCareerRoadmap } = require('../services/gemini');
const { logger } = require('../utils/logger');

/**
 * GET /api/profile
 */
router.get('/', authenticateUser, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json({ profile: data });
});

/**
 * PUT /api/profile
 */
router.put('/', authenticateUser, async (req, res) => {
  const allowedFields = [
    'name', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio',
    'summary', 'skills', 'target_roles', 'career_level', 'notification_enabled'
  ];

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to update profile' });

  res.json({ profile: data });
});

/**
 * POST /api/profile/roadmap
 * Generate career roadmap for a target role
 */
router.post('/roadmap', authenticateUser, async (req, res) => {
  const { targetRole } = req.body;

  if (!targetRole) {
    return res.status(400).json({ error: 'Target role is required' });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (!profile) {
    return res.status(404).json({ error: 'Please upload your resume first' });
  }

  try {
    const roadmap = await generateCareerRoadmap(profile, targetRole);

    // Save roadmap to profile
    await supabaseAdmin
      .from('profiles')
      .update({ roadmap: roadmap.phases, target_roles: [targetRole, ...(profile.target_roles || []).slice(0, 2)] })
      .eq('user_id', req.user.id);

    res.json({ roadmap });
  } catch (error) {
    logger.error('Roadmap generation error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

/**
 * GET /api/profile/stats
 */
router.get('/stats', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  const [profileRes, matchesRes, applicationsRes, savedRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('career_score, skill_score, profile_completeness').eq('user_id', userId).single(),
    supabaseAdmin.from('user_matches').select('match_score', { count: 'exact' }).eq('user_id', userId),
    supabaseAdmin.from('applications').select('id', { count: 'exact' }).eq('user_id', userId),
    supabaseAdmin.from('user_matches').select('id', { count: 'exact' }).eq('user_id', userId).eq('is_saved', true)
  ]);

  const profile = profileRes.data;
  const matches = matchesRes.data || [];
  const avgMatchScore = matches.length
    ? Math.round(matches.reduce((sum, m) => sum + (m.match_score || 0), 0) / matches.length)
    : 0;

  res.json({
    career_score: profile?.career_score || 0,
    skill_score: profile?.skill_score || 0,
    profile_completeness: profile?.profile_completeness || 0,
    total_matches: matchesRes.count || 0,
    total_applications: applicationsRes.count || 0,
    total_saved: savedRes.count || 0,
    avg_match_score: avgMatchScore
  });
});

/**
 * DELETE /api/profile
 */
router.delete('/', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
  await supabaseAdmin.from('user_matches').delete().eq('user_id', userId);
  await supabaseAdmin.from('applications').delete().eq('user_id', userId);
  await supabaseAdmin.from('conversations').delete().eq('user_id', userId);

  // Delete from auth
  await supabaseAdmin.auth.admin.deleteUser(userId);

  res.json({ success: true, message: 'Account deleted' });
});

module.exports = router;
