import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import api from '../lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ user: session?.user || null, isLoading: false });
      
      if (session?.user) {
        api.post('/auth/sync').catch(e => console.error('Failed to sync user', e));
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user || null });
        if (session?.user) {
          api.post('/auth/sync').catch(e => console.error('Failed to sync user', e));
        }
      });
    } catch (error) {
      console.error('Failed to initialize auth', error);
      set({ isLoading: false });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  }
}));
