// backend/src/services/profileStore.js — Supabase profile CRUD + signal processing

import { createClient } from '@supabase/supabase-js';
import { mapProfileToClient } from '../utils/mappers.js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:8000',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key'
);

const TABLE = 'profiles';

/**
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? mapProfileToClient(data) : null;
}

/**
 * Create or update a profile using flat column layout (snake_case to match DB schema).
 * @param {object} profile - UserProfile (camelCase)
 * @returns {Promise<object>}
 */
export async function upsertProfile(profile) {
  const row = {
    user_id: profile.userId,
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

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return mapProfileToClient(data);
}

/**
 * Soft-delete a profile.
 * @param {string} userId
 */
export async function deleteProfile(userId) {
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Process a learning signal — updates channel_trust in place.
 * @param {object} signal - LearningSignal
 */
export async function processSignal(signal) {
  if (!signal.video?.channel || !signal.userId) return;

  const { data: row } = await supabase
    .from(TABLE)
    .select('channel_trust')
    .eq('user_id', signal.userId)
    .single();

  if (!row) return;

  const channelTrust = row.channel_trust || {};
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

  await supabase
    .from(TABLE)
    .update({ channel_trust: channelTrust, updated_at: new Date().toISOString() })
    .eq('user_id', signal.userId);
}
