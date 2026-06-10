document.addEventListener('DOMContentLoaded', async () => {
    const noContentView = document.getElementById('no-content');

    // Get active analysis from storage
    const { active_analysis } = await chrome.storage.local.get('active_analysis');

    if (active_analysis) {
        renderAnalysis(active_analysis);
    } else {
        noContentView.classList.remove('hidden');
    }

    // Listen for storage changes in case an analysis finishes while panel is open
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.active_analysis) {
            if (changes.active_analysis.newValue) {
                renderAnalysis(changes.active_analysis.newValue);
            }
        }
    });

    const findBtn = document.getElementById('find-better-btn');
    const findText = document.getElementById('find-btn-text');
    const findSpinner = document.getElementById('find-btn-spinner');
    const recsSection = document.getElementById('recommendations');
    const recsList = document.getElementById('recs-list');

    findBtn.addEventListener('click', () => {
        // Show spinner
        findText.classList.add('hidden');
        findSpinner.classList.remove('hidden');
        findBtn.style.pointerEvents = 'none';

        // Simulate network delay
        setTimeout(() => {
            findText.classList.remove('hidden');
            findSpinner.classList.add('hidden');
            findBtn.style.display = 'none'; // hide button after fetching
            
            recsSection.classList.remove('hidden');
            
            // Mock recommendations
            const mockRecs = [
                { title: 'The Science of Deep Work', match: 92, thumb: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=160&q=80' },
                { title: 'Mastering Emotional Intelligence', match: 88, thumb: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80' },
                { title: 'How to Build Sustainable Habits', match: 85, thumb: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=160&q=80' }
            ];

            mockRecs.forEach((rec, index) => {
                const card = document.createElement('div');
                card.className = 'rec-card';
                card.style.animationDelay = `${index * 0.15}s`;
                card.innerHTML = `
                    <img src="${rec.thumb}" class="rec-thumb" />
                    <div class="rec-info">
                        <p class="rec-title">${rec.title}</p>
                        <p class="rec-meta">${rec.match}% Synced</p>
                        <button class="rec-btn">Override Stream</button>
                    </div>
                `;
                recsList.appendChild(card);
            });

        }, 2000);
    });
});

function renderAnalysis(data) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('no-content').classList.add('hidden');
    document.getElementById('analysis-view').classList.remove('hidden');

    // Basic Info
    document.getElementById('video-thumbnail').src = data.thumbnail || '';
    document.getElementById('video-title').innerText = data.title || 'Unknown Title';
    document.getElementById('video-channel').innerText = data.platform === 'youtube' ? 'YouTube Video' : data.platform;

    // Verdict
    document.getElementById('verdict-text').innerText = data.recommendation === 'consume' 
        ? "Content parameters optimal. Safe for cognitive ingestion."
        : "WARNING: High irrelevance detected. Proceeding may result in cognitive degradation.";

    // Alignment Ring (circumference = 100)
    const score = data.score || (data.goal_alignment && data.goal_alignment.score ? Math.round(data.goal_alignment.score * 100) : 0);
    const alignmentPath = document.getElementById('alignment-path');
    document.getElementById('alignment-score').innerText = `${score}%`;
    
    // Animate ring
    setTimeout(() => {
        alignmentPath.style.strokeDasharray = `${score}, 100`;
    }, 100);

    // Toxicity Gauge (circumference = ~50.2)
    const toxScore = data.toxicity && data.toxicity.overall ? Math.round(data.toxicity.overall * 100) : 0;
    const toxPath = document.getElementById('toxicity-path');
    document.getElementById('toxicity-score').innerText = toxScore;
    
    // Color mapping
    if (toxScore > 60) toxPath.style.stroke = '#ef4444';
    else if (toxScore > 30) toxPath.style.stroke = '#f59e0b';
    else toxPath.style.stroke = '#22c55e';

    // Animate gauge (toxScore is 0-100, we map to 0-50.2 length)
    const toxDash = (toxScore / 100) * 50.2;
    setTimeout(() => {
        toxPath.style.strokeDasharray = `${toxDash}, 50.2`;
    }, 100);

    // Emotions
    const emotions = data.emotions || {};
    const container = document.getElementById('emotion-bars');
    container.innerHTML = '';
    
    const sorted = Object.entries(emotions)
        .filter(([k]) => k !== 'neutral')
        .sort((a, b) => b[1] - a[1]);

    // Render bars with 0 width
    const emotionElements = [];
    sorted.forEach(([key, val]) => {
        const percent = Math.round(val * 100);
        const row = document.createElement('div');
        row.className = 'emotion-row';
        row.innerHTML = `
            <div class="emotion-label">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
            <div class="emotion-bar-bg">
                <div class="emotion-bar-fill" style="${getEmotionColor(key)}"></div>
            </div>
            <div class="emotion-value">${percent}%</div>
        `;
        container.appendChild(row);
        emotionElements.push({ el: row.querySelector('.emotion-bar-fill'), width: percent });
    });

    // Trigger width animation
    setTimeout(() => {
        emotionElements.forEach(item => {
            item.el.style.width = `${item.width}%`;
        });
    }, 200);
}

function getEmotionColor(emotion) {
    const colors = {
        joy: 'background: #10B981;',
        anger: 'background: #EF4444;',
        fear: 'background: #F59E0B;',
        sadness: 'background: #6366F1;',
        surprise: 'background: #06B6D4;',
        disgust: 'background: #8B5CF6;'
    };
    return colors[emotion] || '';
}
