const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_CDN_URL } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
}
if (!SUPABASE_CDN_URL) {
  throw new Error('Missing required env var: SUPABASE_CDN_URL must be set');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

module.exports = supabase;
