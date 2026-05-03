// storage.js — chrome.storage wrapper with typed helpers

const KEYS = {
  PROFILE: 'feedshift_profile',
  STATS: 'feedshift_stats',
  SIGNAL_QUEUE: 'feedshift_signal_queue',
  ENABLED: 'feedshift_enabled',
  CACHE: 'feedshift_cache',
};

/** @returns {Promise<import('./types').UserProfile|null>} */
export async function getProfile() {
  const data = await chrome.storage.local.get(KEYS.PROFILE);
  return data[KEYS.PROFILE] ?? null;
}

/** @param {import('./types').UserProfile} profile */
export async function saveProfile(profile) {
  profile.lastUpdated = new Date().toISOString();
  await chrome.storage.local.set({ [KEYS.PROFILE]: profile });
}

/** @returns {Promise<{blocked:number, allowed:number, notInterested:number}>} */
export async function getStats() {
  const data = await chrome.storage.local.get(KEYS.STATS);
  return data[KEYS.STATS] ?? { blocked: 0, allowed: 0, notInterested: 0 };
}

/** @param {Partial<{blocked:number, allowed:number, notInterested:number}>} delta */
export async function incrementStats(delta) {
  const current = await getStats();
  const updated = {
    blocked: (current.blocked ?? 0) + (delta.blocked ?? 0),
    allowed: (current.allowed ?? 0) + (delta.allowed ?? 0),
    notInterested: (current.notInterested ?? 0) + (delta.notInterested ?? 0),
  };
  await chrome.storage.local.set({ [KEYS.STATS]: updated });
}

/** @returns {Promise<Array>} */
export async function getSignalQueue() {
  const data = await chrome.storage.local.get(KEYS.SIGNAL_QUEUE);
  return data[KEYS.SIGNAL_QUEUE] ?? [];
}

/** @param {object} signal */
export async function enqueueSignal(signal) {
  const queue = await getSignalQueue();
  queue.push({ ...signal, timestamp: new Date().toISOString() });
  await chrome.storage.local.set({ [KEYS.SIGNAL_QUEUE]: queue });
}

export async function flushSignalQueue() {
  await chrome.storage.local.set({ [KEYS.SIGNAL_QUEUE]: [] });
}

/** @returns {Promise<boolean>} */
export async function isEnabled() {
  const data = await chrome.storage.local.get(KEYS.ENABLED);
  return data[KEYS.ENABLED] !== false; // default ON
}

/** @param {boolean} value */
export async function setEnabled(value) {
  await chrome.storage.local.set({ [KEYS.ENABLED]: value });
}

/** @param {string} videoId @returns {Promise<object|null>} */
export async function getCached(videoId) {
  const data = await chrome.storage.local.get(KEYS.CACHE);
  const cache = data[KEYS.CACHE] ?? {};
  const entry = cache[videoId];
  if (!entry) return null;
  // expire after 24 hours
  if (Date.now() - entry.ts > 86_400_000) return null;
  return entry.result;
}

/** @param {string} videoId @param {object} result */
export async function setCached(videoId, result) {
  const data = await chrome.storage.local.get(KEYS.CACHE);
  const cache = data[KEYS.CACHE] ?? {};
  cache[videoId] = { result, ts: Date.now() };
  // keep cache size ≤ 500 entries
  const keys = Object.keys(cache);
  if (keys.length > 500) {
    keys.sort((a, b) => cache[a].ts - cache[b].ts).slice(0, 100).forEach(k => delete cache[k]);
  }
  await chrome.storage.local.set({ [KEYS.CACHE]: cache });
}
