const cron = require('node-cron');
const { logger } = require('../utils/logger');
const { searchAllOpportunities, storeOpportunities, cleanupExpiredOpportunities } = require('../services/searchEngine');
const { sendDailyNotifications } = require('../services/whatsapp');
const { supabaseAdmin } = require('../utils/supabase');
const { runMatchingForUser } = require('../services/matchingEngine');

let schedulers = {};

/**
 * Start all background schedulers
 */
function startSchedulers() {
  // Search for new opportunities every 6 hours
  schedulers.opportunitySearch = cron.schedule(
    process.env.OPPORTUNITY_SEARCH_CRON || '0 */6 * * *',
    async () => {
      logger.info('🔍 Starting scheduled opportunity search');
      try {
        await runOpportunitySearch();
      } catch (error) {
        logger.error('Scheduled search failed', { error: error.message });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  // Send daily notifications at 9 AM IST
  schedulers.dailyNotifications = cron.schedule(
    process.env.MATCH_NOTIFY_CRON || '0 9 * * *',
    async () => {
      logger.info('📱 Starting daily notification job');
      try {
        await sendDailyNotifications();
      } catch (error) {
        logger.error('Notification job failed', { error: error.message });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  // Cleanup expired opportunities daily at 2 AM
  schedulers.cleanup = cron.schedule(
    process.env.CLEANUP_CRON || '0 2 * * *',
    async () => {
      logger.info('🧹 Starting cleanup job');
      try {
        await cleanupExpiredOpportunities();
      } catch (error) {
        logger.error('Cleanup job failed', { error: error.message });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  // Re-run matching for all users every 12 hours
  schedulers.matching = cron.schedule(
    '0 */12 * * *',
    async () => {
      logger.info('🎯 Starting periodic matching job');
      try {
        await runPeriodicMatching();
      } catch (error) {
        logger.error('Matching job failed', { error: error.message });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  logger.info('All schedulers started', {
    opportunitySearch: process.env.OPPORTUNITY_SEARCH_CRON || '0 */6 * * *',
    notifications: process.env.MATCH_NOTIFY_CRON || '0 9 * * *',
    cleanup: process.env.CLEANUP_CRON || '0 2 * * *'
  });
}

/**
 * Search and store opportunities based on all active user profiles
 */
async function runOpportunitySearch() {
  // Get all active user profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .limit(50);

  if (!profiles?.length) {
    logger.info('No profiles found for opportunity search');
    return;
  }

  // Use first few profiles to guide searches (to avoid duplicate searches)
  const sampleProfiles = profiles.slice(0, 5);
  let totalStored = 0;

  for (const profile of sampleProfiles) {
    try {
      const opportunities = await searchAllOpportunities(profile);
      const stored = await storeOpportunities(opportunities);
      totalStored += stored;
      logger.info(`Stored ${stored} opportunities for profile ${profile.user_id}`);
    } catch (error) {
      logger.error('Error in opportunity search for profile', { error: error.message });
    }
  }

  logger.info(`Opportunity search complete. Total stored: ${totalStored}`);
}

/**
 * Run matching for all users periodically
 */
async function runPeriodicMatching() {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id')
    .limit(100);

  if (!users?.length) return;

  for (const user of users) {
    try {
      await runMatchingForUser(user.id, false);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    } catch (error) {
      logger.error('Matching error for user', { userId: user.id, error: error.message });
    }
  }

  logger.info(`Periodic matching complete for ${users.length} users`);
}

/**
 * Stop all schedulers
 */
function stopSchedulers() {
  Object.values(schedulers).forEach(scheduler => {
    if (scheduler?.stop) scheduler.stop();
  });
  logger.info('All schedulers stopped');
}

module.exports = { startSchedulers, stopSchedulers, runOpportunitySearch };
