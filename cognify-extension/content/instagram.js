// instagram.js — Cognify Content Script for Instagram Reels

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
  
  const isSessionExpired = msg && msg.toLowerCase().includes('session expired');

  badge.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #EF4444; box-shadow: 0 0 8px #EF444480;"></div>
        <span style="color:#EF4444; font-weight: 600; font-size: 14px;">⚠️ ${msg}</span>
      </div>
      ${isSessionExpired ? `
      <a href="https://cognify-beige.vercel.app/dashboard" target="_blank" style="text-decoration: none; padding: 6px 12px; background: rgba(255,255,255,0.1); border-radius: 6px; color: white; text-align: center; font-size: 13px; font-weight: 500; margin-top: 4px; border: 1px solid rgba(255,255,255,0.2);">
        Open Dashboard to Login
      </a>
      ` : ''}
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

  const tryInsert = () => {
    // Try to find the active Reel container
    const articles = document.querySelectorAll('article');
    if (!articles.length) return false;

    // Filter to find the article taking up the main view (Reels)
    const activeArticle = Array.from(articles).find(a => {
      const rect = a.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight / 2;
    }) || articles[0];

    if (activeArticle) {
      // Create a container if it doesn't exist
      let container = activeArticle.querySelector('.instagram-cognify-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'instagram-cognify-container';
        activeArticle.appendChild(container);
      }
      
      const existing = document.getElementById(BADGE_ID);
      if (existing) existing.remove();
      
      container.appendChild(badgeEl);
      return true;
    }
    return false;
  };

  if (!tryInsert()) {
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

function getReelId(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.pathname.startsWith('/reels/') || url.pathname.startsWith('/reel/') || url.pathname.startsWith('/p/')) {
      const parts = url.pathname.split('/').filter(Boolean);
      return parts[1];
    }
  } catch (e) {}
  return null;
}

async function analyzeCurrentReel() {
  const url = window.location.href;
  const currentId = getReelId(url);
  
  if (!currentId) return; // Not a reel page
  
  const lastId = lastUrl ? getReelId(lastUrl) : null;
  if (currentId === lastId) {
    lastUrl = url;
    return;
  }
  
  lastUrl = url;
  injectLoadingBadge();

  // Extract title from document title or meta tags
  let title = document.title;
  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent.trim().length > 5) {
    title = h1.textContent.trim();
  }

  try {
    // Send to service worker
    chrome.runtime.sendMessage(
      { type: 'ANALYZE', url, title, transcript: null },
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

const observer = new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastUrl && getReelId(url)) {
    analyzeCurrentReel();
  }
});

observer.observe(document.querySelector('title') || document.documentElement, {
  subtree: true,
  childList: true,
  characterData: true
});

setTimeout(analyzeCurrentReel, 1000);
