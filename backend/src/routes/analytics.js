const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabase');
const { authenticateUser } = require('../middleware/auth');

/**
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  const [profile, matches, applications, recentMatches] = await Promise.all([
    supabaseAdmin.from('profiles').select('career_score, skill_score, profile_completeness, missing_skills, strengths, target_roles').eq('user_id', userId).single(),
    supabaseAdmin.from('user_matches').select('match_score, created_at', { count: 'exact' }).eq('user_id', userId),
    supabaseAdmin.from('applications').select('status, applied_at', { count: 'exact' }).eq('user_id', userId),
    supabaseAdmin.from('user_matches').select('*, opportunities(title, company, type)').eq('user_id', userId).order('match_score', { ascending: false }).limit(5)
  ]);

  const matchScores = (matches.data || []).map(m => m.match_score || 0);
  const avgScore = matchScores.length ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length) : 0;

  // Match score distribution
  const distribution = {
    excellent: matchScores.filter(s => s >= 80).length,
    good: matchScores.filter(s => s >= 60 && s < 80).length,
    fair: matchScores.filter(s => s >= 40 && s < 60).length,
    low: matchScores.filter(s => s < 40).length
  };

  res.json({
    profile: profile.data,
    stats: {
      total_matches: matches.count || 0,
      total_applications: applications.count || 0,
      avg_match_score: avgScore,
      distribution
    },
    recent_matches: recentMatches.data || [],
    applications_by_status: categorizeApplications(applications.data || [])
  });
});

/**
 * GET /api/analytics/skill-gaps
 */
router.get('/skill-gaps', authenticateUser, async (req, res) => {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('skills, missing_skills, career_suggestions, target_roles')
    .eq('user_id', req.user.id)
    .single();

  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  // Get most commonly required skills from missed opportunities
  const { data: missedSkills } = await supabaseAdmin
    .from('user_matches')
    .select('missing_skills')
    .eq('user_id', req.user.id)
    .limit(50);

  const skillFrequency = {};
  (missedSkills || []).forEach(m => {
    (m.missing_skills || []).forEach(skill => {
      skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
    });
  });

  const topMissingSkills = Object.entries(skillFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, frequency: count }));

  res.json({
    current_skills: profile.skills || [],
    missing_skills: profile.missing_skills || [],
    top_missing_skills: topMissingSkills,
    career_suggestions: profile.career_suggestions || [],
    target_roles: profile.target_roles || []
  });
});

/**
 * GET /api/analytics/trend
 */
router.get('/trend', authenticateUser, async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabaseAdmin
    .from('user_matches')
    .select('match_score, created_at')
    .eq('user_id', req.user.id)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  // Group by week
  const weeklyData = {};
  (data || []).forEach(m => {
    const week = getWeekLabel(new Date(m.created_at));
    if (!weeklyData[week]) weeklyData[week] = { scores: [], count: 0 };
    weeklyData[week].scores.push(m.match_score);
    weeklyData[week].count++;
  });

  const trend = Object.entries(weeklyData).map(([week, data]) => ({
    week,
    avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
    count: data.count
  }));

  res.json({ trend });
});

function categorizeApplications(applications) {
  const statuses = {};
  applications.forEach(app => {
    statuses[app.status] = (statuses[app.status] || 0) + 1;
  });
  return statuses;
}

function getWeekLabel(date) {
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  return `${month} ${day}`;
}

module.exports = router;
