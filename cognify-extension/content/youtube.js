let currentUrl = '';

// Monitor SPA navigation
const observer = new MutationObserver(() => {
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        if (currentUrl.includes('youtube.com/watch')) {
            setTimeout(analyzeCurrentVideo, 2000); // Give DOM time to load
        }
    }
});

observer.observe(document, { subtree: true, childList: true });

// Initial load check
if (location.href.includes('youtube.com/watch')) {
    currentUrl = location.href;
    setTimeout(analyzeCurrentVideo, 2000);
}

// Inject Floating Action Button
function injectFAB() {
    if (document.querySelector('.cognify-fab')) return;
    
    const fab = document.createElement('div');
    fab.className = 'cognify-fab';
    
    const icon = document.createElement('div');
    icon.className = 'cognify-fab-icon';
    icon.innerText = 'C';
    
    const text = document.createElement('div');
    text.className = 'cognify-fab-text';
    text.innerText = 'View Analysis';
    
    fab.appendChild(icon);
    fab.appendChild(text);
    
    fab.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    });
    
    document.body.appendChild(fab);
}

injectFAB();

async function analyzeCurrentVideo() {
    const titleEl = document.querySelector('ytd-watch-metadata #title h1, h1.title, #title > h1');
    const title = titleEl ? titleEl.innerText : document.title;
    
    // Remove existing badge if any
    const existingBadge = document.querySelector('.cognify-badge');
    if (existingBadge) existingBadge.remove();

    // 2. Request analysis
    chrome.runtime.sendMessage({
        type: 'ANALYZE_CONTENT',
        url: window.location.href,
        title: title,
        platform: 'youtube'
    }, (response) => {
        if (!response) return; // Port closed or timeout
        if (response.status === 401) {
            console.log('Cognify: Unauthorized, please log in via popup.');
            return;
        }
        if (response.success && response.data) {
            injectBadge(response.data);
        }
    });
}

const emotionIcons = {
    joy: '✨', anger: '⚡', fear: '👀', sadness: '🌧️', surprise: '😲', disgust: '🤢', neutral: '😐'
};

function injectBadge(data) {
    const titleRenderer = document.querySelector('ytd-watch-metadata #title h1, h1.title, #title > h1');
    if (!titleRenderer) return;

    const badge = document.createElement('div');
    
    // Determine color
    const score = data.score || 0;
    let colorClass = 'red';
    if (score > 60) colorClass = 'green';
    else if (score >= 30) colorClass = 'amber';
    
    badge.className = `cognify-badge ${colorClass}`;
    
    // Format text
    const emotionIcon = emotionIcons[data.dominantEmotion] || '🧠';
    const emotionName = data.dominantEmotion ? data.dominantEmotion.charAt(0).toUpperCase() + data.dominantEmotion.slice(1) : 'Neutral';
    const toxScore = data.toxicity && data.toxicity.overall ? Math.round(data.toxicity.overall * 100) : 0;
    
    badge.innerHTML = `
        <span class="badge-highlight">${emotionIcon} High ${emotionName}</span>
        <span class="cognify-separator">•</span>
        <span>Toxicity: ${toxScore}%</span>
        <span class="cognify-separator">•</span>
        <span class="badge-highlight">Match: ${score}%</span>
        <span class="cognify-separator">•</span>
        <span class="cognify-brand">Cognify</span>
    `;

    badge.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    });

    titleRenderer.parentElement.insertBefore(badge, titleRenderer.nextSibling);
}
