// content.js — FeedShift feed interceptor for YouTube

// ── Helper: is the extension context still valid? ─────────────────────
function isContextValid() {
  try { return !!chrome.runtime?.id; } catch(e) { return false; }
}

let profile = null;
let studyMode = false;
let currentUrl = location.href;
let scanTimeout = null;

// Debounce state
let mutationCount = 0;
let mutationWindowStart = Date.now();
let pauseScanningUntil = 0;

// Batch state
let batchQueue = [];
let batchTimeout = null;

// Cache state
const sessionCache = new Map();

const SELECTORS = {
  card: 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer',
  title: '#video-title, h3 a',
  channel: 'ytd-channel-name a, #channel-name a',
  description: '#description-text, yt-formatted-string#description-text, .metadata-snippet-text',
  metadata: 'ytd-video-meta-block, #metadata-line',
  ariaLabel: '[aria-label]',
};

// ── Topic Keyword Expansion Map ──────────────────────────────────────
// Deprecated in Extension: We now rely on the powerful V2 AI Engine on the backend.
// Broad local keywords like "market" or "cell" were causing bad videos to slip through.

// ── Always-block distraction signals ─────────────────────────────────
const HARD_BLOCK_KEYWORDS = [
  'prank', 'funny compilation', 'try not to laugh', 'meme compilation',
  'drama', 'gossip', 'exposed', 'beef', 'canceled', 'cringe compilation',
  'mukbang', 'asmr eating', 'roast', 'tiktok compilation', 'tiktok vs',
  'lets play', "let's play", 'playthrough', 'gameplay', 'fortnite', 'minecraft lets',
  'roblox', 'valorant gameplay', 'gta 5', 'gta v gameplay',
  'celebrity', 'red carpet', 'award show', 'met gala', 'reality tv',
  'unboxing', 'haul', 'giveaway winner', 'girlfriend reveals', 'boyfriend reacts',
  'you wont believe', "you won't believe", 'shocking truth', '(gone wrong)',
  'storytime', 'day in my life', 'morning routine vlog', 'what i eat in a day',
  // Regional + trending distraction patterns
  'roast video', 'exposed video', 'reply to', 'vs battle',
  'challenge accepted', 'insane reaction', 'free fire', 'bgmi',
  'i quit', 'never again', 'not clickbait', '24 hour challenge',
  'last to leave', 'first to', '$1 vs $1000',
  'thugesh', 'carryminati roast', 'bigg boss',
];

// ── Channels to always allow (trusted educational channels) ──────────
const TRUSTED_CHANNELS = [
  '3blue1brown', 'veritasium', 'kurzgesagt', 'numberphile', 'computerphile',
  'mit opencourseware', 'stanford', 'khan academy', 'crash course', 'ted',
  'tedx', 'mark rober', 'vsauce', 'smarter every day', 'minutephysics',
  'two minute papers', 'yannic kilcher', 'andrej karpathy', 'sentdex',
  'tech with tim', 'fireship', 'the primeagen', 'theo', 'traversy media',
  'corey schafer', 'programming with mosh', 'freecodecamp', 'traversy',
  'siraj raval', 'lex fridman', 'huberman lab', 'andrew huberman',
  'paul graham', 'y combinator', 'patrick boyle', 'ben felix',
];


// ── Initialization ────────────────────────────────────────────────────
async function init() {
  if (!isContextValid()) return;

  let data;
  try {
    data = await chrome.storage.local.get(['feedshift_profile', 'feedshift_study_mode']);
  } catch(e) { return; }

  profile = data.feedshift_profile;
  studyMode = !!data.feedshift_study_mode;

  console.log('[FeedShift] Initialized. Profile:', profile ? 'FOUND' : 'MISSING', '| Study Mode:', studyMode);

  if (!profile) {
    console.warn('[FeedShift] No profile found in chrome.storage.local. Showing setup banner.');
    showSetupBanner();
    return;
  }

  if (!studyMode) {
    console.log('[FeedShift] Study mode is OFF. Filter is paused. Toggle it ON in the extension popup.');
    // Still set up listeners so it activates immediately when toggled
  }

  // Listen for storage changes (study mode toggle / profile update)
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (!isContextValid()) return;
      if (changes.feedshift_study_mode) {
        studyMode = changes.feedshift_study_mode.newValue;
        console.log('[FeedShift] Study mode changed to:', studyMode);
        if (studyMode) {
          clearProcessedFlags();
          triggerScan(100);
          injectStatsWidget();
        } else {
          removeShortsOverlay();
          document.getElementById('fs-stats-widget')?.remove();
          document.querySelectorAll('[data-fs-verdict="BLOCK"]').forEach(el => {
            el.style.cssText = '';
            const focusCard = el.querySelector('.fs-focus-card');
            if (focusCard) focusCard.remove();
            
            const thumbnail = el.querySelector('ytd-thumbnail, .ytd-thumbnail');
            const details = el.querySelector('#details');
            if (thumbnail) thumbnail.style.filter = '';
            if (details) details.style.filter = '';
          });
        }
      }
      if (changes.feedshift_profile) {
        profile = changes.feedshift_profile.newValue;
        console.log('[FeedShift] Profile updated in storage, re-scanning...');
        clearProcessedFlags();
        triggerScan(100);
      }
    });
  } catch(e) {}

  if (studyMode) {
    triggerScan(1500);
    injectStatsWidget();
  }

  setupObservers();
  setupHealthCheck();
}

// ── Observers & SPA Navigation ────────────────────────────────────────
function setupObservers() {
  const observer = new MutationObserver(() => {
    if (!isContextValid()) { observer.disconnect(); return; }
    try {
      if (!studyMode || location.href !== currentUrl) return;
      const now = Date.now();
      if (now < pauseScanningUntil) return;
      if (now - mutationWindowStart > 1000) {
        mutationCount = 0;
        mutationWindowStart = now;
      }
      mutationCount++;
      if (mutationCount > 20) {
        pauseScanningUntil = now + 2000;
        return;
      }
      triggerScan(300);
    } catch (err) {
      // swallow
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('yt-navigate-finish', () => {
    if (!isContextValid()) return;
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      clearProcessedFlags();
      if (studyMode) triggerScan(1500);
    }
  });
}

function triggerScan(delay) {
  clearTimeout(scanTimeout);
  scanTimeout = setTimeout(scanDOM, delay);
}

// ── Core Scanner ──────────────────────────────────────────────────────
function scanDOM() {
  if (!studyMode || !profile) return;

  const path = window.location.pathname;

  if (path.startsWith('/shorts')) {
    showShortsOverlay();
    return;
  } else {
    removeShortsOverlay();
  }

  const cards = Array.from(document.querySelectorAll(SELECTORS.card))
    .filter(card => card.dataset.fsProcessed !== 'true');

  if (cards.length > 0) {
    console.log(`[FeedShift] Scanning ${cards.length} new cards...`);
  }

  for (const card of cards) {
    card.dataset.fsProcessed = 'true';

    if (path === '/results' && !card.closest('#contents > ytd-item-section-renderer')) continue;
    if (path === '/watch' && !card.closest('#related')) continue;

    const video = extractVideoMeta(card);
    if (!video || !video.title) continue;

    batchQueue.push({ card, video });
  }

  if (batchQueue.length > 0) {
    clearTimeout(batchTimeout);
    batchTimeout = setTimeout(processBatch, 400);
  }
}

// ── Batch Processor ───────────────────────────────────────────────────
async function processBatch() {
  const batch = [...batchQueue];
  batchQueue = [];
  if (batch.length === 0) return;

  const needsAI = [];
  const finalResults = new Map(); // videoId -> result

  // 1. Check cache and local heuristics
  for (const { card, video } of batch) {
    // Ensure videoId is populated (fallback for weird UI states)
    if (!video.videoId) video.videoId = `tmp_${Math.random()}`;
    const cacheKey = video.videoId;

    if (sessionCache.has(cacheKey)) {
      finalResults.set(video.videoId, sessionCache.get(cacheKey));
      continue;
    }

    const localResult = classifyVideoLocal(video, profile);
    if (localResult) {
      finalResults.set(video.videoId, localResult);
      if (sessionCache.size > 300) sessionCache.delete(sessionCache.keys().next().value);
      sessionCache.set(cacheKey, localResult);
    } else {
      needsAI.push({ card, video });
    }
  }

  // 2. Call AI Batch Engine
  if (needsAI.length > 0) {
    try {
      const resp = await fetch('http://localhost:3001/classify-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videos: needsAI.map(item => item.video), 
          profileSnapshot: profile 
        }),
        signal: AbortSignal.timeout(8000) // Slightly longer timeout for batching
      });
      
      if (resp.ok) {
        const aiResultsMap = await resp.json();
        for (const { video } of needsAI) {
          const res = aiResultsMap[video.videoId] || { verdict: 'BLOCK', reason: 'AI missed video' };
          finalResults.set(video.videoId, res);
          const cacheKey = video.videoId;
          if (sessionCache.size > 300) sessionCache.delete(sessionCache.keys().next().value);
          sessionCache.set(cacheKey, res);
        }
      } else {
        throw new Error('API Rate Limit or Error');
      }
    } catch(e) {
      console.warn('[FeedShift] AI Batch failed. Falling back to ALLOW.', e.message);
      for (const { video } of needsAI) {
        finalResults.set(video.videoId, { verdict: 'ALLOW', reason: 'AI Engine unreachable (Fail Open)' });
      }
    }
  }

  // 3. Apply UI and Log
  for (const { card, video } of batch) {
    const result = finalResults.get(video.videoId);
    if (!result) continue;

    card.dataset.fsVerdict = result.verdict;
    console.log(`[FeedShift] "${video.title.substring(0,40)}" → ${result.verdict} (${result.reason})`);

    if (result.verdict === 'ALLOW') {
      applyAllowUI(card);
    } else {
      applyBlockUI(card, video, result);
    }
    updateStatsWidget(result.verdict);
    logContentDiet(video, result);
  }

  // Sync logs to backend for dashboard (throttled to once per 30s)
  syncDietLogToBackend();
}

// ── Classification: Local Pre-filter ─────────────────────────────────
// Returns verdict if local rule matches, else null to defer to AI
function classifyVideoLocal(video, profile) {
  const titleLower = video.title.toLowerCase();
  const channelLower = video.channel.toLowerCase();
  const fullText = video.fullText || titleLower;

  // Layer 1: Trusted channels (always allow)
  if (TRUSTED_CHANNELS.some(tc => channelLower.includes(tc))) {
    return { verdict: 'ALLOW', reason: 'Trusted educational channel' };
  }

  // Layer 2: Profile channel trust scores
  const channelTrust = profile.channelTrust || {};
  const trust = channelTrust[channelLower] ?? 50;
  if (trust >= 80) return { verdict: 'ALLOW', reason: 'High trust channel' };
  if (trust <= 15) return { verdict: 'BLOCK', reason: 'Low trust channel' };

  // Layer 3: Hard-block distraction signals (even if interest keywords present)
  for (const kw of HARD_BLOCK_KEYWORDS) {
    if (titleLower.includes(kw)) {
      return { verdict: 'BLOCK', reason: `Distraction signal: "${kw}"` };
    }
  }

  // Layer 4: Profile blocked topics
  const blockedTopics = profile.blockedTopics || [];
  for (const term of blockedTopics) {
    if (fullText.includes(term.toLowerCase())) {
      return { verdict: 'BLOCK', reason: `Blocked topic: ${term}` };
    }
  }

  // Layer 5: Exact string match for active goals (extremely strict local fallback)
  const interests = profile.interests || [];
  for (const interest of interests) {
    const topicName = (interest.topic || interest).toLowerCase().trim();
    if (topicName.length > 3 && fullText.includes(topicName)) {
      return { verdict: 'ALLOW', reason: `Exact interest match: "${topicName}"` };
    }
  }

  // Defer to AI
  return null;
}

// ── Rich Metadata Extractor ──────────────────────────────────────────
function extractVideoMeta(card) {
  const titleEl = card.querySelector(SELECTORS.title);
  const channelEl = card.querySelector(SELECTORS.channel);
  if (!titleEl) return null;

  const title = titleEl.textContent?.trim() || '';
  const channel = channelEl?.textContent?.trim() || '';

  // Extract description snippet (visible below some cards on homepage)
  const descEl = card.querySelector(SELECTORS.description);
  const description = descEl?.textContent?.trim() || '';

  // Extract all visible metadata text (views, duration, upload date etc)
  const metadataParts = [...card.querySelectorAll('#metadata-line span, ytd-video-meta-block span')]
    .map(el => el.textContent?.trim())
    .filter(Boolean)
    .join(' ');

  // Extract aria-label from the card which YouTube often fills with rich info
  const ariaLabel = card.getAttribute('aria-label') ||
    card.querySelector('[aria-label]')?.getAttribute('aria-label') || '';

  // Scrape ALL visible text from the card as a catch-all
  const allCardText = card.innerText || '';

  const anchor = card.querySelector('a[href*="/watch?v="]');
  const href = anchor?.getAttribute('href') || '';
  const videoIdMatch = href.match(/[?&]v=([^&]+)/);

  // Extract thumbnail URL
  const thumbnailImg = card.querySelector('ytd-thumbnail img, img.yt-core-image');
  const thumbnailUrl = thumbnailImg?.src || (videoIdMatch?.[1] ? `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg` : null);

  // Build a combined lowercase search string from everything we can see
  const fullText = [title, channel, description, metadataParts, ariaLabel, allCardText]
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .substring(0, 2000); // cap length for performance

  return {
    videoId: videoIdMatch?.[1] || null,
    title,
    channel,
    channelName: channel,
    description,
    thumbnailUrl,
    fullText,
  };
}

function applyAllowUI(card) {
  // Add a subtle green dot to allowed cards
  if (card.querySelector('.fs-allow-badge')) return;
  const thumbnail = card.querySelector('ytd-thumbnail, .ytd-thumbnail');
  if (thumbnail) {
    thumbnail.style.position = 'relative';
    const badge = document.createElement('div');
    badge.className = 'fs-allow-badge';
    badge.style.cssText = 'position:absolute;top:4px;left:4px;width:7px;height:7px;background:#22c55e;border-radius:50%;z-index:10;box-shadow:0 0 5px #22c55e88;';
    thumbnail.appendChild(badge);
  }
}

function applyBlockUI(card, video, result) {
  // Prevent duplicate overlays
  if (card.querySelector('.fs-focus-card')) return;

  // We keep the card's original layout but overlay a glassmorphism focus card
  card.style.position = 'relative';

  // Make the underlying video content blurry
  const thumbnail = card.querySelector('ytd-thumbnail, .ytd-thumbnail');
  const details = card.querySelector('#details');
  if (thumbnail) thumbnail.style.filter = 'blur(10px) grayscale(80%)';
  if (details) details.style.filter = 'blur(10px) grayscale(80%)';

  // Inject Premium Glassmorphism Focus Card
  const focusCard = document.createElement('div');
  focusCard.className = 'fs-focus-card';
  focusCard.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(15, 15, 20, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    text-align: center;
    padding: 16px;
    transition: all 0.3s ease;
    gap: 4px;
  `;

  const studyGoal = profile?.goal || 'your goals';
  const reason = result?.reason || 'No interest match found';
  focusCard.innerHTML = `
    <div style="font-size: 22px;">🛡️</div>
    <div style="color: #fff; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;">Distraction Blocked</div>
    <div style="color: #a78bfa; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 500;">Stay focused on ${studyGoal}</div>
    <div style="color: rgba(255,255,255,0.4); font-family: 'Inter', sans-serif; font-size: 10px; margin-top: 4px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${reason}">💡 ${reason}</div>
    <button class="fs-show-anyway" style="
      margin-top: 8px;
      padding: 4px 14px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px;
      color: rgba(255,255,255,0.5);
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    ">Show Anyway</button>
  `;

  card.appendChild(focusCard);

  // "Show Anyway" button handler
  const showBtn = focusCard.querySelector('.fs-show-anyway');
  showBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Remove the overlay
    focusCard.remove();
    if (thumbnail) thumbnail.style.filter = '';
    if (details) details.style.filter = '';
    card.dataset.fsVerdict = 'OVERRIDE';
    // Log the override for learning
    logContentDiet(video, { verdict: 'OVERRIDE', reason: 'User overrode block' });
    // Slightly increase channel trust
    if (profile && video.channel) {
      const ct = profile.channelTrust || {};
      const channelLower = video.channel.toLowerCase();
      ct[channelLower] = Math.min((ct[channelLower] ?? 50) + 5, 100);
      profile.channelTrust = ct;
      try { chrome.storage.local.set({ feedshift_profile: profile }); } catch(err) {}
    }
  });

  // Hover effects
  showBtn.addEventListener('mouseenter', () => {
    showBtn.style.background = 'rgba(255,255,255,0.15)';
    showBtn.style.color = 'rgba(255,255,255,0.8)';
  });
  showBtn.addEventListener('mouseleave', () => {
    showBtn.style.background = 'rgba(255,255,255,0.08)';
    showBtn.style.color = 'rgba(255,255,255,0.5)';
  });

  card.addEventListener('mouseenter', () => {
    focusCard.style.background = 'rgba(15, 15, 20, 0.8)';
  });
  card.addEventListener('mouseleave', () => {
    focusCard.style.background = 'rgba(15, 15, 20, 0.6)';
  });
}

function clearProcessedFlags() {
  document.querySelectorAll('[data-fs-processed]').forEach(el => {
    delete el.dataset.fsProcessed;
    delete el.dataset.fsVerdict;
  });
}

// ── Health Check ──────────────────────────────────────────────────────
function setupHealthCheck() {
  // No setInterval — it's the #1 cause of "Extension context invalidated" crashes.
  // chrome.storage API calls inside setInterval throw synchronously when the
  // extension reloads, BEFORE a Promise or .catch() can handle it.
  // Instead, just clean up our timeouts when the page unloads.
  window.addEventListener('unload', () => {
    clearTimeout(scanTimeout);
    clearTimeout(batchTimeout);
  });
}

// ── Logging ───────────────────────────────────────────────────────────
async function logContentDiet(video, result) {
  if (!isContextValid()) return;
  try {
    const key = 'diet_log';
    const { [key]: log = [] } = await chrome.storage.local.get(key);
    if (log.length >= 500) log.shift();
    log.push({
      videoId: video.videoId,
      title: video.title,
      channel: video.channel,
      verdict: result.verdict,
      reason: result.reason,
      date: new Date().toISOString()
    });
    await chrome.storage.local.set({ [key]: log });
  } catch(e) {}
}

// ── Sync diet log to backend for dashboard ────────────────────────────
let lastSyncTime = 0;
async function syncDietLogToBackend() {
  if (!isContextValid() || !profile?.userId) return;
  
  // Only sync once every 30 seconds to avoid spamming
  const now = Date.now();
  if (now - lastSyncTime < 30000) return;
  lastSyncTime = now;
  
  try {
    const { diet_log: logs = [] } = await chrome.storage.local.get('diet_log');
    // Only sync last 100 entries
    const recent = logs.slice(-100);
    
    await fetch('http://localhost:3001/stats/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.userId, logs: recent }),
      signal: AbortSignal.timeout(3000)
    });
  } catch(e) {
    // Silent fail — dashboard data is nice-to-have, not critical
  }
}

// ── UI Overlays ───────────────────────────────────────────────────────
function showSetupBanner() {
  if (document.getElementById('fs-setup-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'fs-setup-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#8b5cf6;color:white;text-align:center;padding:12px;z-index:99999;font-family:sans-serif;font-size:14px;font-weight:600;cursor:pointer;';
  banner.textContent = '⚡ FeedShift: Click here to complete setup and start filtering your feed →';
  banner.onclick = () => {
    if (isContextValid()) {
      window.open(chrome.runtime.getURL('src/onboarding.html'));
    }
    banner.remove();
  };
  document.body.appendChild(banner);
}

function showShortsOverlay() {
  if (document.getElementById('fs-shorts-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'fs-shorts-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,10,10,0.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:sans-serif;';
  overlay.innerHTML = '<h1 style="font-size:28px;margin-bottom:16px;">📵 Shorts are paused during Focus Mode</h1><button id="fs-back-btn" style="padding:12px 24px;background:#8b5cf6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:bold;">Go Back</button>';
  document.body.appendChild(overlay);
  document.getElementById('fs-back-btn').onclick = () => window.history.back();
}

function removeShortsOverlay() {
  document.getElementById('fs-shorts-overlay')?.remove();
}

// ── Floating Stats Widget ─────────────────────────────────────────────
let sessionBlocked = 0;
let sessionAllowed = 0;
let sessionOverrides = 0;

function injectStatsWidget() {
  if (document.getElementById('fs-stats-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'fs-stats-widget';
  widget.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 99998;
    background: rgba(10, 10, 15, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 12px 16px;
    font-family: 'Inter', -apple-system, sans-serif;
    color: #e2e8f0;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    cursor: default;
    user-select: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 12px;
  `;

  widget.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px;">
      <span style="font-size: 14px;">🛡️</span>
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: #a78bfa;">FEEDSHIFT</span>
    </div>
    <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.1);"></div>
    <div id="fs-stat-blocked" style="display: flex; align-items: center; gap: 4px;">
      <span style="font-size: 11px; color: #f87171; font-weight: 700;">0</span>
      <span style="font-size: 10px; color: rgba(255,255,255,0.4);">blocked</span>
    </div>
    <div id="fs-stat-allowed" style="display: flex; align-items: center; gap: 4px;">
      <span style="font-size: 11px; color: #4ade80; font-weight: 700;">0</span>
      <span style="font-size: 10px; color: rgba(255,255,255,0.4);">allowed</span>
    </div>
    <div id="fs-stat-time" style="display: flex; align-items: center; gap: 4px;">
      <span style="font-size: 11px; color: #60a5fa; font-weight: 700;">0m</span>
      <span style="font-size: 10px; color: rgba(255,255,255,0.4);">saved</span>
    </div>
    <button id="fs-widget-minimize" style="
      background: none; border: none; color: rgba(255,255,255,0.3);
      cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1;
    ">×</button>
  `;

  document.body.appendChild(widget);

  // Minimize toggle
  let minimized = false;
  const statsContent = widget.querySelectorAll('#fs-stat-blocked, #fs-stat-allowed, #fs-stat-time');
  const dividers = widget.querySelectorAll('div[style*="width: 1px"]');

  document.getElementById('fs-widget-minimize').addEventListener('click', () => {
    minimized = !minimized;
    statsContent.forEach(el => el.style.display = minimized ? 'none' : 'flex');
    dividers.forEach(el => el.style.display = minimized ? 'none' : 'block');
    document.getElementById('fs-widget-minimize').textContent = minimized ? '+' : '×';
  });

  // Hover glow
  widget.addEventListener('mouseenter', () => {
    widget.style.borderColor = 'rgba(167, 139, 250, 0.3)';
    widget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.15)';
  });
  widget.addEventListener('mouseleave', () => {
    widget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    widget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
  });
}

function updateStatsWidget(verdict) {
  if (verdict === 'ALLOW') sessionAllowed++;
  else if (verdict === 'OVERRIDE') sessionOverrides++;
  else sessionBlocked++;

  const blockedEl = document.querySelector('#fs-stat-blocked span:first-child');
  const allowedEl = document.querySelector('#fs-stat-allowed span:first-child');
  const timeEl = document.querySelector('#fs-stat-time span:first-child');

  if (blockedEl) blockedEl.textContent = sessionBlocked;
  if (allowedEl) allowedEl.textContent = sessionAllowed;
  // Estimate: each blocked distraction video saves ~8 minutes on average
  const minutesSaved = sessionBlocked * 8;
  if (timeEl) {
    timeEl.textContent = minutesSaved >= 60
      ? `${Math.floor(minutesSaved / 60)}h${minutesSaved % 60}m`
      : `${minutesSaved}m`;
  }
}

// ── Boot ──────────────────────────────────────────────────────────────
init();
