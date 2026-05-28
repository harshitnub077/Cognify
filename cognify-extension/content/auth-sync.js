// Sync Supabase Auth Token from Dashboard to Extension
function syncToken() {
    let tokenFound = false;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            let session = null;
            let rawValue = localStorage.getItem(key);
            
            try {
                session = JSON.parse(rawValue || '{}');
            } catch (e) {
                console.warn(`Cognify: Failed to parse JSON for key ${key}. Value was:`, rawValue);
                continue;
            }

            if (session && session.access_token) {
                tokenFound = true;
                try {
                    if (chrome && chrome.runtime && chrome.runtime.id) {
                        chrome.runtime.sendMessage({ 
                            type: 'SYNC_TOKEN', 
                            token: session.access_token 
                        }).then(response => {
                            if (response && response.success) {
                                console.log('Cognify: Successfully synced token to extension ✅');
                            }
                        }).catch(e => {
                            console.debug('Cognify: Background script asleep or unavailable.', e.message);
                        });
                        return true;
                    } else {
                        console.error('Cognify: chrome.runtime is missing. Please refresh the page!');
                    }
                } catch (err) {
                    console.error('Cognify: Extension context invalidated. YOU MUST REFRESH THIS TAB!', err);
                }
            }
        }
    }
    
    if (!tokenFound) {
        console.debug('Cognify: No Supabase session found in localStorage yet.');
    }
    return false;
}

// Check initially
syncToken();

// Monitor changes to localStorage
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('sb-') && e.key.endsWith('-auth-token')) {
        syncToken();
    }
});

// Since single page app might update localStorage without triggering 'storage' event in same window:
setInterval(syncToken, 2000);
