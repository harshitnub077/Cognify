// popup.js — Cognify Extension Popup

document.addEventListener('DOMContentLoaded', async () => {
  const lastTitleEl = document.getElementById('last-title');
  const lastMetaEl  = document.getElementById('last-meta');

  // Load last analysis from storage (written by service worker)
  const { lastAnalysis } = await chrome.storage.local.get('lastAnalysis');

  if (lastAnalysis?.title) {
    lastTitleEl.textContent = lastAnalysis.title;

    let emoji = '⚠️';
    let verdictText = 'CAUTION';
    
    if (lastAnalysis.isConscious) {
      emoji = '✅';
      verdictText = 'WATCH';
    } else if (lastAnalysis.score < 30) {
      emoji = '🚫';
      verdictText = 'SKIP';
    }

    const goalScore = Math.round(lastAnalysis.score || 0);
    const dominant  = lastAnalysis.dominantEmotion || 'neutral';
    
    lastMetaEl.textContent = `${emoji} ${verdictText} · Goal match: ${goalScore}% · ${dominant}`;
  } else {
    lastTitleEl.textContent = "No recent analysis";
    lastMetaEl.textContent = "Browse YouTube videos to see analysis.";
  }

  // Dashboard button
  document.getElementById('dashboard-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
  });
});
