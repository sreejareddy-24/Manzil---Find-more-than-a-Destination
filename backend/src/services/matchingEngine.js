const { supabaseAdmin } = require('../utils/supabase');
const { generateMatchAnalysis } = require('./gemini');
const { logger } = require('../utils/logger');

/**
 * Calculate basic match score without AI (fast)
 */
function calculateBasicMatchScore(profile, opportunity) {
  const profileSkills = new Set(
    (profile.skills || []).map(s => s.toLowerCase())
  );
  const oppSkills = (opportunity.required_skills || []).map(s => s.toLowerCase());

  let score = 0;
  const skillOverlap = [];
  const missingSkills = [];

  // Skill match (40 points)
  if (oppSkills.length > 0) {
    oppSkills.forEach(skill => {
      if (profileSkills.has(skill)) {
        score += 40 / oppSkills.length;
        skillOverlap.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });
  } else {
    score += 25; // Partial credit if no required skills listed
  }

  // Career level match (20 points)
  const levelMap = { fresher: 1, junior: 2, mid: 3, senior: 4, lead: 5 };
  const userLevel = levelMap[profile.career_level] || 1;
  const oppLevel = levelMap[opportunity.career_level] || 1;

  if (userLevel >= oppLevel) score += 20;
  else if (userLevel === oppLevel - 1) score += 10;

  // Education match (15 points)
  const userDegree = profile.education?.[0]?.degree?.toLowerCase() || '';
  const oppDesc = (opportunity.description || '').toLowerCase();

  if (oppDesc.includes(userDegree) || !oppDesc.includes('degree')) score += 15;
  else if (oppDesc.includes('bachelor') && userDegree) score += 10;

  // Type preference (15 points)
  if (profile.career_level === 'fresher' && ['internship', 'apprenticeship', 'hackathon'].includes(opportunity.type)) {
    score += 15;
  } else if (profile.career_level !== 'fresher' && opportunity.type === 'job') {
    score += 15;
  } else {
    score += 7;
  }

  // Content overlap (10 points)
  const profileText = [
    ...(profile.skills || []),
    ...(profile.target_roles || []),
    profile.education?.[0]?.field || ''
  ].join(' ').toLowerCase();

  const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase();
  const words = profileText.split(/\s+/).filter(w => w.length > 3);
  const matchCount = words.filter(w => oppText.includes(w)).length;

  score += Math.min(10, (matchCount / Math.max(words.length, 1)) * 10);

  return {
    match_score: Math.round(Math.min(100, Math.max(0, score))),
    skill_overlap: skillOverlap,
    missing_skills: missingSkills,
    eligibility_score: Math.round(score * 0.9)
  };
}

/**
 * Match a single opportunity against a profile
 */
async function matchOpportunity(profile, opportunity, useAI = false) {
  const basicMatch = calculateBasicMatchScore(profile, opportunity);

  // Only use AI for high-potential matches to save API calls
  if (useAI && basicMatch.match_score >= 40) {
    try {
      const aiMatch = await generateMatchAnalysis(profile, opportunity);
      return {
        ...basicMatch,
        ...aiMatch,
        match_score: Math.round((basicMatch.match_score + (aiMatch.match_score || basicMatch.match_score)) / 2)
      };
    } catch (err) {
      logger.warn('AI match analysis failed, using basic match', { error: err.message });
    }
  }

  return {
    ...basicMatch,
    why_match: generateWhyMatch(profile, opportunity, basicMatch),
    skills_to_gain: (opportunity.required_skills || []).filter(s => !basicMatch.skill_overlap.includes(s)).slice(0, 3),
    career_impact: generateCareerImpact(opportunity),
    selection_probability: basicMatch.match_score >= 70 ? 'High' : basicMatch.match_score >= 50 ? 'Medium' : 'Low',
    selection_percentage: basicMatch.match_score,
    application_tips: generateApplicationTips(profile, opportunity)
  };
}

/**
 * Run matching for all active opportunities against a user profile
 */
async function runMatchingForUser(userId, useAI = false) {
  logger.info('Running opportunity matching for user', { userId });

  // Get user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    logger.error('Profile not found for matching', { userId, error: profileError?.message });
    return [];
  }

  // Get active opportunities
  const { data: opportunities, error: oppError } = await supabaseAdmin
    .from('opportunities')
    .select('*')
    .eq('is_active', true)
    .order('posted_date', { ascending: false })
    .limit(200);

  if (oppError || !opportunities?.length) {
    logger.warn('No opportunities found for matching', { userId });
    return [];
  }

  const matches = [];

  for (const opportunity of opportunities) {
    const matchData = await matchOpportunity(profile, opportunity, useAI);

    if (matchData.match_score >= 30) {
      matches.push({
        user_id: userId,
        opportunity_id: opportunity.id,
        match_score: matchData.match_score,
        eligibility_score: matchData.eligibility_score,
        skill_overlap: matchData.skill_overlap,
        missing_skills: matchData.missing_skills,
        why_match: matchData.why_match,
        skills_to_gain: matchData.skills_to_gain,
        career_impact: matchData.career_impact,
        selection_probability: matchData.selection_probability,
        selection_percentage: matchData.selection_percentage,
        application_tips: matchData.application_tips,
        is_notified: false,
        is_saved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  // Sort by match score
  matches.sort((a, b) => b.match_score - a.match_score);

  // Upsert matches to database
  if (matches.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from('user_matches')
      .upsert(matches, { onConflict: 'user_id,opportunity_id' });

    if (upsertError) {
      logger.error('Error storing matches', { error: upsertError.message });
    }
  }

  logger.info(`Found ${matches.length} matches for user ${userId}`);
  return matches.slice(0, 50);
}

/**
 * Get top matches for a user (from DB)
 */
async function getTopMatchesForUser(userId, limit = 10, type = null) {
  let query = supabaseAdmin
    .from('user_matches')
    .select(`
      *,
      opportunities (*)
    `)
    .eq('user_id', userId)
    .order('match_score', { ascending: false })
    .limit(limit);

  if (type) {
    query = query.eq('opportunities.type', type);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching matches', { error: error.message });
    return [];
  }

  return data || [];
}

// Helper generators
function generateWhyMatch(profile, opportunity, matchData) {
  const reasons = [];

  if (matchData.skill_overlap.length > 0) {
    reasons.push(`Your ${matchData.skill_overlap.slice(0, 2).join(' and ')} skills align perfectly`);
  }

  if (profile.career_level === 'fresher' && opportunity.type === 'internship') {
    reasons.push('Great entry-level opportunity for freshers');
  }

  if (matchData.match_score >= 70) {
    reasons.push('Strong overall profile match');
  }

  return reasons.join('. ') || 'This opportunity aligns with your career goals';
}

function generateCareerImpact(opportunity) {
  const impacts = {
    job: 'Gain full-time industry experience and grow your professional network',
    internship: 'Build real-world skills and get a foot in the door at top companies',
    fellowship: 'Access mentorship, funding, and exclusive networks in your field',
    scholarship: 'Fund your education and focus on learning without financial stress',
    hackathon: 'Build your portfolio, win prizes, and showcase your problem-solving skills',
    research: 'Contribute to cutting-edge research and strengthen your academic profile',
    apprenticeship: 'Learn a trade hands-on while getting paid'
  };
  return impacts[opportunity.type] || 'Advance your career and gain valuable experience';
}

function generateApplicationTips(profile, opportunity) {
  const tips = [
    'Tailor your resume to highlight relevant skills mentioned in the job description',
    'Write a personalized cover letter explaining your motivation',
    'Research the company thoroughly before applying'
  ];

  if (opportunity.type === 'hackathon') {
    return ['Form a diverse team with complementary skills', 'Start with a clear problem statement', 'Focus on a working MVP over complex features'];
  }

  if (opportunity.type === 'scholarship') {
    return ['Write a compelling personal statement', 'Get strong recommendation letters', 'Apply early before the deadline'];
  }

  if (profile.career_level === 'fresher') {
    return ['Highlight academic projects and personal projects', 'Emphasize eagerness to learn', 'Include any relevant coursework or certifications'];
  }

  return tips;
}

module.exports = {
  runMatchingForUser,
  matchOpportunity,
  calculateBasicMatchScore,
  getTopMatchesForUser
};
