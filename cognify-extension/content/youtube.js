// youtube.js — Cognify Content Script for YouTube
// Detects video navigation (SPA) and injects analysis badge

const BADGE_ID = 'cognify-analysis-badge';
let lastUrl = '';

// ─── Utilities ───────────────────────────────────────────────────────────────

function removeBadge() {
  const existing = document.getElementById(BADGE_ID);
  if (existing) existing.remove();
}

function injectLoadingBadge() {
  removeBadge();
  const badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.innerHTML = `
    <div class="cognify-badge-header">
      <div class="cognify-badge-stats">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span class="cognify-badge-score" style="color: #A1A1AA; font-size: 14px;">Scanning neural relevance...</span>
      </div>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    </div>
  `;
  insertBadge(badge);
}

function injectResultBadge(data) {
  removeBadge();

  const score = Math.round(data.score || 0);
  const isConscious = data.isConscious || false;

  // Color based on goal alignment
  let color = '#F59E0B'; // amber default
  let verdictText = 'SUBOPTIMAL';
  let dotClass = '';
  
  if (score >= 50) {
    color = '#10B981'; // green
    verdictText = 'OPTIMAL';
  } else {
    color = '#EF4444'; // red
    verdictText = 'IRRELEVANT';
    dotClass = 'pulse';
  }

  if (isConscious) {
    verdictText = 'OPTIMAL';
    color = '#10B981';
    dotClass = '';
  }

  const badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.innerHTML = `
    <div class="cognify-badge-header">
      <div class="cognify-badge-stats">
        <div class="cognify-badge-dot ${dotClass}" style="background-color: ${color}; box-shadow: 0 0 8px ${color};"></div>
        <span class="cognify-badge-verdict" style="color: ${color};">${verdictText}</span>
        <div class="cognify-badge-separator"></div>
        <span class="cognify-badge-score">${score}% Synced</span>
      </div>
      <a href="http://localhost:5173/dashboard" target="_blank" class="cognify-badge-dashboard-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
        Dashboard
      </a>
    </div>
    <div class="cognify-badge-summary">
      ${data.summary || 'Neural pathways aligned. Safe for consumption.'}
    </div>
  `;

  insertBadge(badge);
}

function injectErrorBadge(msg) {
  removeBadge();
  const badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.innerHTML = `
    <div class="cognify-badge-header">
      <div class="cognify-badge-stats">
        <div class="cognify-badge-dot" style="background-color: #EF4444; box-shadow: 0 0 8px #EF4444;"></div>
        <span class="cognify-badge-verdict" style="color:#EF4444;">ERROR</span>
        <div class="cognify-badge-separator"></div>
        <span class="cognify-badge-score" style="color: #A1A1AA; font-size: 14px;">${msg}</span>
      </div>
    </div>
  `;
  insertBadge(badge);
}

let insertInterval = null;

function insertBadge(badgeEl) {
  if (insertInterval) {
    clearInterval(insertInterval);
    insertInterval = null;
  }

  // Try to insert below video title
  const tryInsert = () => {
    const title = document.querySelector('#title h1') ||
                  document.querySelector('h1.ytd-video-primary-info-renderer') ||
                  document.querySelector('#above-the-fold #title') ||
                  document.querySelector('ytd-reel-player-header-renderer h2');
    
    // Find the currently active/visible title by checking offsetParent
    if (title && title.offsetParent !== null && title.parentNode) {
      // If a badge already exists, remove it first to avoid duplicates
      const existing = document.getElementById(BADGE_ID);
      if (existing) existing.remove();
      
      title.parentNode.insertBefore(badgeEl, title.nextSibling);
      return true;
    }
    return false;
  };

  if (!tryInsert()) {
    // Retry after YouTube finishes lazy-loading
    let tries = 0;
    insertInterval = setInterval(() => {
      tries++;
      if (tryInsert() || tries > 10) {
        clearInterval(insertInterval);
        insertInterval = null;
      }
    }, 500);
  }
}

// ─── Core Analysis ───────────────────────────────────────────────────────────

// Helper to get a stable video ID from any YouTube URL (watch or shorts)
function getVideoId(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.pathname === '/watch') {
      return url.searchParams.get('v');
    }
    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.split('/')[2];
    }
  } catch (e) {}
  return null;
}

function extractDataFromPlayer(expectedVideoId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'EXTRACT_PLAYER_DATA',
      expectedVideoId
    }, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve({ title: document.title.replace(' - YouTube', ''), transcript: null });
      } else {
        resolve(response);
      }
    });
  });
}

async function analyzeCurrentVideo() {
  const url = window.location.href;
  const currentVideoId = getVideoId(url);
  
  if (!currentVideoId) return; // Not a video page
  
  const lastVideoId = lastUrl ? getVideoId(lastUrl) : null;
  if (currentVideoId === lastVideoId) {
    lastUrl = url; // Update lastUrl but skip re-analysis
    return;
  }
  
  lastUrl = url;

  injectLoadingBadge();

  try {
    // Extract title and transcript directly from the YouTube player to avoid SPA staleness
    const data = await extractDataFromPlayer(currentVideoId);
    const title = data.title || document.title.replace(' - YouTube', '');
    const description = data.description || '';
    const transcript = data.transcript;

    // Send to service worker
    chrome.runtime.sendMessage(
      { type: 'ANALYZE', url, title, description, transcript },
      (response) => {
        if (chrome.runtime.lastError) {
          injectErrorBadge('Extension reloading (refresh page)');
          return;
        }
        if (!response || (!response.data && !response.error)) {
          injectErrorBadge('No response from backend');
          return;
        }
        if (response.error) {
          injectErrorBadge(response.error);
          return;
        }
        if (response.data) {
          injectResultBadge(response.data);
        }
      }
    );
  } catch (error) {
    injectErrorBadge('Connection lost. Please refresh the page.');
  }
}

// ─── SPA Navigation Detection ─────────────────────────────────────────────────

// 1. YouTube native event for SPA navigation
document.addEventListener('yt-navigate-finish', () => {
  analyzeCurrentVideo();
});

// 2. Fallback mutation observer (catches initial loads and fallback state changes)
const observer = new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastUrl && getVideoId(url)) {
    analyzeCurrentVideo();
  }
});

observer.observe(document.querySelector('title') || document.documentElement, {
  subtree: true,
  childList: true,
  characterData: true
});

// Also run on initial load
setTimeout(analyzeCurrentVideo, 1000);
