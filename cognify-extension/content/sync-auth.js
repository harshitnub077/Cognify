// sync-auth.js — Syncs Supabase auth token from Dashboard to Chrome Storage

let cachedToken = null;

function syncToken() {
  try {
    const keys = Object.keys(localStorage);
    const supabaseKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    
    if (supabaseKey) {
      const dataStr = localStorage.getItem(supabaseKey);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        const token = data?.access_token || data?.currentSession?.access_token;
        
        if (token && token !== cachedToken) {
          cachedToken = token;
          chrome.storage.local.set({ cognify_token: token }, () => {
             console.log('[Cognify] Auth token synced successfully');
          });
        }
        return; // Token found and handled
      }
    }
    
    // If no valid key or token is found
    if (cachedToken !== null) {
      cachedToken = null;
      chrome.storage.local.remove('cognify_token', () => {
         console.log('[Cognify] Auth token removed');
      });
    }
  } catch (e) {
    console.error('[Cognify] Error parsing auth token:', e);
  }
}

// Initial sync
syncToken();

// Listen for storage changes
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('sb-') && e.key.endsWith('-auth-token')) {
    syncToken();
  }
});

// Poll every 2 seconds to catch SPA login/logout
setInterval(syncToken, 2000);

// Inject an invisible DOM marker to notify the React frontend that the extension is installed
const marker = document.createElement('div');
marker.id = 'cognify-extension-installed';
marker.style.display = 'none';
document.body.appendChild(marker);
