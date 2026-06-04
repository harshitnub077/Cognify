// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('login-btn');
  const loginView = document.getElementById('login-view');
  const activeView = document.getElementById('active-view');
  const statusDot = document.getElementById('status-dot');

  // Handle Login Button
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
    });
  }

  // Check auth and load data
  const { cognify_token, lastAnalysis } = await chrome.storage.local.get(['cognify_token', 'lastAnalysis']);

  if (!cognify_token) {
    loginView.classList.remove('hidden');
    activeView.classList.add('hidden');
    statusDot.classList.remove('active');
    return;
  }

  // User is logged in
  loginView.classList.add('hidden');
  activeView.classList.remove('hidden');
  statusDot.classList.add('active');

  // Load last analysis
  if (lastAnalysis) {
    document.getElementById('site-name').textContent = lastAnalysis.title || 'Unknown Title';
    
    const emojiMap = {
      joy: '😄', anger: '😠', fear: '😨',
      sadness: '😢', surprise: '😮', disgust: '🤢', neutral: '😐'
    };
    const emoji = emojiMap[lastAnalysis.dominantEmotion] || '😐';
    
    document.getElementById('site-desc').textContent = `${emoji} ${lastAnalysis.dominantEmotion} • ${lastAnalysis.summary || 'Analyzed content'}`;
    
    document.getElementById('conscious-count').textContent = lastAnalysis.isConscious ? 'Yes' : 'No';
    document.getElementById('avg-match').textContent = `${Math.round(lastAnalysis.score || 0)}%`;
  }
});
