const state = {
  interests: [], // Array of { topic, depth }
  tolerance: 10, // Default entertainment tolerance
  goal: '',
  studyModeActive: true
};

const SUGGESTED_TAGS = [
  "Machine Learning", "Mathematics", "Computer Science", 
  "Philosophy", "History", "Physics", "Productivity", 
  "Entrepreneurship", "Design", "Software Engineering"
];

let currentStep = 1;

// ── DOM Elements ──
const steps = [
  document.getElementById('step1'),
  document.getElementById('step2'),
  document.getElementById('step3'),
  document.getElementById('step4')
];
const progressSegments = [
  document.getElementById('p1'),
  document.getElementById('p2'),
  document.getElementById('p3'),
  document.getElementById('p4')
];
const progressText = document.getElementById('progressText');

// Step 1
const tagsGrid = document.getElementById('tagsGrid');
const customTagInput = document.getElementById('customTagInput');
const addCustomTagBtn = document.getElementById('addCustomTagBtn');
const btnNext1 = document.getElementById('btnNext1');

// Step 2
const depthList = document.getElementById('depthList');
const btnBack2 = document.getElementById('btnBack2');
const btnNext2 = document.getElementById('btnNext2');

// Step 3
const entSlider = document.getElementById('entSlider');
const entVal = document.getElementById('entVal');
const entExample = document.getElementById('entExample');
const goalText = document.getElementById('goalText');
const btnBack3 = document.getElementById('btnBack3');
const btnNext3 = document.getElementById('btnNext3');

// Step 4
const summaryCard = document.getElementById('summaryCard');
const jsonToggle = document.getElementById('jsonToggle');
const jsonBlock = document.getElementById('jsonBlock');
const btnBack4 = document.getElementById('btnBack4');
const btnActivate = document.getElementById('btnActivate');

document.addEventListener('DOMContentLoaded', () => {
  renderTags();
  
  // Step 1 Listeners
  addCustomTagBtn.addEventListener('click', addCustomTag);
  customTagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addCustomTag();
  });
  btnNext1.addEventListener('click', () => goStep(2));

  // Step 2 Listeners
  btnBack2.addEventListener('click', () => goStep(1));
  btnNext2.addEventListener('click', () => goStep(3));

  // Step 3 Listeners
  entSlider.addEventListener('input', (e) => {
    state.tolerance = parseInt(e.target.value);
    entVal.textContent = `${state.tolerance} mins`;
    if (state.tolerance === 0) entExample.textContent = "Monk Mode. No entertainment allowed.";
    else if (state.tolerance <= 30) entExample.textContent = "Balanced. Occasional breaks allowed.";
    else entExample.textContent = "Relaxed. Loose filtering.";
  });
  btnBack3.addEventListener('click', () => goStep(2));
  btnNext3.addEventListener('click', () => goStep(4));

  // Step 4 Listeners
  jsonToggle.addEventListener('click', () => {
    jsonBlock.classList.toggle('open');
  });
  btnBack4.addEventListener('click', () => goStep(3));
  btnActivate.addEventListener('click', activateFeedShift);
});

// ── Navigation ──
function goStep(stepNum) {
  if (stepNum === 2) buildDepthList();
  if (stepNum === 4) buildSummary();

  steps.forEach((s, i) => {
    if (i + 1 === stepNum) s.classList.add('active');
    else s.classList.remove('active');
  });

  progressSegments.forEach((p, i) => {
    if (i + 1 <= stepNum) p.classList.add('active');
    else p.classList.remove('active');
  });

  progressText.textContent = `Step ${stepNum} of 4`;
  currentStep = stepNum;
}

// ── Step 1: Tags ──
function renderTags() {
  tagsGrid.innerHTML = '';
  SUGGESTED_TAGS.forEach(tag => {
    const isSelected = state.interests.some(i => i.topic === tag);
    const btn = document.createElement('button');
    btn.className = `tag ${isSelected ? 'selected' : ''}`;
    btn.textContent = tag;
    btn.onclick = () => toggleTag(tag);
    tagsGrid.appendChild(btn);
  });
  
  // Render custom tags that aren't in SUGGESTED_TAGS
  state.interests.forEach(i => {
    if (!SUGGESTED_TAGS.includes(i.topic)) {
      const btn = document.createElement('button');
      btn.className = 'tag selected';
      btn.textContent = i.topic;
      btn.onclick = () => toggleTag(i.topic);
      tagsGrid.appendChild(btn);
    }
  });

  btnNext1.disabled = state.interests.length === 0;
}

function toggleTag(topic) {
  const existingIndex = state.interests.findIndex(i => i.topic === topic);
  if (existingIndex >= 0) {
    state.interests.splice(existingIndex, 1);
  } else {
    if (state.interests.length >= 7) return alert('Maximum 7 interests allowed.');
    state.interests.push({ topic, depth: 'intermediate' });
  }
  renderTags();
}

function addCustomTag() {
  const val = customTagInput.value.trim();
  if (!val) return;
  if (state.interests.some(i => i.topic.toLowerCase() === val.toLowerCase())) return;
  if (state.interests.length >= 7) return alert('Maximum 7 interests allowed.');
  
  state.interests.push({ topic: val, depth: 'intermediate' });
  customTagInput.value = '';
  renderTags();
}

// ── Step 2: Depth ──
function buildDepthList() {
  depthList.innerHTML = '';
  state.interests.forEach((interest, index) => {
    const item = document.createElement('div');
    item.className = 'depth-item';
    
    item.innerHTML = `
      <div class="depth-topic">${interest.topic}</div>
      <div class="depth-options">
        <div class="depth-pill ${interest.depth === 'beginner' ? 'selected' : ''}" data-idx="${index}" data-val="beginner">
          Beginner
          <div class="tooltip">Foundational concepts, overviews</div>
        </div>
        <div class="depth-pill ${interest.depth === 'intermediate' ? 'selected' : ''}" data-idx="${index}" data-val="intermediate">
          Intermediate
          <div class="tooltip">Standard tutorials, deep dives</div>
        </div>
        <div class="depth-pill ${interest.depth === 'advanced' ? 'selected' : ''}" data-idx="${index}" data-val="advanced">
          Advanced
          <div class="tooltip">Academic, technical, expert level</div>
        </div>
      </div>
    `;
    depthList.appendChild(item);
  });

  document.querySelectorAll('.depth-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.idx;
      const val = e.currentTarget.dataset.val;
      state.interests[idx].depth = val;
      buildDepthList(); // Re-render to update selection UI
    });
  });
}

// ── Step 4: Summary ──
function buildSummary() {
  state.goal = goalText.value.trim();
  
  summaryCard.innerHTML = `
    <h3 class="summary-title">Profile Snapshot</h3>
    <div class="summary-row">
      <strong>Interests:</strong>
      <span>${state.interests.map(i => `${i.topic} (${i.depth})`).join(', ')}</span>
    </div>
    <div class="summary-row">
      <strong>Tolerance:</strong>
      <span>${state.tolerance} minutes</span>
    </div>
    <div class="summary-row">
      <strong>Active Goal:</strong>
      <span>${state.goal || 'None specified'}</span>
    </div>
  `;

  jsonBlock.textContent = JSON.stringify(state, null, 2);
}

// ── Activation ──
async function activateFeedShift() {
  btnActivate.disabled = true;
  btnActivate.textContent = 'Activating...';
  
  try {
    const profile = {
      userId: 'anon', // Gets overridden if user logs in later
      interests: state.interests,
      tolerance: state.tolerance,
      goal: state.goal,
      studyModeActive: true
    };

    await chrome.storage.local.set({ feedshift_profile: profile });
    await chrome.storage.local.set({ feedshift_study_mode: true });
    
    // Ping background script
    chrome.runtime.sendMessage({ type: 'PROFILE_CREATED', payload: profile });

    btnActivate.style.background = 'var(--success)';
    btnActivate.textContent = '✓ FeedShift Active';
    
    setTimeout(() => {
      // Redirect to YouTube to see the filter in action!
      window.location.href = 'https://www.youtube.com';
    }, 1000);
  } catch (e) {
    console.error('Failed to save profile', e);
    btnActivate.textContent = 'Error saving profile';
    btnActivate.disabled = false;
  }
}

