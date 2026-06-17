const { GoogleGenerativeAI } = require('@google/generative-ai');
const { logger } = require('../utils/logger');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Parse resume text and extract structured data
 */
async function parseResumeWithAI(resumeText) {
  const prompt = `You are an expert resume parser. Extract all information from the following resume text and return it as a valid JSON object.

Resume Text:
${resumeText}

Return a JSON object with exactly this structure (fill in all fields you can find, use empty arrays/strings if not found):
{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "location": "city, country",
  "linkedin": "linkedin url or username",
  "github": "github url or username",
  "portfolio": "portfolio url",
  "summary": "professional summary",
  "skills": ["skill1", "skill2", ...],
  "technical_skills": ["tech1", "tech2", ...],
  "soft_skills": ["skill1", "skill2", ...],
  "languages": ["language1", "language2", ...],
  "education": [
    {
      "degree": "degree name",
      "field": "field of study",
      "institution": "institution name",
      "location": "city, country",
      "start_year": "YYYY",
      "end_year": "YYYY or Present",
      "gpa": "GPA if mentioned",
      "achievements": ["achievement1"]
    }
  ],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "location": "city",
      "start_date": "Month YYYY",
      "end_date": "Month YYYY or Present",
      "description": "job description",
      "achievements": ["achievement1"],
      "technologies": ["tech1"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "project description",
      "technologies": ["tech1"],
      "url": "project url",
      "achievements": ["achievement1"]
    }
  ],
  "certifications": [
    {
      "name": "certification name",
      "issuer": "issuing organization",
      "date": "Month YYYY",
      "url": "certificate url"
    }
  ],
  "awards": ["award1", "award2"],
  "publications": ["publication1"],
  "volunteer": [
    {
      "role": "volunteer role",
      "organization": "organization name",
      "description": "what you did"
    }
  ],
  "interests": ["interest1", "interest2"],
  "career_level": "fresher|junior|mid|senior|lead",
  "target_roles": ["role1", "role2"],
  "industries": ["industry1", "industry2"]
}

Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Clean up response
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (error) {
    logger.error('Gemini resume parse error, trying OpenRouter fallback', { error: error.message });
    return parseResumeWithOpenRouter(resumeText);
  }
}

/**
 * OpenRouter fallback for resume parsing
 */
async function parseResumeWithOpenRouter(resumeText) {
  const prompt = `Extract resume info as JSON with fields: name, email, phone, location, skills, education, experience, projects, certifications, career_level, target_roles. Resume: ${resumeText.substring(0, 4000)}`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (err) {
    logger.error('OpenRouter fallback also failed', { error: err.message });
    return { name: '', email: '', skills: [], education: [], experience: [], projects: [], certifications: [] };
  }
}

/**
 * Generate career score and analysis
 */
async function generateCareerAnalysis(profile) {
  const prompt = `You are a career counselor AI. Analyze this professional profile and provide a detailed career assessment.

Profile:
${JSON.stringify(profile, null, 2)}

Return a JSON object with:
{
  "career_score": 85,
  "skill_score": 78,
  "experience_score": 72,
  "education_score": 90,
  "profile_completeness": 88,
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "missing_skills": ["skill1", "skill2", "skill3"],
  "recommended_certifications": ["cert1", "cert2"],
  "career_suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "target_roles": ["role1", "role2", "role3"],
  "salary_range": {
    "min": 50000,
    "max": 120000,
    "currency": "USD",
    "period": "annual"
  },
  "growth_trajectory": "The candidate shows...",
  "immediate_actions": ["action1", "action2", "action3"],
  "six_month_goals": ["goal1", "goal2"],
  "one_year_goals": ["goal1", "goal2"],
  "roadmap": [
    {
      "phase": "Phase 1 (0-3 months)",
      "title": "Foundation Building",
      "tasks": ["task1", "task2"],
      "resources": ["resource1"]
    }
  ]
}

Return ONLY valid JSON, no markdown.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    logger.error('Career analysis error', { error: error.message });
    return {
      career_score: 65,
      skill_score: 60,
      strengths: ['Profile uploaded successfully'],
      missing_skills: [],
      career_suggestions: ['Complete your profile for better insights'],
      target_roles: [],
      roadmap: []
    };
  }
}

/**
 * Generate opportunity match analysis
 */
async function generateMatchAnalysis(profile, opportunity) {
  const prompt = `Analyze the match between this candidate and opportunity.

CANDIDATE:
Skills: ${profile.skills?.join(', ')}
Education: ${JSON.stringify(profile.education?.[0])}
Experience: ${profile.experience?.length || 0} roles
Career level: ${profile.career_level}
Target roles: ${profile.target_roles?.join(', ')}

OPPORTUNITY:
Title: ${opportunity.title}
Company: ${opportunity.company}
Type: ${opportunity.type}
Description: ${opportunity.description?.substring(0, 500)}
Required skills: ${opportunity.required_skills?.join(', ')}
Location: ${opportunity.location}

Return JSON:
{
  "match_score": 85,
  "eligibility_score": 90,
  "skill_overlap": ["skill1", "skill2"],
  "missing_skills": ["skill1"],
  "why_match": "Concise explanation (2-3 sentences)",
  "skills_to_gain": ["skill1", "skill2"],
  "career_impact": "How this helps career growth",
  "selection_probability": "High|Medium|Low",
  "selection_percentage": 65,
  "application_tips": ["tip1", "tip2", "tip3"],
  "expected_growth": "Growth description"
}

Return ONLY valid JSON.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    logger.error('Match analysis error', { error: error.message });
    return {
      match_score: 50,
      eligibility_score: 50,
      skill_overlap: [],
      missing_skills: [],
      why_match: 'Analysis unavailable',
      selection_probability: 'Medium',
      application_tips: ['Tailor your resume', 'Highlight relevant experience']
    };
  }
}

/**
 * Generate career roadmap
 */
async function generateCareerRoadmap(profile, targetRole) {
  const prompt = `Create a detailed, actionable career roadmap for this person to become a ${targetRole}.

CURRENT PROFILE:
Skills: ${profile.skills?.join(', ')}
Experience: ${profile.experience?.length || 0} years equivalent
Education: ${profile.education?.[0]?.degree || 'Not specified'}
Career Level: ${profile.career_level || 'fresher'}

TARGET ROLE: ${targetRole}

Return JSON:
{
  "target_role": "${targetRole}",
  "estimated_timeline": "6-12 months",
  "current_readiness": 45,
  "phases": [
    {
      "phase": 1,
      "title": "Foundation",
      "duration": "0-2 months",
      "objectives": ["objective1", "objective2"],
      "skills_to_learn": ["skill1", "skill2"],
      "resources": [
        {"name": "Resource Name", "url": "https://...", "type": "course|book|practice"}
      ],
      "milestones": ["milestone1"],
      "projects": ["project idea 1"]
    }
  ],
  "key_skills_needed": ["skill1", "skill2"],
  "recommended_certifications": ["cert1", "cert2"],
  "job_boards": ["LinkedIn", "Indeed", "Naukri"],
  "networking_tips": ["tip1", "tip2"],
  "portfolio_ideas": ["idea1", "idea2"]
}

Return ONLY valid JSON.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    logger.error('Roadmap generation error', { error: error.message });
    throw new Error('Failed to generate roadmap');
  }
}

/**
 * Generate WhatsApp message for opportunity
 */
async function generateWhatsAppMessage(profile, opportunity, matchData) {
  const emoji = {
    job: '💼',
    internship: '🎯',
    fellowship: '🏆',
    scholarship: '🎓',
    hackathon: '💻',
    competition: '🥇',
    research: '🔬',
    apprenticeship: '🛠️'
  };

  const typeEmoji = emoji[opportunity.type?.toLowerCase()] || '🌟';
  const scoreBar = '█'.repeat(Math.floor((matchData.match_score || 50) / 10)) + '░'.repeat(10 - Math.floor((matchData.match_score || 50) / 10));

  return `${typeEmoji} *${opportunity.title}*
🏢 ${opportunity.company}
📍 ${opportunity.location || 'Remote/Multiple Locations'}
⏰ Deadline: ${opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Open'}

📊 *Match Score: ${matchData.match_score || 50}%*
${scoreBar}

✅ *Why You Match:*
${matchData.why_match || 'Strong profile alignment'}

🎯 *Skills You'll Gain:*
${(matchData.skills_to_gain || []).slice(0, 3).map(s => `• ${s}`).join('\n') || '• Industry experience'}

📈 *Selection Chance:* ${matchData.selection_probability || 'Medium'} (${matchData.selection_percentage || 50}%)

💡 *Top Tips:*
${(matchData.application_tips || ['Highlight relevant skills', 'Tailor your resume']).slice(0, 2).map((t, i) => `${i + 1}. ${t}`).join('\n')}

🔗 *Apply Now:* ${opportunity.apply_url || opportunity.url || 'See company website'}

---
_Reply MATCHES for more opportunities_`;
}

module.exports = {
  parseResumeWithAI,
  generateCareerAnalysis,
  generateMatchAnalysis,
  generateCareerRoadmap,
  generateWhatsAppMessage
};
