// service-worker.js — Cognify Background Service Worker
// Passes analysis requests to the backend with the user's auth token

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_PLAYER_DATA') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: "MAIN",
      args: [message.expectedVideoId],
      func: async (expectedVideoId) => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        let attempts = 0;
        while (attempts++ < 20) {
          try {
            const player = document.querySelector('#movie_player');
            if (!player || !player.getPlayerResponse || !player.getVideoData) {
              await sleep(250);
              continue;
            }
            
            const currentId = player.getVideoData().video_id;
            const response = player.getPlayerResponse();
            
            if (currentId !== expectedVideoId || response?.videoDetails?.videoId !== expectedVideoId) {
              await sleep(250);
              continue;
            }
            
            // response already declared above
            const title = response?.videoDetails?.title || document.title.replace(' - YouTube', '');
            const description = response?.videoDetails?.shortDescription || null;
            
            const tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!tracks || tracks.length === 0) {
              return { title, description, transcript: null };
            }
            
            const track = tracks.find(t => t.languageCode === 'en' || t.languageCode.startsWith('en')) || tracks[0];
            if (!track || !track.baseUrl) {
              return { title, description, transcript: null };
            }
            
            const res = await fetch(track.baseUrl);
            const xml = await res.text();
            const textMatches = xml.match(/<text.*?>([\s\S]*?)<\/text>/g);
            if (!textMatches) return { title, description, transcript: null };
            
            const transcript = textMatches.map(t => {
              return t.replace(/<text.*?>|<\/text>/g, '')
                      .replace(/&amp;/g, '&')
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>');
            }).join(' ').replace(/\s+/g, ' ');
            
            const safeTranscript = transcript.length > 200000 
              ? transcript.substring(0, 200000) + " ... [Truncated]" 
              : transcript;
              
            return { title, description, transcript: safeTranscript };
          } catch (e) {
            await sleep(250);
          }
        }
        return { title: document.title.replace(' - YouTube', ''), description: null, transcript: null };
      }
    }).then((results) => {
      sendResponse(results[0].result);
    }).catch((err) => {
      console.error('[Cognify SW] Scripting error:', err);
      sendResponse({ title: null, description: null, transcript: null });
    });
    return true;
  }


  if (message.type === 'ANALYZE') {
    (async () => {
      try {
        const { cognify_token } = await chrome.storage.local.get('cognify_token');

        if (!cognify_token) {
          sendResponse({ error: 'Please login to Cognify Dashboard first' });
          return;
        }

        const response = await fetch('http://localhost:3001/api/content/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cognify_token}`
          },
          body: JSON.stringify({
            url: message.url,
            title: message.title,
            description: message.description,
            transcript: message.transcript
          })
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('[Cognify SW] Backend error:', text);
          sendResponse({ error: `Backend error: ${response.status}` });
          return;
        }

        const json = await response.json();
        const data = json.data;

        // Persist last analysis to storage for the popup
        await chrome.storage.local.set({
          lastAnalysis: {
            title: data.title,
            url: data.url,
            isConscious: data.isConscious,
            dominantEmotion: data.dominantEmotion,
            score: data.score,
            summary: data.summary,
            tags: data.tags
          }
        });

        sendResponse({ data });
      } catch (err) {
        console.error('[Cognify SW] fetch error:', err);
        sendResponse({ error: 'Cognify backend offline' });
      }
    })();
    return true; // keep message channel open for async response
  }
});
