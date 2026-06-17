const axios = require('axios');
const { logger } = require('../utils/logger');
const { supabaseAdmin } = require('../utils/supabase');
const { generateWhatsAppMessage } = require('./gemini');
const { getTopMatchesForUser } = require('./matchingEngine');

const WA_API_VERSION = 'v21.0';
const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}`;

/**
 * Send a WhatsApp text message
 */
async function sendWhatsAppMessage(to, message) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    logger.warn('WhatsApp not configured, logging message instead');
    logger.info('WhatsApp Message:', { to, message: message.substring(0, 100) });
    return { success: false, reason: 'not_configured' };
  }

  // Normalize phone number
  const normalizedPhone = to.replace(/\D/g, '');
  const phoneWithCode = normalizedPhone.startsWith('91') ? normalizedPhone : `91${normalizedPhone}`;

  try {
    const response = await axios.post(
      `${WA_BASE_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneWithCode,
        type: 'text',
        text: {
          body: message,
          preview_url: true
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    logger.info('WhatsApp message sent', { to: phoneWithCode, messageId: response.data.messages?.[0]?.id });
    return { success: true, messageId: response.data.messages?.[0]?.id };
  } catch (error) {
    logger.error('WhatsApp send error', {
      error: error.response?.data || error.message,
      to: phoneWithCode
    });
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
}

/**
 * Send interactive list message (for menus)
 */
async function sendInteractiveMenu(to, header, body, footer, sections) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    return { success: false, reason: 'not_configured' };
  }

  const normalizedPhone = to.replace(/\D/g, '');

  try {
    const response = await axios.post(
      `${WA_BASE_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: header },
          body: { text: body },
          footer: { text: footer },
          action: {
            button: 'View Options',
            sections
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true };
  } catch (error) {
    logger.error('WhatsApp interactive menu error', { error: error.message });
    // Fallback to text
    const textContent = `${header}\n\n${body}\n\n${sections.map(s => s.rows?.map(r => `• ${r.title}`).join('\n')).join('\n')}`;
    return sendWhatsAppMessage(to, textContent);
  }
}

/**
 * Process incoming WhatsApp message
 */
async function processWhatsAppMessage(phoneNumber, message, mediaId = null) {
  const msgLower = message.toLowerCase().trim();

  // Get or create user
  let user = await getUserByPhone(phoneNumber);

  // Log conversation
  if (user) {
    await logConversation(user.id, 'user', message, phoneNumber);
  }

  let response = '';

  // Handle commands
  if (msgLower === 'start' || msgLower === 'hello' || msgLower === 'hi') {
    response = await handleStart(phoneNumber, user);
  } else if (msgLower.includes('upload resume') || msgLower === 'upload') {
    response = await handleUploadResume(user);
  } else if (msgLower.includes('update resume')) {
    response = await handleUpdateResume(user);
  } else if (msgLower.includes('my profile') || msgLower === 'profile') {
    response = await handleMyProfile(user);
  } else if (msgLower === 'matches' || msgLower.includes('top opportunities') || msgLower === 'jobs') {
    response = await handleMatches(user);
  } else if (msgLower.includes('skill gap') || msgLower === 'skills') {
    response = await handleSkillGaps(user);
  } else if (msgLower.includes('career roadmap') || msgLower === 'roadmap') {
    response = await handleCareerRoadmap(user);
  } else if (msgLower === 'help' || msgLower === 'menu') {
    response = await handleHelp();
  } else if (msgLower.startsWith('internship') || msgLower === 'internships') {
    response = await handleTypeSearch(user, 'internship');
  } else if (msgLower.startsWith('hackathon') || msgLower === 'hackathons') {
    response = await handleTypeSearch(user, 'hackathon');
  } else if (msgLower === 'scholarships' || msgLower.startsWith('scholarship')) {
    response = await handleTypeSearch(user, 'scholarship');
  } else if (msgLower === 'fellowship' || msgLower === 'fellowships') {
    response = await handleTypeSearch(user, 'fellowship');
  } else {
    // Check for media (resume upload)
    if (mediaId) {
      response = await handleResumeMedia(mediaId, phoneNumber, user);
    } else {
      response = `I didn't understand that. Reply *HELP* to see all available commands.\n\nQuick commands:\n• *MATCHES* - See job matches\n• *UPLOAD RESUME* - Upload your resume\n• *MY PROFILE* - View your profile\n• *SKILL GAPS* - Check skill gaps`;
    }
  }

  // Send response
  const sent = await sendWhatsAppMessage(phoneNumber, response);

  // Log bot response
  if (user && sent.success) {
    await logConversation(user.id, 'bot', response, phoneNumber);
  }

  return sent;
}

/**
 * Handle START command
 */
async function handleStart(phoneNumber, user) {
  if (!user) {
    // Create new user
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      phone: phoneNumber,
      phone_confirm: true,
      user_metadata: { source: 'whatsapp', phone: phoneNumber }
    });

    if (!error && newUser) {
      await supabaseAdmin.from('users').upsert({
        id: newUser.user.id,
        phone: phoneNumber,
        source: 'whatsapp',
        created_at: new Date().toISOString()
      });
    }

    return `🎓 *Welcome to CareerMate AI!*

I'm your personal AI career assistant. I'll help you find the best jobs, internships, scholarships, and opportunities tailored just for you!

*To get started:*
📄 Reply *UPLOAD RESUME* to upload your resume

Once uploaded, I'll:
✅ Analyze your skills and experience
📊 Score your career profile
🎯 Find matching opportunities
🔔 Send personalized recommendations daily

*Available Commands:*
• *UPLOAD RESUME* - Upload your resume
• *MATCHES* - View top opportunities
• *MY PROFILE* - View your career profile
• *SKILL GAPS* - See what skills to learn
• *CAREER ROADMAP* - Get a personalized roadmap
• *HELP* - See all commands

Let's build your dream career! 🚀`;
  }

  const hasProfile = await checkHasProfile(user.id);
  if (!hasProfile) {
    return `👋 *Welcome back to CareerMate AI!*

Your resume hasn't been uploaded yet. Let's get started!

📄 Reply *UPLOAD RESUME* and then send your resume PDF in the next message.

Or type *HELP* to see all commands.`;
  }

  return `👋 *Welcome back!*

Your profile is active and I'm continuously searching for opportunities for you!

*Quick Actions:*
• *MATCHES* - See your latest job matches
• *MY PROFILE* - View career score
• *SKILL GAPS* - Check what to learn next
• *CAREER ROADMAP* - View your roadmap

Type *HELP* for all commands. 🚀`;
}

/**
 * Handle resume upload instruction
 */
async function handleUploadResume(user) {
  return `📄 *Ready to receive your resume!*

Please send your resume as a *PDF file* in your next message.

✅ Supported formats: PDF (recommended), JPG, PNG
📏 Maximum size: 10MB

I'll extract and analyze:
• Skills & Technologies
• Education & Certifications
• Work Experience & Projects
• Career Goals

After analysis, you'll receive:
🎯 Your Career Score
📊 Skill Assessment
💼 Top Opportunity Matches
🗺️ Personalized Career Roadmap

*Send your resume PDF now!*`;
}

async function handleUpdateResume(user) {
  return `🔄 *Update Your Resume*

Send your new resume PDF in the next message and I'll update your profile with the latest information.

Your previous matches will be refreshed with the new profile!

*Send your updated resume PDF now!*`;
}

/**
 * Handle profile view
 */
async function handleMyProfile(user) {
  if (!user) {
    return `Please type *START* to begin, then *UPLOAD RESUME* to create your profile.`;
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return `You haven't uploaded a resume yet!\n\nReply *UPLOAD RESUME* to get started.`;
  }

  const scoreBar = (score) => '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));

  return `👤 *Your CareerMate AI Profile*

📛 *Name:* ${profile.name || 'Not set'}
🎓 *Education:* ${profile.education?.[0]?.degree || 'Not specified'} - ${profile.education?.[0]?.institution || ''}
📍 *Location:* ${profile.location || 'Not set'}
💼 *Career Level:* ${(profile.career_level || 'fresher').toUpperCase()}

📊 *Career Score:* ${profile.career_score || 0}/100
${scoreBar(profile.career_score || 0)}

🧠 *Skill Score:* ${profile.skill_score || 0}/100
${scoreBar(profile.skill_score || 0)}

💡 *Top Skills:* ${(profile.skills || []).slice(0, 6).join(', ') || 'None listed'}

🎯 *Target Roles:* ${(profile.target_roles || []).join(', ') || 'Not set'}

📅 *Profile Updated:* ${profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Recently'}

View full profile at: ${process.env.FRONTEND_URL || 'https://careermate-ai.vercel.app'}`;
}

/**
 * Handle matches request
 */
async function handleMatches(user) {
  if (!user) {
    return `Please upload your resume first!\n\nReply *UPLOAD RESUME* to get started.`;
  }

  const hasProfile = await checkHasProfile(user.id);
  if (!hasProfile) {
    return `Please upload your resume first to see personalized matches!\n\nReply *UPLOAD RESUME*`;
  }

  const { data: matches } = await supabaseAdmin
    .from('user_matches')
    .select('*, opportunities(*)')
    .eq('user_id', user.id)
    .eq('opportunities.is_active', true)
    .order('match_score', { ascending: false })
    .limit(3);

  if (!matches || matches.length === 0) {
    return `🔍 I'm still searching for the best opportunities for you!

This usually takes a few minutes after your resume is processed.

Try again in a few minutes or visit your dashboard for real-time updates:
${process.env.FRONTEND_URL || 'https://careermate-ai.vercel.app'}`;
  }

  let response = `🎯 *Your Top Matches*\n\n`;

  for (let i = 0; i < Math.min(3, matches.length); i++) {
    const match = matches[i];
    const opp = match.opportunities;
    if (!opp) continue;

    const scoreBar = '█'.repeat(Math.floor(match.match_score / 10)) + '░'.repeat(10 - Math.floor(match.match_score / 10));

    response += `*${i + 1}. ${opp.title}*
🏢 ${opp.company} | 📍 ${opp.location || 'India'}
📊 Match: ${match.match_score}% ${scoreBar}
🔗 ${opp.apply_url || opp.url || 'See website'}

`;
  }

  response += `\nView all ${matches.length} matches at your dashboard:
${process.env.FRONTEND_URL || 'https://careermate-ai.vercel.app'}

Type *INTERNSHIPS*, *HACKATHONS*, or *SCHOLARSHIPS* for specific types!`;

  return response;
}

/**
 * Handle skill gaps
 */
async function handleSkillGaps(user) {
  if (!user) return `Please upload your resume first!\n\nReply *UPLOAD RESUME*`;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('missing_skills, career_suggestions, skills, target_roles')
    .eq('user_id', user.id)
    .single();

  if (!profile) return `Please upload your resume first!\n\nReply *UPLOAD RESUME*`;

  const missingSkills = profile.missing_skills || [];
  const suggestions = profile.career_suggestions || [];

  return `🧠 *Skill Gap Analysis*

📚 *Skills to Learn Next:*
${missingSkills.slice(0, 6).map((s, i) => `${i + 1}. ${s}`).join('\n') || 'Keep building on your current skills!'}

🎯 *Career Suggestions:*
${suggestions.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n') || 'Complete your profile for personalized suggestions'}

💡 *Your Current Skills:*
${(profile.skills || []).slice(0, 8).join(', ')}

🗺️ Type *CAREER ROADMAP* for a step-by-step learning plan!

📊 View detailed analysis at:
${process.env.FRONTEND_URL || 'https://careermate-ai.vercel.app'}`;
}

/**
 * Handle career roadmap
 */
async function handleCareerRoadmap(user) {
  if (!user) return `Please upload your resume first!\n\nReply *UPLOAD RESUME*`;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('target_roles, career_score, roadmap')
    .eq('user_id', user.id)
    .single();

  if (!profile) return `Please upload your resume first!\n\nReply *UPLOAD RESUME*`;

  const targetRole = (profile.target_roles || ['Software Developer'])[0];
  const roadmap = profile.roadmap || [];

  let response = `🗺️ *Career Roadmap to ${targetRole}*\n\n`;

  if (roadmap.length > 0) {
    roadmap.slice(0, 3).forEach((phase, i) => {
      response += `*${phase.phase || `Phase ${i + 1}`}: ${phase.title}*\n`;
      response += `⏱️ ${phase.duration || '1 month'}\n`;
      (phase.tasks || phase.objectives || []).slice(0, 2).forEach(task => {
        response += `  • ${task}\n`;
      });
      response += '\n';
    });
  } else {
    response += `📊 Career Score: ${profile.career_score || 0}/100\n\n`;
    response += `Your roadmap is being generated! Check your dashboard for the full interactive roadmap:\n`;
  }

  response += `\n🌐 View your full interactive roadmap at:\n${process.env.FRONTEND_URL || 'https://careermate-ai.vercel.app'}`;

  return response;
}

/**
 * Handle type-specific search
 */
async function handleTypeSearch(user, type) {
  if (!user) return `Please upload your resume first!\n\nReply *UPLOAD RESUME*`;

  const { data: matches } = await supabaseAdmin
    .from('user_matches')
    .select('*, opportunities(*)')
    .eq('user_id', user.id)
    .order('match_score', { ascending: false })
    .limit(10);

  const typeMatches = (matches || []).filter(m => m.opportunities?.type === type);

  const typeEmoji = { internship: '🎯', hackathon: '💻', scholarship: '🎓', fellowship: '🏆', job: '💼', research: '🔬' };

  if (!typeMatches.length) {
    return `${typeEmoji[type] || '🌟'} *${type.charAt(0).toUpperCase() + type.slice(1)}s*\n\nI'm still finding ${type} opportunities for you. Check back soon!\n\nView all opportunities at:\n${process.env.FRONTEND_URL || 'https://careermate-ai.vercel.app'}`;
  }

  let response = `${typeEmoji[type] || '🌟'} *Top ${type.charAt(0).toUpperCase() + type.slice(1)}s For You*\n\n`;

  typeMatches.slice(0, 3).forEach((match, i) => {
    const opp = match.opportunities;
    response += `*${i + 1}. ${opp.title}*\n🏢 ${opp.company}\n📊 ${match.match_score}% match\n🔗 ${opp.apply_url || opp.url || 'See website'}\n\n`;
  });

  return response;
}

/**
 * Handle resume media (PDF sent via WhatsApp)
 */
async function handleResumeMedia(mediaId, phoneNumber, user) {
  try {
    // Get media URL
    const mediaInfo = await axios.get(`${WA_BASE_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
    });

    const mediaUrl = mediaInfo.data.url;

    // Download media
    const mediaResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      responseType: 'arraybuffer'
    });

    const buffer = Buffer.from(mediaResponse.data);

    // Process resume asynchronously
    processResumeFromWhatsApp(buffer, phoneNumber, user, mediaInfo.data.mime_type);

    return `✅ *Resume received!*

I'm analyzing your resume now. This takes about 30-60 seconds.

I'll send you your:
📊 Career Score
🎯 Top Job Matches
💡 Skill Analysis
🗺️ Career Roadmap

*Please wait for your analysis...*`;
  } catch (error) {
    logger.error('Error handling resume media', { error: error.message });
    return `❌ Error downloading your resume. Please try again or upload via the web dashboard:\n${process.env.FRONTEND_URL}`;
  }
}

/**
 * Process resume received via WhatsApp (async)
 */
async function processResumeFromWhatsApp(buffer, phoneNumber, user, mimeType) {
  try {
    const { extractTextFromPDF, extractTextFromImage } = require('./resumeParser');
    const { parseResumeWithAI, generateCareerAnalysis } = require('./gemini');
    const { runMatchingForUser } = require('./matchingEngine');
    const { storeOpportunities, searchAllOpportunities } = require('./searchEngine');

    // Extract text
    let textResult;
    if (mimeType?.includes('image')) {
      textResult = await extractTextFromImage(buffer);
    } else {
      textResult = await extractTextFromPDF(buffer);
    }

    if (!textResult.text || textResult.text.length < 50) {
      await sendWhatsAppMessage(phoneNumber, `❌ Could not read your resume. Please ensure it's a text-based PDF (not a scanned image) or try again with a clearer image.`);
      return;
    }

    // Parse with AI
    const parsedResume = await parseResumeWithAI(textResult.text);

    // Get user ID
    let userId = user?.id;
    if (!userId) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', phoneNumber)
        .single();
      userId = userData?.id;
    }

    if (!userId) {
      await sendWhatsAppMessage(phoneNumber, `Please type *START* first to create your account, then upload your resume.`);
      return;
    }

    // Generate career analysis
    const analysis = await generateCareerAnalysis(parsedResume);

    // Store profile
    await supabaseAdmin.from('profiles').upsert({
      user_id: userId,
      ...parsedResume,
      career_score: analysis.career_score,
      skill_score: analysis.skill_score,
      missing_skills: analysis.missing_skills,
      career_suggestions: analysis.career_suggestions,
      roadmap: analysis.roadmap,
      target_roles: analysis.target_roles || parsedResume.target_roles,
      strengths: analysis.strengths,
      immediate_actions: analysis.immediate_actions,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    // Upload resume to Supabase Storage
    const { supabaseAdmin: sa } = require('../utils/supabase');
    const fileName = `${userId}/resume_${Date.now()}.pdf`;
    await sa.storage.from('resumes').upload(fileName, buffer, {
      contentType: mimeType || 'application/pdf',
      upsert: true
    });

    // Search for opportunities
    const opportunities = await searchAllOpportunities(parsedResume);
    await storeOpportunities(opportunities);

    // Run matching
    await runMatchingForUser(userId);

    // Send result to user
    const scoreBar = '█'.repeat(Math.floor((analysis.career_score || 0) / 10)) + '░'.repeat(10 - Math.floor((analysis.career_score || 0) / 10));

    const resultMessage = `🎉 *Resume Analysis Complete!*

👤 *${parsedResume.name || 'Your profile'}*

📊 *Career Score: ${analysis.career_score || 65}/100*
${scoreBar}

🧠 *Skill Score: ${analysis.skill_score || 60}/100*

💡 *Top Skills Found:*
${(parsedResume.skills || []).slice(0, 6).map(s => `• ${s}`).join('\n') || '• No skills detected'}

💪 *Strengths:*
${(analysis.strengths || []).slice(0, 3).map(s => `✅ ${s}`).join('\n') || '✅ Profile uploaded successfully'}

📚 *Skills to Learn:*
${(analysis.missing_skills || []).slice(0, 4).map(s => `• ${s}`).join('\n') || '• Keep developing current skills'}

🎯 *I found ${opportunities.length} matching opportunities for you!*

Reply *MATCHES* to see your top job matches!
Reply *CAREER ROADMAP* for your personalized learning path!

🌐 View full dashboard: ${process.env.FRONTEND_URL || 'https://careermate-ai.vercel.app'}`;

    await sendWhatsAppMessage(phoneNumber, resultMessage);

  } catch (error) {
    logger.error('Resume from WhatsApp processing error', { error: error.message });
    await sendWhatsAppMessage(phoneNumber, `❌ Error processing resume. Please try again or contact support.\n\nAlternatively, upload via web dashboard:\n${process.env.FRONTEND_URL}`);
  }
}

/**
 * Handle help command
 */
async function handleHelp() {
  return `🤖 *CareerMate AI — Command Guide*

📄 *Resume*
• *UPLOAD RESUME* - Upload your resume
• *UPDATE RESUME* - Update your resume

👤 *Profile*
• *MY PROFILE* - View career profile & scores

🎯 *Opportunities*
• *MATCHES* - See all top matches
• *INTERNSHIPS* - Internship opportunities
• *JOBS* - Job opportunities
• *HACKATHONS* - Hackathon events
• *SCHOLARSHIPS* - Scholarship programs
• *FELLOWSHIPS* - Fellowship programs

📊 *Analytics*
• *SKILL GAPS* - Skills you need to learn
• *CAREER ROADMAP* - Step-by-step career plan

ℹ️ *Other*
• *HELP* - Show this menu
• *START* - Restart bot

🌐 *Dashboard:* ${process.env.FRONTEND_URL || 'https://careermate-ai.vercel.app'}

_CareerMate AI — Your Personal AI Career Assistant_`;
}

/**
 * Send daily notifications to users
 */
async function sendDailyNotifications() {
  logger.info('Sending daily opportunity notifications');

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, phone, notification_enabled')
    .eq('notification_enabled', true)
    .not('phone', 'is', null);

  if (!users?.length) return;

  for (const user of users) {
    try {
      const { data: matches } = await supabaseAdmin
        .from('user_matches')
        .select('*, opportunities(*)')
        .eq('user_id', user.id)
        .eq('is_notified', false)
        .eq('opportunities.is_active', true)
        .order('match_score', { ascending: false })
        .limit(3);

      if (!matches?.length) continue;

      const topMatch = matches[0];
      const opp = topMatch.opportunities;

      if (opp && user.phone) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const message = await generateWhatsAppMessage(profile || {}, opp, topMatch);
        await sendWhatsAppMessage(user.phone, message);

        // Mark as notified
        await supabaseAdmin
          .from('user_matches')
          .update({ is_notified: true, notified_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('opportunity_id', opp.id);
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Notification error for user', { userId: user.id, error: error.message });
    }
  }

  logger.info('Daily notifications sent');
}

// Helper functions
async function getUserByPhone(phoneNumber) {
  const normalized = phoneNumber.replace(/\D/g, '');

  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
    .or(`phone.eq.${normalized},phone.eq.+${normalized},phone.eq.91${normalized}`)
    .single();

  return data;
}

async function checkHasProfile(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  return !!data;
}

async function logConversation(userId, role, message, phone) {
  await supabaseAdmin
    .from('conversations')
    .insert({
      user_id: userId,
      phone,
      role,
      message: message.substring(0, 2000),
      created_at: new Date().toISOString()
    })
    .catch(() => {}); // Non-critical
}

module.exports = {
  sendWhatsAppMessage,
  sendInteractiveMenu,
  processWhatsAppMessage,
  sendDailyNotifications,
  processResumeFromWhatsApp
};
