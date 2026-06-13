// youtube.js — Cognify Content Script for YouTube
// Detects video navigation (SPA) and injects analysis badge

const BADGE_ID = 'cognify-analysis-badge';
let lastUrl = '';

// ─── Badge State & Rendering System ──────────────────────────────────────────

let currentBadgeState = null; // { type: 'loading'|'result'|'error', data?: any, msg?: string }
let insertInterval = null;
let enforceInterval = null;
let shownRecommendedUrls = new Set();

function removeBadge() {
  const existing = document.querySelectorAll('#' + BADGE_ID);
  existing.forEach(el => el.remove());
}

function updateBadgeState(state) {
  currentBadgeState = state;
  renderBadgeFromState();
  
  if (!enforceInterval) {
    enforceInterval = setInterval(() => {
      const existing = document.getElementById(BADGE_ID);
      // Re-insert if removed or hidden by SPA DOM caching
      if (!existing || existing.offsetParent === null) {
        if (existing) existing.remove();
        renderBadgeFromState();
      }
    }, 2000);
  }
}

function renderBadgeFromState() {
  if (!currentBadgeState) return;
  
  removeBadge();
  const badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.className = 'cognify-premium-container';
  
  if (currentBadgeState.type === 'loading') {
    badge.innerHTML = `
      <div class="cognify-badge-inner">
        <div class="cognify-badge-header">
          <div class="cognify-brand-lockup">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
              <rect x="4" y="4" width="32" height="32" rx="8" stroke="currentColor" stroke-width="3" />
              <path d="M24 16L16 24M16 16L24 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <span class="cognify-brand-text">Cognify</span>
          </div>
          <div class="cognify-badge-status-pill loading">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span>Analyzing Neural Relevance...</span>
          </div>
        </div>
      </div>
    `;
  } else if (currentBadgeState.type === 'error') {
    badge.innerHTML = `
      <div class="cognify-badge-inner">
        <div class="cognify-badge-header">
          <div class="cognify-brand-lockup">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
              <rect x="4" y="4" width="32" height="32" rx="8" stroke="currentColor" stroke-width="3" />
              <path d="M24 16L16 24M16 16L24 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <span class="cognify-brand-text">Cognify</span>
          </div>
          <div class="cognify-badge-status-pill error">
            <div class="cognify-badge-dot" style="background-color: #EF4444;"></div>
            <span style="color: #EF4444;">ERROR</span>
          </div>
        </div>
        <div class="cognify-badge-summary error-msg">
          ${currentBadgeState.msg}
        </div>
      </div>
    `;
  } else if (currentBadgeState.type === 'result') {
    const data = currentBadgeState.data;
    const score = Math.round(data.score || 0);
    const isConscious = data.isConscious || false;

    let color = '#F59E0B'; // amber default
    let verdictText = 'SUBOPTIMAL';
    let themeClass = 'theme-amber';
    
    if (score >= 50) {
      color = '#10B981'; // green
      verdictText = 'OPTIMAL';
      themeClass = 'theme-green';
    } else {
      color = '#EF4444'; // red
      verdictText = 'IRRELEVANT';
      themeClass = 'theme-red';
    }

    if (isConscious) {
      verdictText = 'OPTIMAL';
      color = '#10B981';
      themeClass = 'theme-green';
    }

    badge.className = `cognify-premium-container ${themeClass}`;

    badge.innerHTML = `
      <div class="cognify-badge-inner">
        <div class="cognify-badge-header">
          <div class="cognify-brand-lockup">
            <div class="cognify-brand-icon-wrapper">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                <rect x="4" y="4" width="32" height="32" rx="8" stroke="currentColor" stroke-width="3" />
                <path d="M24 16L16 24M16 16L24 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg>
            </div>
            <span class="cognify-brand-text">Cognify</span>
          </div>
          
          <div style="flex-grow: 1;"></div>

          <div class="cognify-badge-status-pill">
            <div class="cognify-badge-dot pulse-subtle" style="background-color: ${color}; box-shadow: 0 0 10px ${color}80;"></div>
            <span class="cognify-badge-verdict" style="color: ${color};">${verdictText}</span>
            <div class="cognify-pill-separator"></div>
            <span class="cognify-badge-score">${score}% Synced</span>
          </div>
        </div>
        
        <div class="cognify-badge-content">
          <div class="cognify-badge-summary">
            ${data.summary || 'Neural pathways aligned. Safe for consumption.'}
          </div>
        </div>
        
        <div class="cognify-badge-footer">
          <button id="cognify-toggle-recommend" class="cognify-btn primary-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
            <span>Ask AI Recommendations</span>
          </button>
          <div style="flex-grow: 1;"></div>
          <a href="https://cognify-app.vercel.app/dashboard" target="_blank" class="cognify-btn secondary-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            <span>Dashboard</span>
          </a>
        </div>
        
        <!-- Results Container -->
        <div id="cognify-recommend-results" class="cognify-recommend-results" style="display: none;">
          <div class="cognify-recommend-header">
            <span class="cognify-recommend-title-text">Curated Neural Pathways</span>
            <button id="cognify-refresh-recommend" class="cognify-icon-btn" title="Refresh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
          <div id="cognify-recommend-list" class="cognify-recommend-grid"></div>
        </div>
      </div>
    `;
  }
  
  insertBadge(badge);

  // Bind events if it's a result
  if (currentBadgeState.type === 'result') {
    const toggleBtn = badge.querySelector('#cognify-toggle-recommend');
    const resultsContainer = badge.querySelector('#cognify-recommend-results');
    const listContainer = badge.querySelector('#cognify-recommend-list');
    const refreshBtn = badge.querySelector('#cognify-refresh-recommend');

    const fetchRecommendations = async () => {
      listContainer.innerHTML = `
        <div class="cognify-loading-state">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <span>Curating neural pathways...</span>
        </div>
      `;
      if (refreshBtn) refreshBtn.classList.add('spinning');
      
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'RECOMMEND',
            goal: '',
            limit: 4,
            exclude: Array.from(shownRecommendedUrls)
          }, resolve);
        });
        
        if (chrome.runtime.lastError || !response) {
          throw new Error('Extension connection error');
        }
        if (response.error) {
          throw new Error(response.error);
        }
        
        const data = response;
        
        if (data && data.data && data.data.length > 0) {
          data.data.forEach(item => shownRecommendedUrls.add(item.url));
          listContainer.innerHTML = data.data.map(item => `
            <a href="${item.url}" class="cognify-recommend-card" target="_blank">
              <div class="cognify-card-thumb-wrapper">
                <img src="${item.thumbnail}" alt="Thumbnail" class="cognify-card-thumb" />
                <div class="cognify-card-duration">${item.duration || '12:00'}</div>
                <div class="cognify-card-overlay">
                  <div class="cognify-play-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </div>
              </div>
              <div class="cognify-card-info">
                <div class="cognify-card-title">${item.title}</div>
                <div class="cognify-card-meta">${item.channel} • ${item.viewCount}</div>
                <div class="cognify-card-reason">${item.reason}</div>
                <div class="cognify-card-score">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                  ${item.score || 95}% Match
                </div>
              </div>
            </a>
          `).join('');
        } else {
          listContainer.innerHTML = '<div class="cognify-empty-state">No highly relevant results found.</div>';
        }
      } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="cognify-error-state">${err.message || 'Failed to load recommendations. Make sure backend is running.'}</div>`;
      } finally {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
      }
    };

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (resultsContainer.style.display === 'flex' || resultsContainer.style.display === 'block') {
          resultsContainer.style.display = 'none';
          toggleBtn.classList.remove('active');
          return;
        }
        resultsContainer.style.display = 'flex';
        toggleBtn.classList.add('active');
        // Fetch only if it's empty
        if (!listContainer.innerHTML.trim()) {
          fetchRecommendations();
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', fetchRecommendations);
    }
  }
}

function injectLoadingBadge() { updateBadgeState({ type: 'loading' }); }
function injectResultBadge(data) { updateBadgeState({ type: 'result', data }); }
function injectErrorBadge(msg) { updateBadgeState({ type: 'error', msg }); }

function insertBadge(badgeEl) {
  if (insertInterval) {
    clearInterval(insertInterval);
    insertInterval = null;
  }

  const tryInsert = () => {
    // Already perfectly attached and visible?
    if (badgeEl.parentNode && badgeEl.offsetParent !== null) return true;

    // 1. Modern YouTube: Insert right after the top row (title/channel info), before the description
    const topRow = document.querySelector('ytd-watch-metadata #top-row');
    if (topRow && topRow.offsetParent !== null) {
      topRow.parentNode.insertBefore(badgeEl, topRow.nextSibling);
      return true;
    }

    // 2. Fallbacks
    const fallbackSelectors = [
      'ytd-watch-metadata #title',
      'ytd-video-primary-info-renderer #info',
      'ytd-reel-player-header-renderer h2',
      '#above-the-fold #title'
    ];
    
    for (const sel of fallbackSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.offsetParent !== null) {
          el.parentNode.insertBefore(badgeEl, el.nextSibling);
          return true;
        }
      }
    }
    
    return false;
  };

  if (!tryInsert()) {
    let tries = 0;
    insertInterval = setInterval(() => {
      tries++;
      if (tryInsert() || tries > 40) {
        clearInterval(insertInterval);
        insertInterval = null;
      }
    }, 500);
  }
}

// ─── Core Analysis ───────────────────────────────────────────────────────────

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
  
  if (!currentVideoId) {
    currentBadgeState = null;
    removeBadge();
    return;
  }
  
  const lastVideoId = lastUrl ? getVideoId(lastUrl) : null;
  if (currentVideoId === lastVideoId) {
    lastUrl = url;
    return;
  }
  
  lastUrl = url;
  injectLoadingBadge();
  startTimeTracking(url);

  try {
    const data = await extractDataFromPlayer(currentVideoId);
    const title = data.title || document.title.replace(' - YouTube', '');
    const description = data.description || '';
    const transcript = data.transcript;

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

let timeTrackingInterval = null;
let currentTrackingUrl = null;

function startTimeTracking(url) {
  if (timeTrackingInterval) clearInterval(timeTrackingInterval);
  currentTrackingUrl = url;
  
  timeTrackingInterval = setInterval(() => {
    if (document.visibilityState === 'visible' && currentTrackingUrl === window.location.href) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_TIME',
        url: currentTrackingUrl,
        additionalSecs: 5
      });
    }
  }, 5000);
}

document.addEventListener('yt-navigate-finish', () => {
  analyzeCurrentVideo();
});

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

setTimeout(analyzeCurrentVideo, 1000);
