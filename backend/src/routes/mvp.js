const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../utils/prisma');
const { parseResumeWithAI, generateCareerAnalysis } = require('../services/gemini');
const { logger } = require('../utils/logger');

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents (DOCX, DOC) are allowed.'));
    }
  }
});

/**
 * POST /resume/upload
 * Upload resume, extract text, run Gemini extraction, save to database, and return JSON.
 */
router.post('/resume/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a file with the key "resume".' });
    }

    // Determine or generate userId
    let userId = req.body.userId || req.query.userId || req.headers['x-user-id'];
    if (!userId) {
      userId = uuidv4();
    }

    // Check if user exists in the database. If not, create them.
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `mvp_user_${userId.substring(0, 8)}@careermate.ai`,
          name: 'MVP Tester'
        }
      });
      logger.info('Created new user for resume upload', { userId });
    }

    // Extract text from buffer
    let rawText = '';
    const buffer = req.file.buffer;

    if (req.file.mimetype === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        rawText = data.text || '';
      } catch (parseError) {
        logger.error('PDF parsing error', { error: parseError.message });
        return res.status(422).json({ error: 'Failed to extract text from PDF. Ensure the file is not corrupted.' });
      }
    } else {
      // DOCX
      try {
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value || '';
      } catch (parseError) {
        logger.error('DOCX parsing error', { error: parseError.message });
        return res.status(422).json({ error: 'Failed to extract text from Word document.' });
      }
    }

    rawText = rawText.trim();
    if (!rawText || rawText.length < 50) {
      return res.status(422).json({ error: 'Extracted text is too short. Please upload a detailed resume.' });
    }

    // Call Gemini to convert resume to structured JSON
    let parsedResume;
    try {
      parsedResume = await parseResumeWithAI(rawText);
    } catch (aiError) {
      logger.error('Gemini parser failed', { error: aiError.message });
      return res.status(502).json({ error: 'AI resume extraction service failed.' });
    }

    // Call Gemini to generate career analysis
    let analysis;
    try {
      analysis = await generateCareerAnalysis(parsedResume);
    } catch (analysisError) {
      logger.error('Gemini career analysis failed', { error: analysisError.message });
      // Fallback analysis values if analysis fails
      analysis = {
        career_score: 60,
        skill_score: 60,
        strengths: ['Uploaded resume successfully'],
        missing_skills: [],
        career_suggestions: ['Build up skills relevant to target roles']
      };
    }

    // Store in resumes table
    const resumeRecord = await prisma.resume.create({
      data: {
        user_id: userId,
        file_name: req.file.originalname,
        raw_text: rawText,
        parsed_json: parsedResume
      }
    });

    // Save/Update Profile table
    const profileData = {
      name: parsedResume.name || user.name || 'MVP Tester',
      email: parsedResume.email || user.email || '',
      phone: parsedResume.phone || '',
      location: parsedResume.location || '',
      linkedin: parsedResume.linkedin || '',
      github: parsedResume.github || '',
      portfolio: parsedResume.portfolio || '',
      summary: parsedResume.summary || '',
      skills: parsedResume.skills || [],
      technical_skills: parsedResume.technical_skills || parsedResume.skills || [],
      soft_skills: parsedResume.soft_skills || [],
      languages: parsedResume.languages || [],
      career_level: parsedResume.career_level || 'fresher',
      target_roles: parsedResume.target_roles || [],
      industries: parsedResume.industries || [],
      education: parsedResume.education || [],
      experience: parsedResume.experience || [],
      projects: parsedResume.projects || [],
      certifications: parsedResume.certifications || [],
      career_score: analysis.career_score || 0,
      skill_score: analysis.skill_score || 0,
      experience_score: analysis.experience_score || 0,
      education_score: analysis.education_score || 0,
      profile_completeness: analysis.profile_completeness || 60,
      missing_skills: analysis.missing_skills || [],
      career_suggestions: analysis.career_suggestions || [],
      strengths: analysis.strengths || [],
      immediate_actions: analysis.immediate_actions || [],
      roadmap: analysis.roadmap || []
    };

    await prisma.profile.upsert({
      where: { user_id: userId },
      update: profileData,
      create: {
        user_id: userId,
        ...profileData
      }
    });

    logger.info('Successfully saved parsed resume and profile to database', { userId });

    res.status(200).json({
      success: true,
      message: 'Resume uploaded and analyzed successfully',
      userId,
      resume: {
        id: resumeRecord.id,
        file_name: resumeRecord.file_name,
        parsed: parsedResume
      },
      career_analysis: {
        career_score: analysis.career_score,
        skill_score: analysis.skill_score,
        missing_skills: analysis.missing_skills,
        strengths: analysis.strengths,
        career_suggestions: analysis.career_suggestions
      }
    });

  } catch (err) {
    logger.error('Error handling resume upload', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error while processing resume.' });
  }
});

/**
 * GET /resume/:userId
 * Fetch the latest parsed resume from the database.
 */
router.get('/resume/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const resume = await prisma.resume.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    if (!resume) {
      return res.status(404).json({ error: 'No parsed resume found for this user.' });
    }

    res.status(200).json({
      success: true,
      resume
    });
  } catch (err) {
    logger.error('Error fetching resume', { error: err.message });
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /match/:userId
 * Match user resume skills with seeded job opportunities.
 */
router.post('/match/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await prisma.profile.findUnique({
      where: { user_id: userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found. Please upload a resume first.' });
    }

    const opportunities = await prisma.opportunity.findMany({
      where: { is_active: true }
    });

    if (!opportunities || opportunities.length === 0) {
      return res.status(400).json({
        error: 'No active job opportunities found. Please seed the jobs first by hitting GET /opportunities/seed'
      });
    }

    const userSkills = (profile.skills || []).map(s => s.toLowerCase().trim());
    const matches = opportunities.map(opt => {
      const required = (opt.required_skills || []).map(s => s.toLowerCase().trim());
      const overlap = required.filter(s => userSkills.includes(s));
      const missing = required.filter(s => !userSkills.includes(s));

      let score = 50; // default score
      if (required.length > 0) {
        score = Math.round((overlap.length / required.length) * 100);
      }

      // Title matching bonus
      const titleMatch = (profile.target_roles || []).some(role =>
        opt.title.toLowerCase().includes(role.toLowerCase()) ||
        role.toLowerCase().includes(opt.title.toLowerCase())
      );
      if (titleMatch) {
        score = Math.min(100, score + 15);
      }

      const reason = `Matched ${overlap.length} of ${required.length} required skills (${overlap.slice(0, 3).join(', ')})${
        titleMatch ? ' and aligns with target role: ' + opt.title : ''
      }.`;

      return {
        opportunity_id: opt.id,
        title: opt.title,
        company: opt.company,
        location: opt.location,
        match_score: score,
        skill_overlap: overlap,
        missing_skills: missing,
        why_match: reason
      };
    });

    // Sort by match score and take top 5
    const topMatches = matches
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 5);

    // Save/Upsert match results to DB via Prisma
    for (const match of topMatches) {
      await prisma.match.upsert({
        where: {
          user_id_opportunity_id: {
            user_id: userId,
            opportunity_id: match.opportunity_id
          }
        },
        update: {
          match_score: match.match_score,
          skill_overlap: match.skill_overlap,
          missing_skills: match.missing_skills,
          why_match: match.why_match,
          updated_at: new Date()
        },
        create: {
          user_id: userId,
          opportunity_id: match.opportunity_id,
          match_score: match.match_score,
          skill_overlap: match.skill_overlap,
          missing_skills: match.missing_skills,
          why_match: match.why_match
        }
      });
    }

    res.status(200).json({
      success: true,
      matches: topMatches
    });

  } catch (err) {
    logger.error('Matching engine error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error during matching.' });
  }
});

/**
 * GET /opportunities/seed
 * Seed dummy job opportunities into database.
 */
router.get('/opportunities/seed', async (req, res) => {
  try {
    const dummyOpportunities = [
      {
        id: 'job-1',
        title: 'Full Stack Developer',
        company: 'TechCorp Solutions',
        location: 'Bangalore, India',
        type: 'job',
        description: 'Join our team as a Full Stack Developer. Looking for someone with hands-on Node.js, React, and PostgreSQL experience.',
        required_skills: ['Node.js', 'React', 'PostgreSQL', 'JavaScript', 'HTML', 'CSS'],
        is_active: true
      },
      {
        id: 'job-2',
        title: 'Backend Python Engineer',
        company: 'DataScale Systems',
        location: 'Remote',
        type: 'job',
        description: 'Build microservices and robust analytical APIs using Python, Django, and PostgreSQL databases.',
        required_skills: ['Python', 'Django', 'SQL', 'PostgreSQL', 'REST API'],
        is_active: true
      },
      {
        id: 'job-3',
        title: 'Frontend React Engineer',
        company: 'CreativeWeb Studio',
        location: 'Mumbai, India',
        type: 'job',
        description: 'Design and build interactive user web applications. Must be strong in React, TypeScript, and CSS layouts.',
        required_skills: ['React', 'TypeScript', 'Tailwind CSS', 'CSS', 'JavaScript'],
        is_active: true
      },
      {
        id: 'job-4',
        title: 'Data Scientist',
        company: 'Apex Intelligence',
        location: 'Hyderabad, India',
        type: 'job',
        description: 'Create predictive models and perform structured data analysis using pandas, numpy, and machine learning models.',
        required_skills: ['Python', 'Pandas', 'Numpy', 'Machine Learning', 'SQL'],
        is_active: true
      },
      {
        id: 'job-5',
        title: 'Cloud DevOps Engineer',
        company: 'VaporCloud Labs',
        location: 'Bangalore, India',
        type: 'job',
        description: 'Deploy scale architectures and manage CI/CD pipelines. Proficiency in Docker, Kubernetes, and AWS is required.',
        required_skills: ['Docker', 'Kubernetes', 'AWS', 'Linux', 'Python'],
        is_active: true
      }
    ];

    for (const job of dummyOpportunities) {
      await prisma.opportunity.upsert({
        where: { id: job.id },
        update: job,
        create: job
      });
    }

    res.status(200).json({
      success: true,
      message: 'Dummy opportunities seeded successfully',
      count: dummyOpportunities.length
    });
  } catch (err) {
    logger.error('Error seeding opportunities', { error: err.message });
    res.status(500).json({ error: 'Internal server error while seeding data.' });
  }
});

// Error handling middleware for file upload limits/errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
