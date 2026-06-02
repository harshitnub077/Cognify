let currentIgUrl = '';

// Monitor SPA navigation
const igObserver = new MutationObserver(() => {
    if (location.href !== currentIgUrl) {
        currentIgUrl = location.href;
        if (currentIgUrl.includes('/p/') || currentIgUrl.includes('/reel/')) {
            setTimeout(analyzeInstagramPost, 1500); // Let DOM populate
        }
    }
});

igObserver.observe(document, { subtree: true, childList: true });

if (location.href.includes('/p/') || location.href.includes('/reel/')) {
    currentIgUrl = location.href;
    setTimeout(analyzeInstagramPost, 1500);
}

function analyzeInstagramPost() {
    // 1. Extract data (Instagram DOM is heavily obfuscated, fallback to title)
    const title = document.title;
    
    // 2. Request analysis
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;
    chrome.runtime.sendMessage({
        type: 'ANALYZE_CONTENT',
        url: window.location.href,
        title: title,
        platform: 'instagram'
    }, (response) => {
        if (!response || !response.success || !response.data) return;
        injectInstagramDot(response.data);
    });
}

function injectInstagramDot(data) {
    // Find the main image/video container
    // This selector is generic as IG classes change often
    const article = document.querySelector('article[role="presentation"]');
    if (!article) return;
    
    const imgContainer = article.querySelector('div._aagv, div.x1qjc9v5, img');
    if (!imgContainer) return;
    
    // Check if dot already exists
    if (imgContainer.parentElement.querySelector('.cognify-ig-dot')) return;

    const dot = document.createElement('div');
    
    // Determine color
    const score = data.score || 0;
    let colorClass = 'red';
    if (score > 60) colorClass = 'green';
    else if (score >= 30) colorClass = 'amber';
    
    dot.className = `cognify-ig-dot ${colorClass}`;
    
    // Inject relative to the container
    imgContainer.parentElement.style.position = 'relative';
    imgContainer.parentElement.appendChild(dot);
}
