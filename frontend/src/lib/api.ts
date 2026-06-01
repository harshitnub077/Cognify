import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // adjust if needed based on env
});

// Interceptor to inject Supabase Auth Token
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export default api;
