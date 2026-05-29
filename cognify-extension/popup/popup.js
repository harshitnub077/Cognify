document.addEventListener('DOMContentLoaded', async () => {
    const unauthView = document.getElementById('unauth-view');
    const authView = document.getElementById('auth-view');
    const activeToggle = document.getElementById('active-toggle');
    const statAnalyzed = document.getElementById('stat-analyzed');
    const statAlignment = document.getElementById('stat-alignment');

    // Check token
    const { cognify_token, extension_active, analysis_history } = await chrome.storage.local.get(['cognify_token', 'extension_active', 'analysis_history']);

    if (cognify_token) {
        unauthView.classList.add('hidden');
        authView.classList.remove('hidden');

        // Populate stats
        activeToggle.checked = extension_active !== false;
        
        const history = analysis_history || [];
        // Filter for today
        const todayStr = new Date().toISOString().split('T')[0];
        const todayItems = history.filter(item => item.createdAt && item.createdAt.startsWith(todayStr));
        
        statAnalyzed.innerText = todayItems.length;
        
        if (todayItems.length > 0) {
            const avg = todayItems.reduce((acc, curr) => acc + (curr.score || 0), 0) / todayItems.length;
            statAlignment.innerText = `${Math.round(avg)}%`;
        } else {
            statAlignment.innerText = '0%';
        }
    } else {
        unauthView.classList.remove('hidden');
        authView.classList.add('hidden');
    }

    // Handlers
    document.getElementById('login-btn').addEventListener('click', () => {
        window.open('http://localhost:5173/', '_blank');
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await chrome.storage.local.remove('cognify_token');
        location.reload();
    });

    document.getElementById('dashboard-btn').addEventListener('click', () => {
        window.open('http://localhost:5173/dashboard', '_blank');
    });

    activeToggle.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ extension_active: e.target.checked });
    });

    // Dev fallback for testing
    document.getElementById('mock-login-btn').addEventListener('click', async () => {
        const token = document.getElementById('mock-token-input').value;
        if (token) {
            await chrome.storage.local.set({ cognify_token: token });
            location.reload();
        }
    });
});
