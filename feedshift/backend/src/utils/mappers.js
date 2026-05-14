/**
 * Maps a database profile record (snake_case) to the shared UserProfile type (camelCase).
 * @param {object} dbProfile
 * @returns {object}
 */
export function mapProfileToClient(dbProfile) {
  if (!dbProfile) return null;
  return {
    userId: dbProfile.user_id,
    interests: dbProfile.interests || [],
    tolerance: dbProfile.tolerance || { entertainment: 10, related: 30 },
    goal: dbProfile.goal,
    channelTrust: dbProfile.channel_trust || {},
    confirmedTopics: dbProfile.confirmed_topics || [],
    blockedTopics: dbProfile.blocked_topics || [],
    studyHours: dbProfile.study_hours || { weekday: [], weekend: [] },
    installedAt: dbProfile.installed_at,
    lastUpdated: dbProfile.last_updated,
    studyModeActive: dbProfile.study_mode_active,
    interestKeywords: dbProfile.interest_keywords || {}
  };
}

