// dashboardSync.js — Auto-syncs profile settings from Next.js dashboard to Chrome Extension

window.addEventListener('message', (event) => {
  // Only accept messages from the same page
  if (event.source !== window) return;

  if (event.data && event.data.type === 'FEEDSHIFT_SYNC_PROFILE') {
    const { profile } = event.data;
    if (profile) {
      chrome.storage.local.set({ feedshift_profile: profile }, () => {
        console.log('[FeedShift Extension] Successfully synced profile from dashboard:', profile);
      });
    }
  }
});
