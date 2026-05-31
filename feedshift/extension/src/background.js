// extension/src/background.js

// 1. INSTALLATION & UPDATE HANDLER
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/onboarding.html') });
  } else if (details.reason === 'update') {
    // Perform profile schema migration if needed
    const data = await chrome.storage.local.get(['feedshift_profile']);
    if (data.feedshift_profile) {
      let profile = data.feedshift_profile;
      let migrated = false;
      // Example Migration: add missing study_hours object
      if (!profile.studyHours) {
        profile.studyHours = { weekday: [], weekend: [] };
        migrated = true;
      }
      if (migrated) {
        await chrome.storage.local.set({ feedshift_profile: profile });
      }
    }
  }
  chrome.action.setBadgeText({ text: 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: '#888888' });
});

// Helper: Broadcast to all YT tabs
async function broadcastToYoutubeTabs(message) {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (e) {
        // Tab might be asleep or content script not loaded
        console.log(`Failed to send to tab ${tab.id}:`, e);
      }
    }
  } catch (e) {
    console.error('Querying tabs failed:', e);
  }
}

// 2. STORAGE CHANGE LISTENER
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.feedshift_study_mode) {
    const isStudyMode = changes.feedshift_study_mode.newValue;
    if (isStudyMode) {
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#639922' });
      broadcastToYoutubeTabs({ type: 'RESCAN_FEED' });
    } else {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#888888' });
      broadcastToYoutubeTabs({ type: 'UNBLOCK_ALL' });
    }
  }

  if (namespace === 'local' && changes.userProfile) {
    // Invalidate the in-memory cache of the classify module.
    // In MV3 Service Workers, memory is volatile anyway, but if we stored it in session, clear it:
    if (chrome.storage.session) {
      chrome.storage.session.clear();
    }
  }
});

// 3. MESSAGE HANDLER
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROFILE_CREATED') {
    // Sync profile to backend
    fetch('http://localhost:3001/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload)
    }).catch(console.error);
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'SIGNAL') {
    // Relay learning signal to backend with naive retry logic
    const relay = async () => {
      for(let i=0; i<3; i++) {
        try {
          await fetch('http://localhost:3001/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message.payload)
          });
          break; // success
        } catch(e) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    };
    relay();
    sendResponse({ queued: true });
    return false;
  }

  if (message.type === 'GET_STATS') {
    // Aggregate diet_log and return today's stats to popup
    chrome.storage.local.get(['diet_log'], (data) => {
      const log = data.diet_log || [];
      const todayStr = new Date().toISOString().split('T')[0];
      const todayStats = log.filter(e => e.date && e.date.startsWith(todayStr));
      sendResponse({ stats: todayStats });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'TOGGLE_STUDY_MODE') {
    chrome.storage.local.get(['feedshift_study_mode'], (data) => {
      const currentState = !!data.feedshift_study_mode;
      const newState = !currentState;
      chrome.storage.local.set({ feedshift_study_mode: newState });
      sendResponse({ state: newState });
    });
    return true; // Keep channel open for async response
  }
});

// 4. ALARM HANDLER (Daily Sync)
chrome.alarms.create('DAILY_SYNC', { periodInMinutes: 1440, when: Date.now() + 60000 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'DAILY_SYNC') {
    const day = new Date().getDay();
    if (day === 0) {
      console.log('Sunday weekly stats sync executed.');
      // Execute weekly email trigger logic
    }
  }
  
  // 5. INTEREST AUTO-DISCOVERY
  try {
    const { diet_log = [], feedshift_profile } = await chrome.storage.local.get(['diet_log', 'feedshift_profile']);
    if (feedshift_profile && diet_log.length > 50) {
      // Find channels the user frequently watches/allows
      const channelCounts = {};
      diet_log.filter(l => l.verdict === 'ALLOW' || l.verdict === 'OVERRIDE').forEach(l => {
        if (l.channel) {
          channelCounts[l.channel] = (channelCounts[l.channel] || 0) + 1;
        }
      });
      
      const suggestedChannels = Object.entries(channelCounts)
        .filter(([ch, count]) => count >= 5 && !(feedshift_profile.channelTrust && feedshift_profile.channelTrust[ch.toLowerCase()]))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([ch]) => ch);
        
      if (suggestedChannels.length > 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'FeedShift Discovery',
          message: `You've been watching a lot of ${suggestedChannels.join(' & ')}. Want to add them to your trusted channels?`
        });
      }
    }
  } catch (err) {
    console.error('[Background] Auto-discovery error:', err);
  }

  // 6. EXAM MODE SCHEDULER
  // Evaluates every time the alarm fires
  const data = await chrome.storage.local.get(['userProfile', 'feedshift_study_mode']);
  const profile = data.userProfile || data.feedshift_profile; // Fallback to new key
  const isStudyMode = !!data.feedshift_study_mode;

  if (profile && profile.goal && profile.goal.deadline) {
    const deadline = new Date(profile.goal.deadline).getTime();
    const now = Date.now();
    const daysUntilDeadline = (deadline - now) / 86400000;

    if (daysUntilDeadline <= 30 && daysUntilDeadline > 0 && !isStudyMode) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png', // Fallback to assumed icon
        title: 'FeedShift Exam Mode',
        message: `Exam mode activating: ${Math.ceil(daysUntilDeadline)} days until ${profile.goal.title || profile.goal || 'your goal'}!`
      });
      chrome.storage.local.set({ feedshift_study_mode: true });
    } else if (daysUntilDeadline < -2 && isStudyMode) {
      // 2 days after exam -> set study_mode to OFF automatically
      chrome.storage.local.set({ feedshift_study_mode: false });
    }
  }
});

