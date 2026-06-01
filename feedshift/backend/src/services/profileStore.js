// backend/src/services/profileStore.js — Supabase profile CRUD + signal processing with robust offline fallback

import { createClient } from '@supabase/supabase-js';
import { mapProfileToClient } from '../utils/mappers.js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:8000',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key'
);

const TABLE = 'profiles';

// Local in-memory profiles store for offline / development / anonymous fallback
const localProfiles = new Map();

function isSupabasePlaceholder() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  return !url || !key || url.includes('localhost') || key.includes('placeholder') || key.includes('dummy');
}

/**
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getProfile(userId) {
  if (userId === 'anon' || isSupabasePlaceholder()) {
    const p = localProfiles.get(userId);
    return p ? mapProfileToClient(p) : null;
  }
  
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? mapProfileToClient(data) : null;
  } catch (err) {
    console.warn('[ProfileStore] Supabase getProfile failed. Falling back to local store.', err.message);
    const p = localProfiles.get(userId);
    return p ? mapProfileToClient(p) : null;
  }
}

/**
 * Create or update a profile using flat column layout (snake_case to match DB schema).
 * @param {object} profile - UserProfile (camelCase)
 * @returns {Promise<object>}
 */
export async function upsertProfile(profile) {
  const row = {
    user_id: profile.userId || 'anon',
    interests: profile.interests || [],
    tolerance: profile.tolerance,
    goal: profile.goal,
    channel_trust: profile.channelTrust || {},
    confirmed_topics: profile.confirmedTopics || [],
    blocked_topics: profile.blockedTopics || [],
    study_hours: profile.studyHours || { weekday: [], weekend: [] },
    study_mode_active: profile.studyModeActive,
    interest_keywords: profile.interestKeywords || {},
    updated_at: new Date().toISOString(),
  };

  if (profile.userId === 'anon' || isSupabasePlaceholder()) {
    localProfiles.set(profile.userId, row);
    return mapProfileToClient(row);
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return mapProfileToClient(data);
  } catch (err) {
    console.warn('[ProfileStore] Supabase upsertProfile failed. Falling back to local store.', err.message);
    localProfiles.set(profile.userId, row);
    return mapProfileToClient(row);
  }
}

/**
 * Soft-delete a profile.
 * @param {string} userId
 */
export async function deleteProfile(userId) {
  if (userId === 'anon' || isSupabasePlaceholder()) {
    localProfiles.delete(userId);
    return;
  }

  try {
    const { error } = await supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw error;
  } catch (err) {
    console.warn('[ProfileStore] Supabase deleteProfile failed. Falling back to local store.', err.message);
    localProfiles.delete(userId);
  }
}

/**
 * Process a learning signal — updates channel_trust in place.
 * @param {object} signal - LearningSignal
 */
export async function processSignal(signal) {
  if (!signal.video?.channel || !signal.userId) return;

  const userId = signal.userId;

  let currentProfile;
  if (userId === 'anon' || isSupabasePlaceholder()) {
    currentProfile = localProfiles.get(userId);
  } else {
    try {
      const { data } = await supabase
        .from(TABLE)
        .select('channel_trust')
        .eq('user_id', userId)
        .single();
      currentProfile = data;
    } catch (err) {
      console.warn('[ProfileStore] Supabase processSignal fetch failed. Falling back to local store.', err.message);
      currentProfile = localProfiles.get(userId);
    }
  }

  const channelTrust = currentProfile?.channel_trust || currentProfile?.channelTrust || {};
  const channel = signal.video.channel.toLowerCase();
  const current = channelTrust[channel] ?? 50;

  switch (signal.type) {
    case 'WATCH_TIME':
      if ((signal.watchPercent ?? 0) >= 70) {
        channelTrust[channel] = Math.min(100, current + 3);
      }
      break;
    case 'USER_ALLOWED':
      channelTrust[channel] = Math.min(100, current + 5);
      break;
    case 'USER_BLOCKED':
      channelTrust[channel] = Math.max(0, current - 10);
      break;
    case 'SKIP':
      channelTrust[channel] = Math.max(0, current - 2);
      break;
  }

  if (userId === 'anon' || isSupabasePlaceholder()) {
    const localRow = localProfiles.get(userId) || { user_id: userId };
    localRow.channel_trust = channelTrust;
    localRow.updated_at = new Date().toISOString();
    localProfiles.set(userId, localRow);
  } else {
    try {
      await supabase
        .from(TABLE)
        .update({ channel_trust: channelTrust, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[ProfileStore] Supabase processSignal update failed. Saving to local store.', err.message);
      const localRow = localProfiles.get(userId) || { user_id: userId };
      localRow.channel_trust = channelTrust;
      localRow.updated_at = new Date().toISOString();
      localProfiles.set(userId, localRow);
    }
  }
}
