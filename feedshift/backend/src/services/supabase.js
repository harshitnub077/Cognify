import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[FeedShift] Supabase URL or Key is missing. Database features will fail.');
}

// Use Service Role key for backend to bypass RLS and perform admin updates securely
export const supabase = createClient(supabaseUrl, supabaseKey);
