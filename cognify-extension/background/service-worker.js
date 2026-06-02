// API Base URL
const API_BASE = 'http://localhost:3001/api';

// On install, setup initial state
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ extension_active: true, analysis_history: [] });
  // Side panel should open on specific triggers, not on action click (since we have a popup)
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_TOKEN') {
    (async () => {
      await chrome.storage.local.set({ cognify_token: message.token });
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === 'GET_USER_TOKEN') {
    (async () => {
      const data = await chrome.storage.local.get('cognify_token');
      sendResponse({ token: data.cognify_token || null });
    })();
    return true; // Keep channel open for async
  }

  if (message.type === 'OPEN_SIDE_PANEL') {
    (async () => {
      // Must use the windowId of the sender
      if (sender.tab && sender.tab.windowId) {
        try {
            await chrome.sidePanel.open({ windowId: sender.tab.windowId });
        } catch (err) {
            console.error('Failed to open side panel:', err);
        }
      }
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === 'ANALYZE_CONTENT') {
    (async () => {
      try {
        const { cognify_token, extension_active } = await chrome.storage.local.get(['cognify_token', 'extension_active']);
        
        if (!extension_active) {
            return sendResponse({ success: false, error: 'Extension disabled' });
        }
        
        if (!cognify_token) {
          return sendResponse({ success: false, status: 401, error: 'Unauthorized' });
        }

        const response = await fetch(`${API_BASE}/content/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cognify_token}`
          },
          body: JSON.stringify({
            url: message.url,
            title: message.title,
            platform: message.platform
          })
        });

        if (response.status === 401) {
          await chrome.storage.local.remove('cognify_token');
          return sendResponse({ success: false, status: 401, error: 'Unauthorized' });
        }

        const data = await response.json();
        
        if (data.success) {
            // Save to offline cache (last 20)
            const { analysis_history = [] } = await chrome.storage.local.get('analysis_history');
            const newHistory = [data.data, ...analysis_history].slice(0, 20);
            
            // Set current active analysis for the side panel
            await chrome.storage.local.set({ 
                analysis_history: newHistory,
                active_analysis: data.data
            });
            
            sendResponse({ success: true, data: data.data });
        } else {
            sendResponse({ success: false, error: data.error });
        }

      } catch (error) {
        console.error('Analysis API Error:', error);
        sendResponse({ success: false, error: 'Network Error', willRetry: true });
      }
    })();
    return true; 
  }
});
