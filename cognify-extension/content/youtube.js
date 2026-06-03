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
  badge.className = 'cognify-badge cognify-badge--loading';
  badge.textContent = '⚙️ Cognify analyzing...';
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
  if (score > 60) {
    color = '#10B981'; // green
    verdictText = 'WATCH';
  } else if (score < 30) {
    color = '#EF4444'; // red
    verdictText = 'SKIP';
  }

  if (isConscious) {
    verdictText = 'WATCH';
  }

  const badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.className = 'cognify-badge';
  badge.style.borderLeftColor = color;
  badge.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span class="cognify-verdict" style="color:${color}">${verdictText}</span>
      <span class="cognify-sep">·</span>
      <span>${emoji} ${dominant}</span>
      <span class="cognify-sep">·</span>
      <span>${score}% Goal Match</span>
    </div>
    <div style="font-size: 11px; margin-top: 4px; color: var(--yt-spec-text-secondary); line-height: 1.3;">
      ${data.summary || 'Content aligns with your current focus.'}
    </div>
  `;

  insertBadge(badge);
}

function injectErrorBadge(msg) {
  removeBadge();
  const badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.className = 'cognify-badge cognify-badge--error';
  badge.textContent = `⚠️ ${msg}`;
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

  // Extract title and transcript directly from the YouTube player to avoid SPA staleness
  const data = await extractDataFromPlayer(currentVideoId);
  const title = data.title || document.title.replace(' - YouTube', '');
  const transcript = data.transcript;

  // Send to service worker
  chrome.runtime.sendMessage(
    { type: 'ANALYZE', url, title, transcript },
    (response) => {
      if (chrome.runtime.lastError) {
        injectErrorBadge('Reload extension (service worker not ready)');
        return;
      }
      if (response?.error) {
        injectErrorBadge(response.error);
        return;
      }
      if (response?.data) {
        injectResultBadge(response.data);
      }
    }
  );
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
