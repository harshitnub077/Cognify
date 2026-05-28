// Generic analyzer for other websites (e.g. Twitter)
setTimeout(() => {
    chrome.runtime.sendMessage({
        type: 'ANALYZE_CONTENT',
        url: window.location.href,
        title: document.title,
        platform: 'web'
    }, (response) => {
        if (response && response.success) {
            console.log('Cognify Analysis complete. Result:', response.data);
        }
    });
}, 3000);
