import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let _supabase: SupabaseClient | null = null;

const getSupabase = (): SupabaseClient => {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set in .env');
    }
    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
};

export const supabase = { auth: { getUser: (token: string) => getSupabase().auth.getUser(token) } };

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Invalid or missing token format' });
    }

    const { data: { user }, error } = await getSupabase().auth.getUser(token);

    if (error || !user) {
      console.log('Auth Error:', error); return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.message?.includes('SUPABASE_URL')) {
      return res.status(503).json({ error: 'Authentication service not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env' });
    }
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
