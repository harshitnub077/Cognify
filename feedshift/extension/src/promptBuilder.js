// promptBuilder.js — builds dynamic AI prompt from user profile

/**
 * Assembles a dynamic AI prompt from the user's profile to classify a video.
 * Kept strictly under 600 tokens for GPT-4o-mini context efficiency.
 *
 * @param {import('../../shared/types/profile.js').UserProfile} profile
 * @param {import('../../shared/types/profile.js').VideoMetadata} video
 * @returns {string} Highly optimized prompt string
 */
export function buildClassificationPrompt(profile, video) {
  // 1. Format interests with depth
  const interests = profile.interests
    .map(i => `- ${i.topic} (Depth: ${i.depth})`)
    .join('\n');

  // 2 & 3. Format confirmed/blocked topics
  const confirmed = profile.confirmedTopics?.length ? profile.confirmedTopics.join(', ') : 'none';
  const blocked = profile.blockedTopics?.length ? profile.blockedTopics.join(', ') : 'none';

  // 4. Goal
  const goalText = profile.goal?.text ? `Primary Goal: "${profile.goal.text}"` : '';

  // 5. Channel Trust
  const channelNameLower = video.channel.toLowerCase();
  const trustScore = profile.channelTrust && profile.channelTrust[channelNameLower] !== undefined 
    ? profile.channelTrust[channelNameLower] 
    : 'Unknown';

  // 6. Video excerpt (max 200 chars to save tokens)
  const descExcerpt = video.description ? video.description.slice(0, 200).replace(/\n/g, ' ') : 'No description';

  return `You are FeedShift, an AI filtering YouTube feeds based on user goals.

USER PROFILE:
Interests:
${interests}
Confirmed Topics (always allow): ${confirmed}
Blocked Topics (always block): ${blocked}
Entertainment Tolerance: ${profile.tolerance.entertainment}%
Related Content Tolerance: ${profile.tolerance.related}%
Channel Trust Score: ${trustScore}/100
${goalText}

VIDEO TO CLASSIFY:
Title: "${video.title}"
Channel: "${video.channel}"
Description: "${descExcerpt}..."

TASK:
Decide if this video serves the user's stated interests or goals.
- "ALLOW" = aligns with interests/goals or acceptable related content.
- "BLOCK" = off-topic, distracting, or pure entertainment exceeding tolerance.
- Depth matters: If user is "beginner", block highly advanced papers. If "advanced", block "what is X" basics.
- If confidence is < 0.70, you MUST default to "ALLOW" (never miss potentially useful content).

Respond with pure JSON only (no markdown formatting):
{
  "verdict": "ALLOW" | "BLOCK",
  "confidence": 0.0 to 1.0,
  "reason": "short 1-sentence explanation",
  "topicMatch": "matched interest topic or null"
}`;
}
