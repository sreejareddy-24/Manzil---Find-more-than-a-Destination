const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { authenticateUser } = require('../middleware/auth');
const { runMatchingForUser } = require('../services/matchingEngine');
const { logger } = require('../utils/logger');

/**
 * GET /api/opportunities
 * Get opportunities with optional filters
 */
router.get('/', authenticateUser, async (req, res) => {
  const {
    type,
    search,
    page = 1,
    limit = 20,
    sort = 'posted_date',
    order = 'desc'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin
    .from('opportunities')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + parseInt(limit) - 1);

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    logger.error('Opportunities fetch error', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch opportunities' });
  }

  res.json({
    opportunities: data || [],
    total: count || 0,
    page: parseInt(page),
    totalPages: Math.ceil((count || 0) / parseInt(limit))
  });
});

/**
 * GET /api/opportunities/matches
 * Get matched opportunities for current user
 */
router.get('/matches', authenticateUser, async (req, res) => {
  const { type, page = 1, limit = 10, min_score = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin
    .from('user_matches')
    .select(`
      *,
      opportunities (*)
    `, { count: 'exact' })
    .eq('user_id', req.user.id)
    .gte('match_score', parseInt(min_score))
    .order('match_score', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Matches fetch error', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }

  // Filter by type if provided
  let filteredData = data || [];
  if (type && type !== 'all') {
    filteredData = filteredData.filter(m => m.opportunities?.type === type);
  }

  res.json({
    matches: filteredData,
    total: count || 0,
    page: parseInt(page),
    totalPages: Math.ceil((count || 0) / parseInt(limit))
  });
});

/**
 * GET /api/opportunities/:id
 * Get single opportunity with match data
 */
router.get('/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;

  const { data: opportunity, error } = await supabaseAdmin
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !opportunity) {
    return res.status(404).json({ error: 'Opportunity not found' });
  }

  // Get match data for this user
  const { data: matchData } = await supabaseAdmin
    .from('user_matches')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('opportunity_id', id)
    .single();

  res.json({ opportunity, matchData: matchData || null });
});

/**
 * POST /api/opportunities/refresh-matches
 * Trigger re-matching for current user
 */
router.post('/refresh-matches', authenticateUser, async (req, res) => {
  try {
    const matches = await runMatchingForUser(req.user.id, true);
    res.json({
      success: true,
      matched: matches.length,
      message: `Found ${matches.length} matching opportunities`
    });
  } catch (error) {
    logger.error('Matching error', { error: error.message });
    res.status(500).json({ error: 'Failed to refresh matches' });
  }
});

/**
 * POST /api/opportunities/:id/save
 * Save/unsave an opportunity
 */
router.post('/:id/save', authenticateUser, async (req, res) => {
  const { id } = req.params;

  const { data: existing } = await supabaseAdmin
    .from('user_matches')
    .select('is_saved')
    .eq('user_id', req.user.id)
    .eq('opportunity_id', id)
    .single();

  const newSavedState = !existing?.is_saved;

  await supabaseAdmin
    .from('user_matches')
    .upsert({
      user_id: req.user.id,
      opportunity_id: id,
      is_saved: newSavedState,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,opportunity_id' });

  res.json({ saved: newSavedState });
});

/**
 * GET /api/opportunities/saved/list
 * Get saved opportunities
 */
router.get('/saved/list', authenticateUser, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_matches')
    .select('*, opportunities(*)')
    .eq('user_id', req.user.id)
    .eq('is_saved', true)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch saved opportunities' });

  res.json({ saved: data || [] });
});

/**
 * POST /api/opportunities/:id/apply
 * Track application
 */
router.post('/:id/apply', authenticateUser, async (req, res) => {
  const { id } = req.params;

  await supabaseAdmin
    .from('applications')
    .upsert({
      user_id: req.user.id,
      opportunity_id: id,
      status: 'applied',
      applied_at: new Date().toISOString()
    }, { onConflict: 'user_id,opportunity_id' });

  res.json({ success: true, message: 'Application tracked' });
});

/**
 * GET /api/opportunities/applications/list
 * Get user applications
 */
router.get('/applications/list', authenticateUser, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, opportunities(*)')
    .eq('user_id', req.user.id)
    .order('applied_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch applications' });

  res.json({ applications: data || [] });
});

module.exports = router;
