const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

const isValidUrl = (url) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
};

const supabaseUrl = isValidUrl(process.env.SUPABASE_URL)
  ? process.env.SUPABASE_URL
  : 'https://placeholder.supabase.co';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_KEY.includes('your_supabase')
  ? process.env.SUPABASE_SERVICE_KEY
  : 'placeholder_service_role_key';

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY.includes('your_supabase')
  ? process.env.SUPABASE_ANON_KEY
  : 'placeholder_anon_key';

if (supabaseUrl.includes('placeholder') || supabaseServiceKey.includes('placeholder')) {
  logger.warn('Supabase credentials not configured. Database features will be unavailable.');
}

// Admin client with service role (bypasses RLS)
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Public client with anon key
const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

module.exports = { supabase, supabaseAdmin };
