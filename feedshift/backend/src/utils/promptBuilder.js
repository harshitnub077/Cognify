/**
 * Builds the prompt for the AI classification.
 * @param {Object} profileSnapshot - The user's profile configuration.
 * @param {Object} videoMetadata - Details about the video to classify.
 * @returns {string} The constructed prompt, kept under 500 tokens if possible.
 */
export function buildClassificationPrompt(profileSnapshot, videoMetadata) {
  const { interests = [], confirmedTopics = [], blockedTopics = [], goal = '', trustScore = 50 } = profileSnapshot;
  const { title = '', channelName = '', description = '', tags = [] } = videoMetadata;

  let prompt = `You are a content relevance classifier for a personalized YouTube feed.\n`;

  prompt += `\nUser Profile:\n`;
  if (interests.length > 0) {
    prompt += `- Interests:\n`;
    interests.forEach(interest => {
      prompt += `  * ${interest.topic} (Level: ${interest.depth})\n`;
    });
  } else {
    prompt += `- Interests: None specified.\n`;
  }

  if (confirmedTopics.length > 0) {
    prompt += `- Confirmed Topics: ${confirmedTopics.join(', ')}\n`;
  }
  if (blockedTopics.length > 0) {
    prompt += `- Blocked Topics: ${blockedTopics.join(', ')}\n`;
  }
  if (goal) {
    prompt += `- Goal: ${goal}\n`;
  }

  prompt += `- Channel Trust Score (0-100, >50 is good): ${trustScore}\n`;

  // Truncate description to keep prompt size under ~500 tokens.
  const shortDescription = description ? description.substring(0, 300).replace(/\n/g, ' ') : 'N/A';
  const shortTags = tags && tags.length > 0 ? tags.slice(0, 10).join(', ') : 'N/A';

  prompt += `\nVideo Details:\n`;
  prompt += `- Title: ${title}\n`;
  prompt += `- Channel: ${channelName}\n`;
  prompt += `- Description: ${shortDescription}\n`;
  prompt += `- Tags: ${shortTags}\n`;

  prompt += `\nInstructions:\n`;
  prompt += `Based on the user's profile and the video details, determine if this video should be ALLOWED or BLOCKED in their feed.\n`;
  prompt += `STRICT FILTER RULE: If the video is highly educational, deeply insightful, or directly matches the User's Interests or Goal, verdict MUST be "ALLOW".\n`;
  prompt += `STRICT FILTER RULE: If the video is purely entertainment (e.g., gaming, pranks, vlogs, gossip, clickbait), useless distractions, or COMPLETELY UNRELATED to the User's Interests, verdict MUST be "BLOCK". Do not allow unrelated content just because it is harmless.\n`;
  prompt += `Respond ONLY with a JSON object containing the following keys:\n`;
  prompt += `- "verdict": strictly "ALLOW" or "BLOCK"\n`;
  prompt += `- "confidence": a number between 0.0 and 1.0 representing your confidence.\n`;
  prompt += `- "reason": a short explanation for your decision (max 2 sentences).\n`;
  prompt += `- "topicMatch": the name of the matched interest topic or "None".\n`;

  return prompt;
}
