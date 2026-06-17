const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabaseAdmin } = require('../utils/supabase');
const { extractTextFromPDF, extractTextFromImage, validateResumeFile } = require('../services/resumeParser');
const { parseResumeWithAI, generateCareerAnalysis } = require('../services/gemini');
const { searchAllOpportunities, storeOpportunities } = require('../services/searchEngine');
const { runMatchingForUser } = require('../services/matchingEngine');
const { authenticateUser } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// Memory storage for parsing, then upload to Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload PDF, DOC, DOCX, or image.'));
    }
  }
});

/**
 * POST /api/resume/upload
 * Upload and parse resume
 */
router.post('/upload', authenticateUser, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validation = validateResumeFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const userId = req.user.id;
    const buffer = req.file.buffer;

    // Extract text
    let textResult;
    if (req.file.mimetype.includes('image')) {
      textResult = await extractTextFromImage(buffer);
    } else {
      textResult = await extractTextFromPDF(buffer);
    }

    if (!textResult.text || textResult.text.length < 30) {
      return res.status(422).json({
        error: 'Could not extract text from the file. Please ensure it is a text-based PDF.',
        hint: 'Try uploading a different format or a clearer image'
      });
    }

    // Parse with AI
    const parsedResume = await parseResumeWithAI(textResult.text);

    // Generate career analysis
    const analysis = await generateCareerAnalysis(parsedResume);

    // Upload file to Supabase Storage
    const fileName = `${userId}/resume_${Date.now()}.${req.file.originalname.split('.').pop()}`;
    const { data: storageData, error: storageError } = await supabaseAdmin
      .storage
      .from('resumes')
      .upload(fileName, buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    let resumeUrl = null;
    if (!storageError) {
      const { data: urlData } = supabaseAdmin.storage.from('resumes').getPublicUrl(fileName);
      resumeUrl = urlData.publicUrl;
    }

    // Save profile to database
    const profileData = {
      user_id: userId,
      ...parsedResume,
      resume_url: resumeUrl,
      career_score: analysis.career_score || 65,
      skill_score: analysis.skill_score || 60,
      experience_score: analysis.experience_score || 55,
      education_score: analysis.education_score || 70,
      profile_completeness: analysis.profile_completeness || 60,
      missing_skills: analysis.missing_skills || [],
      career_suggestions: analysis.career_suggestions || [],
      roadmap: analysis.roadmap || [],
      strengths: analysis.strengths || [],
      immediate_actions: analysis.immediate_actions || [],
      target_roles: analysis.target_roles || parsedResume.target_roles || [],
      salary_range: analysis.salary_range || null,
      growth_trajectory: analysis.growth_trajectory || '',
      raw_text: textResult.text.substring(0, 5000),
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' });

    if (profileError) {
      logger.error('Profile save error', { error: profileError.message });
      return res.status(500).json({ error: 'Failed to save profile' });
    }

    // Search and match opportunities in background
    searchAndMatchOpportunities(parsedResume, userId);

    res.status(200).json({
      success: true,
      message: 'Resume uploaded and analyzed successfully',
      profile: {
        name: parsedResume.name,
        email: parsedResume.email,
        skills: parsedResume.skills || [],
        career_score: analysis.career_score,
        skill_score: analysis.skill_score,
        missing_skills: analysis.missing_skills || [],
        career_suggestions: analysis.career_suggestions || []
      },
      extraction_method: textResult.method
    });

  } catch (error) {
    logger.error('Resume upload error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to process resume. Please try again.' });
  }
});

/**
 * GET /api/resume/profile
 * Get current user profile
 */
router.get('/profile', authenticateUser, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Profile not found. Please upload your resume.' });
  }

  res.json({ profile: data });
});

/**
 * GET /api/resume/status
 * Check if user has uploaded resume
 */
router.get('/status', authenticateUser, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('user_id, name, career_score, updated_at')
    .eq('user_id', req.user.id)
    .single();

  res.json({
    hasResume: !!data,
    profile: data || null
  });
});

/**
 * Background search and matching after upload
 */
async function searchAndMatchOpportunities(parsedResume, userId) {
  try {
    logger.info('Starting background opportunity search', { userId });
    const opportunities = await searchAllOpportunities(parsedResume);
    await storeOpportunities(opportunities);
    await runMatchingForUser(userId, false);
    logger.info('Background search and matching complete', { userId, found: opportunities.length });
  } catch (error) {
    logger.error('Background search error', { error: error.message });
  }
}

module.exports = router;
