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
  badge.className = 'cognify-badge';
  badge.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 14px; font-weight: 500; opacity: 0.8;">⚙️ Cognify analyzing...</span>
    </div>
  `;
  insertBadge(badge);
}

function injectResultBadge(data) {
  removeBadge();

  const dominant = data.dominantEmotion || 'neutral';
  const score = Math.round(data.score || 0);
  const isConscious = data.isConscious || false;

  const emojiMap = {
    joy: '😄', anger: '😠', fear: '😨',
    sadness: '😢', surprise: '😮', disgust: '🤢', neutral: '😐'
  };
  const emoji = emojiMap[dominant] || '😐';

  // Color based on goal alignment
  let color = '#F59E0B'; // amber default
  let verdictText = 'CAUTION';
  let dotClass = '';
  
  if (score >= 50) {
    color = '#10B981'; // green
    verdictText = 'WATCH';
  } else {
    color = '#EF4444'; // red
    verdictText = '⚠️ WASTE WARNING';
    dotClass = 'cognify-pulse-dot';
  }

  if (isConscious) {
    verdictText = 'WATCH';
    color = '#10B981';
    dotClass = '';
  }

  const badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.className = 'cognify-badge';
  badge.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="${dotClass}" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; box-shadow: 0 0 8px ${color}80;"></div>
        <span style="color:${color}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${verdictText}</span>
        <span class="cognify-separator">|</span>
        <span style="font-size: 14px; font-weight: 500; opacity: 0.9;">${emoji} <span style="text-transform: capitalize;">${dominant}</span></span>
        <span class="cognify-separator">|</span>
        <span style="font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; opacity: 0.8;">${score}% Match</span>
      </div>
      <div style="font-size: 14px; line-height: 1.5; color: rgba(150, 150, 150, 0.9); font-weight: 400; padding-left: 16px; border-left: 1px solid rgba(150, 150, 150, 0.2); margin-left: 3px; margin-top: 2px;">
        ${data.summary || 'Content aligns with your current focus.'}
      </div>
    </div>
  `;

  insertBadge(badge);
}

function injectErrorBadge(msg) {
  removeBadge();
  const badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.className = 'cognify-badge';
  badge.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #EF4444; box-shadow: 0 0 8px #EF444480;"></div>
      <span style="color:#EF4444; font-weight: 600; font-size: 14px;">⚠️ ${msg}</span>
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
