const axios = require('axios');
const cheerio = require('cheerio');
const { logger } = require('../utils/logger');
const { supabaseAdmin } = require('../utils/supabase');

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Search for opportunities using Tavily API
 */
async function searchOpportunitiesWithTavily(query, maxResults = 10) {
  try {
    const response = await axios.post(
      TAVILY_API_URL,
      {
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
        include_images: false,
        exclude_domains: ['pinterest.com', 'reddit.com', 'quora.com']
      },
      { timeout: 15000 }
    );

    return response.data.results || [];
  } catch (error) {
    logger.error('Tavily search error', { error: error.message, query });
    return [];
  }
}

/**
 * Search jobs on LinkedIn (via scraping public pages)
 */
async function scrapeLinkedInJobs(keywords, location = '') {
  const opportunities = [];

  try {
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&f_TPR=r86400`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    $('.base-card').each((i, el) => {
      if (i >= 10) return false;

      const title = $(el).find('.base-search-card__title').text().trim();
      const company = $(el).find('.base-search-card__subtitle').text().trim();
      const location = $(el).find('.job-search-card__location').text().trim();
      const url = $(el).find('a.base-card__full-link').attr('href');
      const timePosted = $(el).find('time').attr('datetime');

      if (title && company) {
        opportunities.push({
          title,
          company,
          location: location || 'India',
          url: url ? url.split('?')[0] : '',
          apply_url: url ? url.split('?')[0] : '',
          source: 'LinkedIn',
          type: 'job',
          posted_date: timePosted || new Date().toISOString(),
          description: `${title} position at ${company}`,
          required_skills: [],
          is_active: true
        });
      }
    });
  } catch (error) {
    logger.warn('LinkedIn scraping failed', { error: error.message });
  }

  return opportunities;
}

/**
 * Search Internshala for internships
 */
async function scrapeInternshala(keywords) {
  const opportunities = [];

  try {
    const searchUrl = `https://internshala.com/internships/keywords-${encodeURIComponent(keywords.replace(/\s+/g, '-'))}-internship`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    $('.individual_internship').each((i, el) => {
      if (i >= 8) return false;

      const title = $(el).find('.profile').text().trim();
      const company = $(el).find('.company_name').text().trim();
      const location = $(el).find('.location_link').text().trim() || 'Remote';
      const stipend = $(el).find('.stipend').text().trim();
      const duration = $(el).find('.ic-16-calendar').parent().text().trim();
      const applyUrl = 'https://internshala.com' + ($(el).find('a.view_detail_button').attr('href') || '');

      if (title && company) {
        opportunities.push({
          title: title + ' Internship',
          company: company.replace(/\s+/g, ' ').trim(),
          location: location || 'India',
          url: applyUrl,
          apply_url: applyUrl,
          source: 'Internshala',
          type: 'internship',
          stipend: stipend || 'Unpaid/Negotiable',
          duration: duration || '1-3 months',
          posted_date: new Date().toISOString(),
          description: `${title} internship at ${company}. Duration: ${duration}. Stipend: ${stipend}`,
          required_skills: keywords.split(' '),
          is_active: true
        });
      }
    });
  } catch (error) {
    logger.warn('Internshala scraping failed', { error: error.message });
  }

  return opportunities;
}

/**
 * Search Devpost for hackathons
 */
async function scrapeHackathons() {
  const opportunities = [];

  try {
    const response = await axios.get('https://devpost.com/hackathons?open_to[]=0', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const $ = cheerio.load(typeof response.data === 'string' ? response.data : '');

    $('.hackathon-tile').each((i, el) => {
      if (i >= 8) return false;

      const title = $(el).find('.title').text().trim();
      const deadline = $(el).find('.submission-period').text().trim();
      const prize = $(el).find('.prize-amount').text().trim();
      const url = 'https://devpost.com' + ($(el).find('a').attr('href') || '');
      const themes = [];
      $(el).find('.theme-label').each((j, theme) => themes.push($(theme).text().trim()));

      if (title) {
        opportunities.push({
          title,
          company: 'Devpost',
          location: 'Online',
          url,
          apply_url: url,
          source: 'Devpost',
          type: 'hackathon',
          prize: prize || 'Various prizes',
          deadline: deadline || null,
          posted_date: new Date().toISOString(),
          description: `Hackathon: ${title}. Themes: ${themes.join(', ')}. Prize: ${prize}`,
          required_skills: themes,
          is_active: true
        });
      }
    });
  } catch (error) {
    logger.warn('Devpost scraping failed', { error: error.message });
  }

  return opportunities;
}

/**
 * Search for scholarships using Tavily
 */
async function searchScholarships(profile) {
  const queries = [
    `scholarship for ${profile.education?.[0]?.field || 'engineering'} students 2024 2025 apply now`,
    `international scholarship ${profile.education?.[0]?.degree || 'undergraduate'} fully funded`,
    `merit scholarship India students 2025 deadline`
  ];

  const results = [];

  for (const query of queries) {
    const tavilyResults = await searchOpportunitiesWithTavily(query, 5);

    for (const result of tavilyResults) {
      results.push({
        title: result.title || 'Scholarship Opportunity',
        company: extractDomain(result.url),
        location: 'Various',
        url: result.url,
        apply_url: result.url,
        source: 'Web Search',
        type: 'scholarship',
        description: result.content?.substring(0, 500) || result.snippet || '',
        posted_date: new Date().toISOString(),
        required_skills: [],
        is_active: true,
        deadline: extractDeadline(result.content || result.snippet || '')
      });
    }
  }

  return results.slice(0, 15);
}

/**
 * Search for fellowships
 */
async function searchFellowships(profile) {
  const field = profile.education?.[0]?.field || 'technology';
  const queries = [
    `fellowship program ${field} 2024 2025 application open`,
    `research fellowship India students apply now`,
    `government fellowship program young professionals India`
  ];

  const results = [];

  for (const query of queries) {
    const tavilyResults = await searchOpportunitiesWithTavily(query, 5);

    for (const result of tavilyResults) {
      results.push({
        title: result.title || 'Fellowship Program',
        company: extractDomain(result.url),
        location: 'Various',
        url: result.url,
        apply_url: result.url,
        source: 'Web Search',
        type: 'fellowship',
        description: result.content?.substring(0, 500) || '',
        posted_date: new Date().toISOString(),
        required_skills: [],
        is_active: true
      });
    }
  }

  return results.slice(0, 10);
}

/**
 * Comprehensive opportunity search based on user profile
 */
async function searchAllOpportunities(profile) {
  const allOpportunities = [];
  const skills = (profile.skills || []).slice(0, 5).join(' ');
  const targetRoles = (profile.target_roles || ['software developer']).slice(0, 2);
  const careerLevel = profile.career_level || 'fresher';

  logger.info('Starting comprehensive opportunity search', { skills, targetRoles });

  // Parallel searches
  const searchPromises = [
    // LinkedIn jobs
    scrapeLinkedInJobs(targetRoles[0] || skills, 'India').catch(() => []),

    // Internshala internships (especially for freshers)
    scrapeInternshala(skills).catch(() => []),

    // Hackathons
    scrapeHackathons().catch(() => []),

    // Tavily job searches
    searchOpportunitiesWithTavily(`${targetRoles[0] || skills} jobs hiring India 2025 apply`, 8).catch(() => []),
    searchOpportunitiesWithTavily(`${skills} internship remote India apply now 2025`, 5).catch(() => []),

    // Scholarships
    searchScholarships(profile).catch(() => []),

    // Fellowships
    searchFellowships(profile).catch(() => []),

    // Research opportunities
    searchOpportunitiesWithTavily(`research opportunity ${profile.education?.[0]?.field || 'technology'} India 2025`, 5).catch(() => [])
  ];

  const results = await Promise.allSettled(searchPromises);

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const items = Array.isArray(result.value) ? result.value : [];

      // Convert Tavily results (indices 3, 4, 7) to opportunity format
      if (index === 3 || index === 4 || index === 7) {
        items.forEach(item => {
          if (item.url && item.title) {
            allOpportunities.push({
              title: item.title,
              company: extractDomain(item.url),
              location: extractLocation(item.content || item.snippet || ''),
              url: item.url,
              apply_url: item.url,
              source: 'Web Search',
              type: index === 4 ? 'internship' : index === 7 ? 'research' : 'job',
              description: (item.content || item.snippet || '').substring(0, 600),
              posted_date: new Date().toISOString(),
              required_skills: extractSkillsFromText(item.content || item.snippet || ''),
              is_active: true
            });
          }
        });
      } else {
        allOpportunities.push(...items);
      }
    }
  });

  logger.info(`Found ${allOpportunities.length} total opportunities`);
  return deduplicateOpportunities(allOpportunities);
}

/**
 * Store opportunities in Supabase
 */
async function storeOpportunities(opportunities) {
  if (!opportunities.length) return 0;

  let stored = 0;

  for (const opp of opportunities) {
    try {
      const { error } = await supabaseAdmin
        .from('opportunities')
        .upsert({
          ...opp,
          id: generateOpportunityId(opp),
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (!error) stored++;
    } catch (err) {
      logger.error('Error storing opportunity', { error: err.message, title: opp.title });
    }
  }

  logger.info(`Stored ${stored}/${opportunities.length} opportunities`);
  return stored;
}

/**
 * Remove expired opportunities
 */
async function cleanupExpiredOpportunities() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabaseAdmin
    .from('opportunities')
    .update({ is_active: false })
    .lt('posted_date', thirtyDaysAgo.toISOString())
    .is('deadline', null);

  if (error) {
    logger.error('Cleanup error', { error: error.message });
  } else {
    logger.info('Cleaned up old opportunities');
  }
}

// Helper functions
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

function extractDeadline(text) {
  const patterns = [
    /deadline[:\s]+([A-Za-z]+ \d+,? \d{4})/i,
    /apply by[:\s]+([A-Za-z]+ \d+,? \d{4})/i,
    /last date[:\s]+([A-Za-z]+ \d+,? \d{4})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
  }

  return null;
}

function extractLocation(text) {
  const locations = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'India', 'Remote'];
  for (const loc of locations) {
    if (text.toLowerCase().includes(loc.toLowerCase())) return loc;
  }
  return 'India';
}

function extractSkillsFromText(text) {
  const commonSkills = ['Python', 'JavaScript', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Machine Learning', 'AI', 'Data Science', 'HTML', 'CSS', 'TypeScript', 'Go', 'Rust'];
  return commonSkills.filter(skill => text.toLowerCase().includes(skill.toLowerCase()));
}

function deduplicateOpportunities(opportunities) {
  const seen = new Set();
  return opportunities.filter(opp => {
    const key = `${opp.title?.toLowerCase()}-${opp.company?.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function generateOpportunityId(opp) {
  const str = `${opp.title}-${opp.company}-${opp.source}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + '-' + Date.now().toString(36);
}

module.exports = {
  searchAllOpportunities,
  searchOpportunitiesWithTavily,
  scrapeLinkedInJobs,
  scrapeInternshala,
  scrapeHackathons,
  searchScholarships,
  searchFellowships,
  storeOpportunities,
  cleanupExpiredOpportunities
};
