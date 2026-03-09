document.addEventListener('DOMContentLoaded', async () => {
  // Main view elements
  const studyModeToggle = document.getElementById('studyModeToggle');
  const studyModeStatus = document.getElementById('studyModeStatus');
  const btnSettings = document.getElementById('btnSettings');
  const btnEditProfile = document.getElementById('btnEditProfile');
  
  // Stats elements
  const statStudyTime = document.getElementById('statStudyTime');
  const statBlocked = document.getElementById('statBlocked');
  const statSignals = document.getElementById('statSignals');
  const pageTypeLabel = document.getElementById('pageTypeLabel');
  
  // Settings Panel elements
  const btnBack = document.getElementById('btnBack');
  const quickEntSlider = document.getElementById('quickEntSlider');
  const entTolVal = document.getElementById('entTolVal');
  const btnExport = document.getElementById('btnExport');
  const btnImport = document.getElementById('btnImport');
  const fileInput = document.getElementById('fileInput');
  const btnResetTrust = document.getElementById('btnResetTrust');
  
  // Load initial state
  const data = await chrome.storage.local.get(['feedshift_study_mode', 'feedshift_profile', 'diet_log']);
  
  const isStudyMode = !!data.feedshift_study_mode;
  studyModeToggle.checked = isStudyMode;
  updateStatus(isStudyMode);

  if (data.feedshift_profile && data.feedshift_profile.tolerance) {
    quickEntSlider.value = data.feedshift_profile.tolerance;
    entTolVal.textContent = `${data.feedshift_profile.tolerance}m`;
  }

  // Calculate quick stats from diet_log
  if (data.diet_log) {
    const today = new Date().toDateString();
    const todaysLogs = data.diet_log.filter(l => new Date(l.date).toDateString() === today);
    statBlocked.textContent = todaysLogs.filter(l => l.verdict === 'BLOCK').length;
    statSignals.textContent = todaysLogs.length;
    // Mock study time based on allowed items
    const allowed = todaysLogs.filter(l => l.verdict === 'ALLOW').length;
    statStudyTime.textContent = `${Math.floor((allowed * 5) / 60)}h ${(allowed * 5) % 60}m`;
  }

  // --- Main View Listeners ---
  studyModeToggle.addEventListener('change', async (e) => {
    const active = e.target.checked;
    await chrome.storage.local.set({ feedshift_study_mode: active });
    updateStatus(active);
    chrome.runtime.sendMessage({ type: 'TOGGLE_STUDY_MODE' });
  });

  btnEditProfile.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/onboarding.html') });
  });

  btnSettings.addEventListener('click', () => {
    document.body.classList.add('show-settings');
  });

  // --- Settings Panel Listeners ---
  btnBack.addEventListener('click', () => {
    document.body.classList.remove('show-settings');
  });

  quickEntSlider.addEventListener('input', async (e) => {
    const val = e.target.value;
    entTolVal.textContent = `${val}m`;
    
    if (data.feedshift_profile) {
      data.feedshift_profile.tolerance = parseInt(val);
      await chrome.storage.local.set({ feedshift_profile: data.feedshift_profile });
    }
  });

  btnExport.addEventListener('click', () => {
    if (!data.feedshift_profile) return alert('No profile to export');
    const blob = new Blob([JSON.stringify(data.feedshift_profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: 'feedshift-profile.json' });
  });

  btnImport.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedProfile = JSON.parse(event.target.result);
        await chrome.storage.local.set({ feedshift_profile: importedProfile });
        alert('Profile imported successfully!');
        window.close();
      } catch (err) {
        alert('Invalid profile file.');
      }
    };
    reader.readAsText(file);
  });

  btnResetTrust.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all algorithm trust scores?')) {
      if (data.feedshift_profile) {
        data.feedshift_profile.channelTrust = {};
        await chrome.storage.local.set({ feedshift_profile: data.feedshift_profile });
        alert('Trust scores reset to baseline.');
      }
    }
  });

  // --- Helpers ---
  function updateStatus(active) {
    if (active) {
      studyModeStatus.textContent = 'Active — filtering feed';
      studyModeStatus.className = 'status-pill active';
    } else {
      studyModeStatus.textContent = 'Paused — all content visible';
      studyModeStatus.className = 'status-pill paused';
    }
  }

  // Determine page type
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || '';
    if (url.includes('youtube.com/watch')) pageTypeLabel.textContent = 'Analyzing Sidebar Recommendations';
    else if (url.includes('youtube.com/results')) pageTypeLabel.textContent = 'Filtering Search Results';
    else if (url.includes('youtube.com')) pageTypeLabel.textContent = 'Guarding Home Feed';
    else pageTypeLabel.textContent = 'Standby (Not on YouTube)';
  });
});
