const BACKEND_URL = 'http://localhost:3001'; // Adjust as needed in production

let skipAccumulator = 0;

/**
 * Extracts normalized, unique keywords from a video title.
 * @param {string} title 
 * @returns {string[]} Max 6 keywords
 */
export function extractKeywords(title) {
  if (!title) return [];
  
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'how', 'why', 'what', 'is', 'this', 'that', 
    'with', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'from', 'part', 'full', 
    'my', 'your', 'best', 'top'
  ]);

  // Remove punctuation and numbers, convert to lowercase
  const cleanStr = title.replace(/[^\w\s]|[\d_]/g, '').toLowerCase();
  const words = cleanStr.split(/\s+/);
  
  const keywords = [];
  for (const word of words) {
    if (word.length > 3 && !stopwords.has(word) && !keywords.includes(word)) {
      keywords.push(word);
      if (keywords.length >= 6) break;
    }
  }

  return keywords;
}

/**
 * Helper to update and clamp channel trust.
 */
function updateChannelTrust(channelTrustObj, channelId, delta) {
  const current = channelTrustObj[channelId] || 50;
  let newTrust = current + delta;
  newTrust = Math.max(0, Math.min(100, Math.round(newTrust)));
  channelTrustObj[channelId] = newTrust;
  return newTrust;
}

/**
 * Apply a signal to the given profile state, update local storage, and optionally sync backend.
 * @param {Object} signal - { type, video, watchPercent, channelId, topicMatch, userId }
 * @param {Object} profile - The current profile object.
 * @returns {Promise<Object>} updated profile
 */
export async function applySignal(signal, profile) {
  const { type, video = {}, watchPercent = 0, channelId, topicMatch, userId } = signal;
  
  // Clone profile to prevent accidental mutation side-effects before save
  const updatedProfile = JSON.parse(JSON.stringify(profile));
  
  // Ensure necessary structures exist
  if (!updatedProfile.channel_trust) updatedProfile.channel_trust = {};
  if (!updatedProfile.confirmed_topics) updatedProfile.confirmed_topics = [];
  if (!updatedProfile.blocked_topics) updatedProfile.blocked_topics = [];
  if (!updatedProfile.sessionWhitelist) updatedProfile.sessionWhitelist = [];
  // Optionally structure to map topicMatch to channels, if required for +3 logic
  if (!updatedProfile.channel_topics) updatedProfile.channel_topics = {};
  
  let shouldSync = false;
  let signalPayload = { type, channelId, watchPercent };

  if (type === 'USER_ALLOWED') {
    const keywords = extractKeywords(video.title);
    
    // Add to confirmedTopics (dedup, max 50)
    if (keywords.length > 0) {
      updatedProfile.confirmed_topics = [...new Set([...updatedProfile.confirmed_topics, ...keywords])].slice(-50);
      signalPayload.titleKeywords = keywords;
    }
    
    if (channelId) {
      updateChannelTrust(updatedProfile.channel_trust, channelId, 15);
      
      // Track topic match for this channel if present
      if (topicMatch && topicMatch !== 'None') {
        updatedProfile.channel_topics[channelId] = topicMatch;
        
        // Raise trust of all channels with same topic_match by +3
        for (const [chId, tMatch] of Object.entries(updatedProfile.channel_topics)) {
          if (chId !== channelId && tMatch === topicMatch) {
            updateChannelTrust(updatedProfile.channel_trust, chId, 3);
          }
        }
      }
    }

    shouldSync = true;
  } 
  else if (type === 'USER_BLOCKED') {
    const keywords = extractKeywords(video.title);
    
    // Add to blockedTopics
    if (keywords.length > 0) {
      updatedProfile.blocked_topics = [...new Set([...updatedProfile.blocked_topics, ...keywords])].slice(-50);
      signalPayload.titleKeywords = keywords;
    }
    
    if (channelId) {
      updateChannelTrust(updatedProfile.channel_trust, channelId, -20);
    }

    shouldSync = true;
  }
  else if (type === 'WATCH_TIME') {
    if (channelId) {
      const current = updatedProfile.channel_trust[channelId] || 50;
      const newTrust = Math.round(0.7 * current + 0.3 * watchPercent);
      updatedProfile.channel_trust[channelId] = Math.max(0, Math.min(100, newTrust));
    }
    
    if (watchPercent >= 90 && channelId) {
      if (!updatedProfile.sessionWhitelist.includes(channelId)) {
        updatedProfile.sessionWhitelist.push(channelId);
      }
    }
    
    shouldSync = true;
  }
  else if (type === 'SKIP') {
    if (channelId) {
      updateChannelTrust(updatedProfile.channel_trust, channelId, -3);
    }
    
    skipAccumulator++;
    if (skipAccumulator >= 10) {
      shouldSync = true;
      skipAccumulator = 0;
    } else {
      shouldSync = false;
    }
  }

  // Update local chrome storage immediately
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ userProfile: updatedProfile });
  }

  // Sync with backend (fire and forget)
  if (shouldSync && userId) {
    fetch(`${BACKEND_URL}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, signal: signalPayload })
    }).catch(err => console.error('Failed to post signal to backend:', err));
  }

  return updatedProfile;
}

/**
 * SESSION-TIME LEARNING:
 * Evaluates session study times over 7 days of data to update typical study hours.
 * Track timestamps of when study mode is active using: { activatedAt, deactivatedAt }
 * 
 * @param {Array} sessionData - Array of { activatedAt, deactivatedAt } timestamps
 * @param {Object} profile - Current user profile
 */
export function evaluateSessionLearning(sessionData, profile) {
  // Check if we have 7 days span
  if (!sessionData || sessionData.length === 0) return profile;
  
  const earliest = new Date(Math.min(...sessionData.map(d => d.activatedAt)));
  const latest = new Date(Math.max(...sessionData.map(d => d.deactivatedAt)));
  
  const spanDays = (latest - earliest) / (1000 * 60 * 60 * 24);
  if (spanDays < 7) {
    return profile; // Not enough data
  }

  let weekdayStarts = [], weekdayEnds = [];
  let weekendStarts = [], weekendEnds = [];

  sessionData.forEach(session => {
    const act = new Date(session.activatedAt);
    const deact = new Date(session.deactivatedAt);
    const day = act.getDay();
    
    const startHour = act.getHours() + (act.getMinutes() / 60);
    const endHour = deact.getHours() + (deact.getMinutes() / 60);

    if (day === 0 || day === 6) { // Sunday = 0, Saturday = 6
      weekendStarts.push(startHour);
      weekendEnds.push(endHour);
    } else {
      weekdayStarts.push(startHour);
      weekdayEnds.push(endHour);
    }
  });

  const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const updatedProfile = JSON.parse(JSON.stringify(profile));
  if (!updatedProfile.study_hours) {
    updatedProfile.study_hours = { weekday: [], weekend: [] };
  }

  const wds = avg(weekdayStarts);
  const wde = avg(weekdayEnds);
  if (wds !== null && wde !== null) {
    updatedProfile.study_hours.weekday = [Math.floor(wds), Math.ceil(wde)];
  }

  const wks = avg(weekendStarts);
  const wke = avg(weekendEnds);
  if (wks !== null && wke !== null) {
    updatedProfile.study_hours.weekend = [Math.floor(wks), Math.ceil(wke)];
  }

  return updatedProfile;
}
