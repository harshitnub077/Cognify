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
let aiCallsThisSession = 0;

const SELECTORS = {
  card: 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer',
  title: '#video-title, h3 a',
  channel: 'ytd-channel-name a, #channel-name a',
  description: '#description-text, yt-formatted-string#description-text, .metadata-snippet-text',
  metadata: 'ytd-video-meta-block, #metadata-line',
  ariaLabel: '[aria-label]',
};

// ── Topic Keyword Expansion Map ──────────────────────────────────────
// Maps broad interest topics → related keywords that should be ALLOWED
const TOPIC_KEYWORD_MAP = {
  'machine learning': ['machine learning', 'ml', 'neural network', 'deep learning', 'tensorflow', 'pytorch', 'sklearn', 'scikit', 'gradient descent', 'backpropagation', 'transformer', 'llm', 'gpt', 'bert', 'regression', 'classification', 'clustering', 'supervised', 'unsupervised', 'reinforcement learning', 'random forest', 'xgboost', 'feature engineering', 'model training', 'overfitting', 'hyperparameter', 'embedding', 'attention mechanism', 'diffusion model', 'generative ai', 'nlp', 'computer vision', 'cnn', 'rnn', 'lstm', 'autoencoder'],
  'artificial intelligence': ['artificial intelligence', 'ai', 'machine learning', 'deep learning', 'neural', 'gpt', 'llm', 'chatgpt', 'openai', 'generative', 'nlp', 'computer vision', 'robotics', 'automation', 'algorithm'],
  'mathematics': ['mathematics', 'math', 'calculus', 'algebra', 'linear algebra', 'statistics', 'probability', 'theorem', 'proof', 'equation', 'integral', 'derivative', 'matrix', 'vector', 'topology', 'geometry', 'number theory', 'discrete math', 'differential', 'fourier', 'stochastic', 'combinatorics', 'trigonometry'],
  'math': ['math', 'calculus', 'algebra', 'statistics', 'probability', 'geometry', 'theorem', 'equation', 'integral', 'derivative', 'matrix', 'vector', 'linear algebra', 'trigonometry'],
  'computer science': ['computer science', 'cs', 'algorithm', 'data structure', 'programming', 'software', 'operating system', 'networking', 'database', 'complexity', 'big o', 'sorting', 'graph theory', 'recursion', 'dynamic programming', 'binary', 'compiler', 'system design', 'distributed system', 'cloud computing', 'devops', 'linux'],
  'programming': ['programming', 'coding', 'code', 'developer', 'software', 'python', 'javascript', 'typescript', 'java', 'c++', 'rust', 'golang', 'react', 'nextjs', 'node', 'api', 'backend', 'frontend', 'fullstack', 'web dev', 'tutorial', 'debug', 'refactor', 'github', 'git', 'open source', 'framework', 'library'],
  'python': ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'matplotlib', 'jupyter', 'pip', 'conda', 'asyncio', 'pydantic', 'sqlalchemy'],
  'javascript': ['javascript', 'js', 'typescript', 'react', 'vue', 'angular', 'node', 'next.js', 'nextjs', 'express', 'webpack', 'vite', 'dom', 'async', 'promise', 'es6'],
  'physics': ['physics', 'quantum', 'relativity', 'mechanics', 'thermodynamics', 'electromagnetism', 'optics', 'wave', 'particle', 'force', 'energy', 'momentum', 'entropy', 'spacetime', 'gravity', 'nuclear', 'astrophysics', 'cosmology', 'string theory', 'feynman'],
  'software engineering': ['software engineering', 'system design', 'architecture', 'design pattern', 'solid principles', 'clean code', 'refactoring', 'microservice', 'api design', 'ci/cd', 'testing', 'unit test', 'devops', 'agile', 'scrum', 'code review'],
  'data science': ['data science', 'data analysis', 'pandas', 'numpy', 'visualization', 'matplotlib', 'seaborn', 'tableau', 'sql', 'big data', 'spark', 'hadoop', 'etl', 'dashboard', 'analytics', 'insight', 'dataset', 'kaggle'],
  'philosophy': ['philosophy', 'ethics', 'epistemology', 'metaphysics', 'logic', 'consciousness', 'existentialism', 'stoicism', 'nietzsche', 'kant', 'plato', 'aristotle', 'socrates', 'determinism', 'free will', 'moral', 'virtue', 'reason'],
  'history': ['history', 'historical', 'ancient', 'medieval', 'civilization', 'empire', 'war', 'revolution', 'century', 'archaeology', 'documentary', 'culture', 'dynasty', 'colonial', 'world war'],
  'productivity': ['productivity', 'time management', 'focus', 'deep work', 'habit', 'morning routine', 'goal setting', 'pomodoro', 'study tips', 'workflow', 'organization', 'efficiency', 'discipline', 'self improvement', 'mindset'],
  'entrepreneurship': ['entrepreneurship', 'startup', 'business', 'founder', 'venture capital', 'vc', 'pitch', 'product market fit', 'saas', 'revenue', 'growth hacking', 'marketing', 'branding', 'investment', 'fundraising'],
  'design': ['design', 'ui', 'ux', 'user interface', 'figma', 'adobe', 'typography', 'color theory', 'wireframe', 'prototype', 'user experience', 'graphic design', 'product design', 'css', 'animation', 'visual'],
  'neuroscience': ['neuroscience', 'brain', 'neuron', 'cognition', 'cognitive', 'memory', 'learning', 'consciousness', 'neural', 'synapse', 'dopamine', 'serotonin', 'psychology', 'behavior', 'perception'],
  'finance': ['finance', 'investing', 'stock', 'market', 'portfolio', 'dividend', 'index fund', 'etf', 'valuation', 'financial', 'economics', 'compound interest', 'asset', 'equity', 'bond', 'cryptocurrency', 'blockchain'],
  'chemistry': ['chemistry', 'organic chemistry', 'reaction', 'molecule', 'element', 'periodic table', 'bond', 'acid', 'base', 'polymer', 'biochemistry', 'thermochemistry'],
  'biology': ['biology', 'cell', 'genetics', 'dna', 'rna', 'protein', 'evolution', 'ecology', 'microbiology', 'anatomy', 'physiology', 'organism', 'species', 'genome', 'crispr'],
  'economics': ['economics', 'macroeconomics', 'microeconomics', 'gdp', 'inflation', 'monetary policy', 'fiscal', 'supply', 'demand', 'market', 'keynesian', 'game theory'],
};

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
        } else {
          removeShortsOverlay();
          document.querySelectorAll('[data-fs-verdict="BLOCK"]').forEach(el => {
            el.style.cssText = '';
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

  await Promise.allSettled(batch.map(async ({ card, video }) => {
    try {
      const cacheKey = video.videoId || video.title;
      let result;

      if (sessionCache.has(cacheKey)) {
        result = sessionCache.get(cacheKey);
      } else {
        result = await classifyVideo(video, profile);
        if (sessionCache.size > 300) {
          const firstKey = sessionCache.keys().next().value;
          sessionCache.delete(firstKey);
        }
        sessionCache.set(cacheKey, result);
      }

      card.dataset.fsVerdict = result.verdict;
      console.log(`[FeedShift] "${video.title.substring(0,40)}" → ${result.verdict} (${result.reason})`);

      if (result.verdict === 'ALLOW') {
        applyAllowUI(card);
      } else {
        applyBlockUI(card, video);
      }

      logContentDiet(video, result);
    } catch (e) {
      // swallow per-card errors
    }
  }));
}

// ── Classification: STRICT ALLOWLIST ─────────────────────────────────
// Default is BLOCK. Only ALLOW if content positively matches an interest.
async function classifyVideo(video, profile) {
  const titleLower = video.title.toLowerCase();
  const channelLower = video.channel.toLowerCase();
  // Full text: title + channel + description + all scraped text combined
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

  // Layer 5: STRICT INTEREST MATCH — check against expanded keyword map
  const interests = profile.interests || [];
  for (const interest of interests) {
    const topicName = (interest.topic || interest).toLowerCase().trim();
    // Get expanded keywords from the map, or fall back to just the topic name
    const expandedKeywords = TOPIC_KEYWORD_MAP[topicName] || [topicName];
    for (const kw of expandedKeywords) {
      if (fullText.includes(kw)) {
        return { verdict: 'ALLOW', reason: `Interest match: "${kw}" (${topicName})` };
      }
    }
  }

  // Layer 6: Backend AI (if backend is running and we haven't hit the cap)
  if (aiCallsThisSession < 20) {
    try {
      const resp = await fetch('http://localhost:3001/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoMetadata: video, profileSnapshot: profile }),
        signal: AbortSignal.timeout(3000)
      });
      if (resp.ok) {
        const result = await resp.json();
        aiCallsThisSession++;
        return { verdict: result.verdict, reason: result.reason || 'AI classified' };
      }
    } catch(e) {}
  }

  // ⚡ DEFAULT: BLOCK — if we can't confirm it matches your interests, it doesn't belong in your feed.
  return { verdict: 'BLOCK', reason: 'No interest match found' };
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

function applyBlockUI(card) {
  card.style.opacity = '0';
  card.style.pointerEvents = 'none';
  card.style.height = '0px';
  card.style.overflow = 'hidden';
  card.style.margin = '0';
  card.style.padding = '0';
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

// ── Boot ──────────────────────────────────────────────────────────────
init();
